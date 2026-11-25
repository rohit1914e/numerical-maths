import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { COLORS } from '../styles/tokens'
import { damp, gpuTier } from './gpu'

/**
 * Photographic Earth (shader shared with the ENERGEX project) carrying a latency network.
 * Textures (public/textures, from the MIT-licensed three.js examples, derived from NASA Blue Marble / Black Marble):
 *   earth_day_4096.jpg, earth_night_4096.jpg, earth_bump_roughness_clouds_4096.jpg (R elevation, G roughness, B clouds)
 * Probe packets travel along the links between real data-centre cities; every fourth packet is lost half way
 * and fades out in red, the same thing a ping monitor records as a missing measurement.
 */
const TEX = ['earth_day_4096.jpg', 'earth_night_4096.jpg', 'earth_bump_roughness_clouds_4096.jpg'].map((f) => `${import.meta.env.BASE_URL}textures/${f}`)
const SUN_DIR = new THREE.Vector3(0.82, 0.28, 0.5).normalize()

const EARTH_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const EARTH_FS = /* glsl */ `
uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uPack;
uniform vec3 uSun; uniform float uCloudShift;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  vec3 pack = texture2D(uPack, vUv).rgb;

  float e = 1.0 / 2048.0;
  float hx = texture2D(uPack, vUv + vec2(e, 0.0)).r - texture2D(uPack, vUv - vec2(e, 0.0)).r;
  float hy = texture2D(uPack, vUv + vec2(0.0, e)).r - texture2D(uPack, vUv - vec2(0.0, e)).r;
  vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), n));
  vec3 north = cross(n, east);
  vec3 nb = normalize(n - (east * hx + north * hy) * 2.2);

  float ndl = dot(n, uSun);
  float lit = max(dot(nb, uSun), 0.0);
  float day = smoothstep(-0.12, 0.22, ndl);
  float twilight = 1.0 - smoothstep(0.0, 0.42, abs(ndl + 0.02));

  vec3 col = texture2D(uDay, vUv).rgb;
  col = col * (0.045 + 1.25 * lit);

  float water = 1.0 - smoothstep(0.08, 0.3, pack.g);
  vec3 h = normalize(uSun + v);
  col += vec3(1.0, 0.86, 0.66) * pow(max(dot(n, h), 0.0), 260.0) * water * 0.55 * day;

  vec2 cuv = vUv + vec2(uCloudShift, 0.0);
  float cloud = smoothstep(0.18, 0.95, texture2D(uPack, cuv).b);
  float shadow = smoothstep(0.18, 0.95, texture2D(uPack, cuv + vec2(0.004, 0.002)).b);
  col *= 1.0 - shadow * 0.35 * day;
  vec3 cloudCol = mix(vec3(1.0, 0.62, 0.36), vec3(1.0), smoothstep(0.0, 0.5, ndl)) * (0.05 + 1.15 * max(ndl, 0.0));
  col = mix(col, cloudCol, cloud * 0.92);

  vec3 lights = texture2D(uNight, vUv).rgb;
  col += lights * vec3(1.0, 0.78, 0.5) * (1.0 - day) * (1.0 - cloud * 0.75) * 1.6;

  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  vec3 sky = mix(vec3(0.30, 0.52, 1.0), vec3(1.0, 0.48, 0.22), twilight);
  col += sky * fres * (0.25 + 0.95 * day);
  col += vec3(1.0, 0.42, 0.16) * twilight * 0.10 * day;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const ATMOS_FS = /* glsl */ `
uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float d = clamp(-dot(n, v) / 0.52, 0.0, 1.0);
  float halo = pow(d, 2.6);
  float ndl = dot(n, uSun);
  float sun = smoothstep(-0.45, 0.35, ndl);
  float twilight = 1.0 - smoothstep(0.0, 0.5, abs(ndl));
  vec3 col = mix(vec3(0.28, 0.52, 1.0), vec3(1.0, 0.5, 0.2), twilight * 0.85);
  gl_FragColor = vec4(col * halo * (0.05 + sun) * 1.15, halo * (0.05 + sun));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const ll = (lat: number, lon: number, r = 1): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}

/** Data-centre cities. Chennai is the probing client; the rest are servers it pings. */
const SITES: [number, number][] = [
  [13.08, 80.27], // Chennai (client)
  [19.08, 72.88], // Mumbai
  [1.35, 103.82], // Singapore
  [50.11, 8.68], // Frankfurt
  [51.51, -0.13], // London
  [38.95, -77.45], // Virginia
  [-23.55, -46.63], // São Paulo
  [35.68, 139.69], // Tokyo
  [-33.87, 151.21], // Sydney
  [-26.2, 28.05], // Johannesburg
  [25.2, 55.27], // Dubai
]
const LINKS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 7], [0, 8], [0, 9], [0, 10], [2, 7], [3, 5], [5, 6], [2, 8], [4, 5],
]
const PACKETS_PER_LINK = 3

/** Deterministic pseudo random in [0,1) so the star field is identical on every render. */
const rnd = (i: number, salt: number): number => {
  const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

export function NetworkGlobe({ hero, after }: { hero: MutableRefObject<number>; after: MutableRefObject<number> }) {
  const spin = useRef<THREE.Group>(null)
  const rig = useRef<THREE.Group>(null)
  const ok = useRef<THREE.InstancedMesh>(null)
  const lost = useRef<THREE.InstancedMesh>(null)
  const reduced = useReducedMotion()
  const tier = gpuTier()
  const { gl, camera } = useThree()
  const [day, night, pack] = useTexture(TEX)

  useLayoutEffect(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy())
    for (const t of [day, night, pack]) {
      t.anisotropy = aniso
      t.wrapS = THREE.RepeatWrapping
      t.needsUpdate = true
    }
    day.colorSpace = THREE.SRGBColorSpace
    night.colorSpace = THREE.SRGBColorSpace
  }, [day, night, pack, gl])

  const uniforms = useMemo(() => ({ uDay: { value: day }, uNight: { value: night }, uPack: { value: pack }, uSun: { value: SUN_DIR }, uCloudShift: { value: 0 } }), [day, night, pack])
  const atmosUniforms = useMemo(() => ({ uSun: { value: SUN_DIR } }), [])

  const { arcs, curves } = useMemo(() => {
    const cs = LINKS.map(([i, j]) => {
      const a = ll(SITES[i][0], SITES[i][1])
      const b = ll(SITES[j][0], SITES[j][1])
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1.0 + a.distanceTo(b) * 0.34)
      return new THREE.QuadraticBezierCurve3(a.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004))
    })
    const mat = new THREE.LineBasicMaterial({ color: COLORS.estimate, transparent: true, opacity: 0.5, toneMapped: false })
    return { arcs: cs.map((c) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(64)), mat)), curves: cs }
  }, [])

  const stars = useMemo(() => {
    const n = tier === 'high' ? 1600 : 700
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = 18 + rnd(i, 1) * 22
      const th = rnd(i, 2) * Math.PI * 2
      const ph = Math.acos(2 * rnd(i, 3) - 1)
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th)
      arr[i * 3 + 1] = r * Math.cos(ph)
      arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [tier])

  // every 4th packet is lost: it travels half way, then fades out in red
  const packets = useMemo(
    () => curves.flatMap((_, ci) => Array.from({ length: PACKETS_PER_LINK }, (_, k) => ({ ci, o: k / PACKETS_PER_LINK + ci * 0.137, lost: (ci * PACKETS_PER_LINK + k) % 4 === 3 }))),
    [curves],
  )
  const okPackets = useMemo(() => packets.filter((p) => !p.lost), [packets])
  const lostPackets = useMemo(() => packets.filter((p) => p.lost), [packets])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(
    () => () => {
      arcs.forEach((a) => a.geometry.dispose())
      ;(arcs[0]?.material as THREE.Material | undefined)?.dispose()
      stars.dispose()
    },
    [arcs, stars],
  )

  const sm = useRef({ hero: 0, after: 0 })
  const free = useRef(-2.35)
  const pos = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const move = reduced ? 0 : 1
    const t = state.clock.elapsedTime
    const k = reduced ? 1 : damp(4, dt)
    sm.current.hero += (hero.current - sm.current.hero) * k
    sm.current.after += (after.current - sm.current.after) * k
    const p = sm.current.hero
    const a = sm.current.after
    free.current += dt * 0.035 * move
    uniforms.uCloudShift.value = (t * 0.0016 * move) % 1
    if (spin.current) spin.current.rotation.y = free.current + p * 0.9

    // start wide with the planet to the right, push in while the hero scrolls, then settle right for the chapters
    const wide = state.size.width > 900
    const px = state.pointer.x * move
    const py = state.pointer.y * move
    if (rig.current) {
      const tx = wide ? 0.95 - p * 0.95 + a * 1.05 : 0
      const ty = (wide ? -0.05 : -0.55) - p * 0.2 + a * (wide ? 0.25 : 0.55)
      rig.current.position.x += (tx + px * 0.05 - rig.current.position.x) * damp(3, dt)
      rig.current.position.y += (ty + py * 0.04 - rig.current.position.y) * damp(3, dt)
      rig.current.rotation.y += (p * 0.6 - rig.current.rotation.y) * damp(3, dt)
    }
    const z = (wide ? 3.15 : 4.4) - p * 1.05 + a * 1.25
    pos.set(0, p * 0.35, z)
    look.set(rig.current ? rig.current.position.x * 0.55 : 0, 0, 0)
    camera.position.lerp(pos, reduced ? 1 : damp(3, dt))
    camera.lookAt(look)

    const draw = (mesh: THREE.InstancedMesh | null, list: typeof packets, isLost: boolean) => {
      if (!mesh) return
      list.forEach((o, i) => {
        const u = (t * 0.09 * move + o.o) % 1
        const end = isLost ? 0.55 : 1
        const v = Math.min(u, end)
        dummy.position.copy(curves[o.ci].getPoint(v))
        const fade = isLost ? Math.max(0, 1 - Math.max(0, u - 0.45) / 0.12) : 1
        dummy.scale.setScalar(0.0075 * (0.55 + Math.sin(Math.min(u, 1) * Math.PI) * 0.6) * fade + 1e-5)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    draw(ok.current, okPackets, false)
    draw(lost.current, lostPackets, true)
  })

  const seg = tier === 'high' ? 160 : 96
  return (
    <group>
      <points geometry={stars}>
        <pointsMaterial color={COLORS.ink} size={0.05} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
      </points>
      <group ref={rig}>
        <group rotation={[0, 0, 0.41]}>
          <group ref={spin} rotation={[0, -2.35, 0]}>
            <mesh>
              <sphereGeometry args={[1, seg, seg / 2]} />
              <shaderMaterial vertexShader={EARTH_VS} fragmentShader={EARTH_FS} uniforms={uniforms} />
            </mesh>
            {SITES.map(([la, lo], i) => (
              <mesh key={i} position={ll(la, lo, 1.006)}>
                <sphereGeometry args={[i === 0 ? 0.014 : 0.009, 12, 12]} />
                <meshBasicMaterial color={i === 0 ? COLORS.accent : COLORS.ink} toneMapped={false} />
              </mesh>
            ))}
            {arcs.map((line, i) => (
              <primitive key={i} object={line} />
            ))}
            <instancedMesh ref={ok} args={[undefined, undefined, okPackets.length]} frustumCulled={false}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color={COLORS.estimate} toneMapped={false} />
            </instancedMesh>
            <instancedMesh ref={lost} args={[undefined, undefined, lostPackets.length]} frustumCulled={false}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color={COLORS.missing} toneMapped={false} />
            </instancedMesh>
          </group>
        </group>
        <mesh scale={1.17}>
          <sphereGeometry args={[1, 96, 48]} />
          <shaderMaterial vertexShader={EARTH_VS} fragmentShader={ATMOS_FS} uniforms={atmosUniforms} side={THREE.BackSide} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
