import { expect, test, type Page } from '@playwright/test'

const MODULES = [
  { path: '/dashboard', label: 'Dashboard', id: 'overview' },
  { path: '/simulation', label: 'Network simulation', id: 'simulation' },
  { path: '/missing-data', label: 'Missing data', id: 'missing-data' },
  { path: '/dataset', label: 'Dataset', id: 'dataset' },
  { path: '/methods', label: 'Interpolation methods', id: 'methods' },
  { path: '/reconstruction', label: 'Reconstruction', id: 'reconstruction' },
  { path: '/evaluation', label: 'Evaluation', id: 'evaluation' },
  { path: '/report', label: 'Report', id: 'conclusion' },
]

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

const sidebar = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const counter = async (page: Page) => Number((await page.getByTestId('probe-counter').textContent())!.replace(/\D/g, ''))

// @webgl: renders the globe with software WebGL, which saturates the CPU; playwright.config.ts runs it after everything else
test('landing: title, 3D network globe, chapter rail, and the way into the dashboard @webgl', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Network Latency Predictor' })).toBeVisible()
  await expect(page.getByTestId('globe-stage')).toBeAttached()
  await expect(page.getByTestId('scene')).toHaveAttribute('data-webgl', /true|false/)
  await expect(page.getByRole('navigation', { name: 'Chapters' }).getByRole('link')).toHaveCount(7)
  // the chapter label follows the scroll position
  await page.evaluate(() => document.getElementById('chapter-4')!.scrollIntoView({ behavior: 'instant', block: 'center' }))
  await expect(page.getByTestId('chapter-label')).toHaveText(/04 · Interpolation/, { timeout: 6000 })
  await expect(page.locator('#chapter-6')).toContainText('RMSE')
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(5000)
  await page.getByTestId('enter-platform').click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.locator('#overview')).toBeVisible()
  expect(errors).toEqual([])
})

test('landing without WebGL falls back to text and keeps every chapter', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/?gpu=none')
  await expect(page.getByTestId('scene-fallback')).toBeVisible()
  for (let n = 1; n <= 7; n++) await expect(page.locator(`#chapter-${n}`)).toBeAttached()
  expect(errors).toEqual([])
})

test('sidebar opens every module at its own URL, and deep links load directly', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/dashboard')
  for (const m of MODULES) {
    await sidebar(page).getByRole('link', { name: m.label }).click()
    await expect(page).toHaveURL(new RegExp(`${m.path}$`))
    await expect(page.locator(`#${m.id}`)).toBeVisible()
    await expect(sidebar(page).getByRole('link', { name: m.label })).toHaveAttribute('aria-current', 'page')
  }
  await page.goto('/evaluation')
  await expect(page.locator('#evaluation')).toBeVisible()
  await page.goto('/no-such-page')
  await expect(page).toHaveURL(/\/dashboard$/)
  expect(errors).toEqual([])
})

test('dashboard: live network packets move', async ({ page }) => {
  await page.goto('/dashboard')
  const dots = () => page.locator('[data-testid="live-network"]').first().locator('circle[data-packet="request"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('cx')}:${e.getAttribute('opacity')}`).join('|'))
  const a = await dots()
  await page.waitForTimeout(400)
  expect(await dots()).not.toBe(a)
  await expect(page.getByTestId('hero-metrics')).toContainText('Latest RTT')
})

test('simulation: pause, resume, speed, reset and off-screen pausing', async ({ page }) => {
  await page.goto('/simulation')
  const sim = page.locator('#simulation')
  await expect(sim.getByTestId('sim-status')).toHaveText('Running at 1×')
  // the engine advances per animation frame (time steps are capped), so on a busy CPU it runs a little slower than
  // the wall clock: wait for progress with a deadline instead of counting probes in a fixed window
  const start = await counter(page)
  await expect.poll(() => counter(page), { timeout: 10_000 }).toBeGreaterThan(start)

  await sim.getByRole('button', { name: 'Pause' }).click()
  const frozen = await counter(page)
  await page.waitForTimeout(2000)
  expect(await counter(page)).toBe(frozen)

  await sim.getByRole('button', { name: 'Resume' }).click()
  await sim.getByRole('button', { name: '4×' }).click()
  // 6 probes take ~1.5 s at 4x; at 1x they would take 6 s, so a 6 s deadline still catches a broken speed control
  const fast = await counter(page)
  await expect.poll(() => counter(page), { timeout: 6_000 }).toBeGreaterThanOrEqual(fast + 6)

  await sim.getByRole('button', { name: 'Reset' }).click()
  await expect(sim.getByTestId('probe-counter')).toHaveText(/probe #6\d/)

  // the module page is short, so add room below it and scroll the panel fully out of view: the frame loop stops
  await page.evaluate(() => {
    document.body.style.paddingBottom = '250vh'
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await expect(sim.getByTestId('sim-status')).toHaveText('Paused while off-screen')
})

test('missing data: the series loses measurements and can be toggled', async ({ page }) => {
  await page.goto('/missing-data')
  const s = page.locator('#missing-data')
  await expect(s.getByTestId('lost-summary')).toHaveText(/\d+ of \d+ measurements are missing/, { timeout: 8000 })
  await s.getByRole('button', { name: 'Complete', exact: true }).click()
  await expect(s.getByText('will be lost')).toBeVisible()
  await s.getByRole('button', { name: 'Incomplete', exact: true }).click()
  await expect(s.getByText('will be lost')).toHaveCount(0)
})

test('dataset: table, preprocessing, CSV validation, and the import reaches every page', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/dataset')
  await expect(page.getByTestId('dataset-table').locator('tbody tr')).toHaveCount(48)
  await expect(page.getByTestId('rejected-rows').locator('tbody tr')).toHaveCount(4)
  await page.getByRole('tab', { name: 'Import CSV' }).click()
  await page.getByTestId('csv-input').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from('timestamp,ping_ms\n0,10\n0,11\n2,12\n') })
  await expect(page.getByTestId('csv-errors')).toContainText('Line 3: Timestamp 0 duplicates line 2')
  await page.getByRole('button', { name: 'Load sample CSV' }).click()
  await expect(page.getByText('Imported: sample.csv')).toBeVisible()
  await expect(page.getByTestId('dataset-table').locator('tbody tr')).toHaveCount(10)
  await expect(page.getByTestId('status-bar')).toContainText('imported')
  await sidebar(page).getByRole('link', { name: 'Reconstruction' }).click()
  await expect(page.getByTestId('reconstruction-status')).toContainText('2 of 2 gaps estimated', { timeout: 10_000 })
  await sidebar(page).getByRole('link', { name: 'Evaluation' }).click()
  await expect(page.getByText(/known interior rows are held out/)).toBeVisible()
  expect(errors).toEqual([])
})

test('methods: switching methods rebuilds the curve with the real estimate', async ({ page }) => {
  await page.goto('/methods')
  const s = page.locator('#methods')
  await expect(s.getByTestId('method-estimate')).toBeVisible({ timeout: 6000 })
  await expect(s.getByTestId('estimate-marker')).toBeVisible()
  const lagrange = await s.getByTestId('method-estimate').locator('p').nth(1).textContent()
  await s.getByRole('tab', { name: 'Newton divided differences' }).click()
  await expect(s.getByTestId('divided-differences')).toBeVisible()
  await expect(s.getByTestId('estimate-marker')).toBeVisible({ timeout: 6000 })
  expect(await s.getByTestId('method-estimate').locator('p').nth(1).textContent()).toBe(lagrange)
  await s.getByRole('tab', { name: 'Natural cubic spline' }).click()
  await expect(s.getByTestId('estimate-marker')).toBeVisible({ timeout: 6000 })
  await s.getByRole('button', { name: 'Replay construction' }).click()
  await expect(s.getByText('Constructing…')).toBeVisible()
})

test('reconstruction animates every gap into an amber estimate', async ({ page }) => {
  await page.goto('/reconstruction')
  const s = page.locator('#reconstruction')
  await expect(s.getByTestId('reconstruction-status')).toContainText('9 of 9 gaps estimated', { timeout: 12_000 })
  await expect(s.locator('[data-testid^="reconstructed-"]')).toHaveCount(9)
  await s.getByRole('button', { name: 'Original' }).click()
  await expect(s.locator('[data-testid^="reconstructed-"]')).toHaveCount(0)
})

test('evaluation compares all three methods and highlights the best; the report summarises it', async ({ page }) => {
  await page.goto('/evaluation')
  for (const m of ['lagrange', 'newton', 'spline']) await expect(page.getByTestId(`metrics-${m}`)).toContainText('RMSE')
  await expect(page.getByText('Lowest RMSE').first()).toBeVisible()
  await expect(page.getByTestId('comparison-bars')).toBeVisible()
  await expect(page.getByTestId('interpretation')).toContainText('does not validate')
  await sidebar(page).getByRole('link', { name: 'Report' }).click()
  await expect(page.getByTestId('key-findings')).toContainText('Lowest RMSE')
  await expect(page.getByTestId('credits')).toContainText('Numerical Methods')
})

test('charts show values on hover', async ({ page }) => {
  await page.goto('/reconstruction')
  const chart = page.locator('#reconstruction svg[aria-label="The series with reconstructed values"]')
  await expect(chart).toBeVisible()
  const box = (await chart.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect(page.locator('#reconstruction').getByText(/t = [\d.]+ s/).first()).toBeVisible()
})

test('reduced motion: no ambient animation, finished results shown at once', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1366, height: 768 } })
  const page = await context.newPage()
  await page.goto('/dashboard')
  await expect(page.getByText('Paused for reduced motion')).toBeVisible()
  await page.goto('/simulation')
  await expect(page.locator('#simulation').getByTestId('sim-status')).toHaveText('Paused')
  await page.goto('/methods')
  await expect(page.locator('#methods').getByTestId('estimate-marker')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Network Latency Predictor' })).toBeVisible()
  await context.close()
})

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`responsive at ${viewport.width}px: no horizontal overflow on the landing or any module`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const errors = trackErrors(page)
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    // layout only: the fixed full-screen canvas cannot cause overflow, so skip software WebGL (it starves parallel tests)
    await page.goto('/?gpu=none')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(800)
    expect(await overflow()).toBeLessThanOrEqual(0)
    for (const m of MODULES) {
      await page.goto(m.path)
      await expect(page.locator(`#${m.id}`)).toBeVisible()
      await page.waitForTimeout(300)
      expect(await overflow(), m.path).toBeLessThanOrEqual(0)
    }
    await info.attach(`report-${viewport.width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    expect(errors).toEqual([])
    await context.close()
  })
}
