import { lazy, Suspense } from 'react'
import StoryLayout from '../layouts/StoryLayout'
import Hero from '../components/story/Hero'
import { ChapterDashboard, ChapterEvaluation, ChapterMethods, ChapterMissing, ChapterReconstruction, ChapterSimulation } from '../components/story/Chapters'
import { Footer } from '../site/sections/ConclusionSection'

const GlobeStage = lazy(() => import('../scenes/GlobeStage'))

/** The story: one fixed 3D globe behind every chapter, from a single probe to the finished evaluation. */
export default function Landing() {
  return (
    <StoryLayout
      stage={
        <Suspense fallback={null}>
          <GlobeStage />
        </Suspense>
      }
    >
      <Hero />
      <ChapterSimulation />
      <ChapterMissing />
      <ChapterMethods />
      <ChapterReconstruction />
      <ChapterEvaluation />
      <ChapterDashboard />
      <Footer />
    </StoryLayout>
  )
}
