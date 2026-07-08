// project import
import Loadable from 'src/layouts/full/shared/loadable/Loadable.tsx';
import { lazy } from 'react';

import PatientGuard from 'src/contexts/authGuard/PatientGuard';
import { Navigate, Outlet } from 'react-router-dom';
import { CenterProvider } from 'src/contexts/CenterContext';
import { usePatientStatus } from 'src/hooks/usePatientStatus';
import { Box, CircularProgress } from '@mui/material';
import CalibrationGate from 'src/components/shared/CalibrationGate';

const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const MinimalLayout = Loadable(lazy(() => import('../layouts/minimal/MinimalLayout')));

const ExamScreen = Loadable(lazy(() => import('src/features/portal/views/exam/ExamPage')));
const ExamDashboard = Loadable(lazy(() => import('src/features/portal/views/exam/ExamDashboard')));

const ExercisePage = Loadable(lazy(() => import('src/features/portal/views/activeSessions')));
const AssignmentHistoryPage = Loadable(
  lazy(() => import('src/features/portal/views/exerciseAssignment'))
);
const HistoryPage = Loadable(lazy(() => import('src/features/portal/views/history/HistoryPage')));
const SessionsPage = Loadable(lazy(() => import('src/features/portal/views/exerciseSession')));
const ExerciseExecutionPage = Loadable(
  lazy(() => import('src/features/portal/views/exerciseExecute/ExerciseExecutePage')),
  {
    onError: (error) => console.error('Failed to load ExerciseExecutionPage:', error),
  }
);
const ExerciseResultPage = Loadable(
  lazy(() => import('src/features/portal/views/exerciseResult/ExerciseResultPage'))
);
const SessionResultsPage = Loadable(lazy(() => import('src/features/portal/views/sessionResults')));
const PortalHomePage = Loadable(
  lazy(() => import('src/features/portal/views/home/PortalHomePage'))
);
const UserNotificationPage = Loadable(
  lazy(() => import('src/features/portal/views/notifications/UserNotificationPage'))
);
const PatientProfilePage = Loadable(
  lazy(() => import('src/features/portal/views/profile/PatientProfilePage'))
);
const InactivePage = Loadable(lazy(() => import('src/features/portal/views/InactivePage')));
const ScreenCalibrationPage = Loadable(
  lazy(() => import('src/features/portal/views/settings/ScreenCalibrationPage'))
);
const InstructionVoiceSettingsPage = Loadable(
  lazy(() => import('src/features/portal/views/settings/InstructionVoiceSettingsPage'))
);

// ==============================|| PORTAL GUARD ||============================== //

/**
 * Guard portal routes and redirect inactive patients.
 */
const PortalGuard = ({ children }: { children: React.ReactNode }) => {
  const { isActive, loading } = usePatientStatus();

  // Show loading spinner while checking status
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect inactive patients to inactive page
  if (isActive === false) {
    return <Navigate to="/portal/inactive" replace />;
  }

  // Render child routes for active patients
  return <>{children}</>;
};

// ==============================|| MAIN ROUTING ||============================== //

const PortalRoutes = {
  path: '/portal',
  children: [
    // Inactive page route (accessible without PortalGuard)
    {
      path: 'inactive',
      element: (
        <PatientGuard>
          <InactivePage />
        </PatientGuard>
      ),
    },
    // Routes with full layout (sidebar, header) - Protected by PortalGuard
    {
      path: '',
      element: (
        <PatientGuard>
          <CenterProvider>
            <PortalGuard>
              <FullLayout />
            </PortalGuard>
          </CenterProvider>
        </PatientGuard>
      ),
      children: [
        {
          path: '',
          element: <Navigate to="/portal/exercises" replace />,
        },
        {
          path: 'home',
          element: <PortalHomePage />,
        },
        {
          path: 'exam',
          element: <ExamDashboard />,
        },
        // Route danh sách exercises (active sessions)
        {
          path: 'exercises',
          element: <ExercisePage />,
        },
        // Route lịch sử chung (exercise + exam)
        {
          path: 'history',
          element: <HistoryPage />,
        },
        // Route assignment sessions history
        {
          path: 'assignments/:assignmentId/sessions',
          element: <SessionsPage />,
        },
        // Route session results (danh sách các lần thực hiện trong session)
        {
          path: 'assignments/:assignmentId/sessions/:sessionId/results',
          element: <SessionResultsPage />,
        },
        // Route hồ sơ cá nhân
        {
          path: 'profile',
          element: <PatientProfilePage />,
        },
        // Route thông báo user
        {
          path: 'notifications',
          element: <UserNotificationPage />,
        },
        // Route hiệu chuẩn màn hình
        {
          path: 'settings/calibration',
          element: <ScreenCalibrationPage />,
        },
        {
          path: 'settings/voice',
          element: <InstructionVoiceSettingsPage />,
        },
      ],
    },
    // Exam routes with minimal layout (no sidebar, no header) - Protected by PortalGuard
    {
      path: 'exam',
      element: (
        <PatientGuard>
          <CenterProvider>
            <PortalGuard>
              <MinimalLayout />
            </PortalGuard>
          </CenterProvider>
        </PatientGuard>
      ),
      children: [
        {
          path: ':examId',
          element: <CalibrationGate><ExamScreen /></CalibrationGate>,
        },
        {
          path: ':examType',
          element: <CalibrationGate><ExamScreen /></CalibrationGate>,
        },
      ],
    },
    // Exercise execution routes with minimal layout (fullscreen) - Protected by PortalGuard
    {
      path: 'exercise',
      element: (
        <PatientGuard>
          <CenterProvider>
            <PortalGuard>
              <MinimalLayout />
            </PortalGuard>
          </CenterProvider>
        </PatientGuard>
      ),
      children: [
        // Route exercise execution
        {
          path: 'assignments/:assignmentId/sessions/:sessionId',
          element: <ExerciseResultPage />,
        },
        {
          path: 'assignments/:assignmentId/sessions/:sessionId/execute',
          element: <CalibrationGate><ExerciseExecutionPage /></CalibrationGate>,
        },
      ],
    },
    { path: '*', element: <Navigate to="/auth/404" /> },
  ],
};

export default PortalRoutes;
