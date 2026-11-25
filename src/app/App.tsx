import { Navigate, Route, Routes } from 'react-router-dom'
import { DatasetProvider } from '../state/DatasetContext'
import DashboardLayout from '../layouts/DashboardLayout'
import Landing from '../pages/Landing'
import { Hero } from '../site/Hero'
import { SimulationSection } from '../site/sections/SimulationSection'
import { MissingDataSection } from '../site/sections/MissingDataSection'
import { DatasetSection } from '../site/sections/DatasetSection'
import { MethodsSection } from '../site/sections/MethodsSection'
import { ReconstructionSection } from '../site/sections/ReconstructionSection'
import { EvaluationSection } from '../site/sections/EvaluationSection'
import { ConclusionSection, Footer } from '../site/sections/ConclusionSection'

/**
 * `/` is the scroll story over the 3D globe; every module lives in the dashboard shell at its own URL.
 * One DatasetProvider wraps both, so a CSV imported on one page is what every other page shows.
 */
export default function App() {
  return (
    <DatasetProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Hero />} />
          <Route path="/simulation" element={<SimulationSection />} />
          <Route path="/missing-data" element={<MissingDataSection />} />
          <Route path="/dataset" element={<DatasetSection />} />
          <Route path="/methods" element={<MethodsSection />} />
          <Route path="/reconstruction" element={<ReconstructionSection />} />
          <Route path="/evaluation" element={<EvaluationSection />} />
          <Route
            path="/report"
            element={
              <>
                <ConclusionSection />
                <Footer />
              </>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DatasetProvider>
  )
}
