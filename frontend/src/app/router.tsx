import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProjectsPage } from '@/features/projects/components/ProjectsPage'
import { UploadPage } from '@/features/upload/components/UploadPage'
import { AnalyzePage } from '@/features/analyze/components/AnalyzePage'
import { StudioPage } from '@/features/studio/components/StudioPage'
import { MeasurementPage } from '@/features/measurements/components/MeasurementPage'
import { EstimatePage } from '@/features/estimation/components/EstimatePage'
import { ReportPage } from '@/features/reports/components/ReportPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId/upload', element: <UploadPage /> },
      { path: 'projects/:projectId/analyze', element: <AnalyzePage /> },
      { path: 'projects/:projectId/studio', element: <StudioPage /> },
      { path: 'projects/:projectId/measurement', element: <MeasurementPage /> },
      { path: 'projects/:projectId/estimate', element: <EstimatePage /> },
      { path: 'projects/:projectId/report', element: <ReportPage /> },
    ],
  },
])
