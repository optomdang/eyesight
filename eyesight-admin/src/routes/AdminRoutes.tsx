// project import
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import { lazy } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AdminGuard from 'src/contexts/authGuard/AdminGuard';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import { CenterProvider } from 'src/contexts/CenterContext';
import RouteErrorBoundary from 'src/components/shared/RouteErrorBoundary';

// Lazy load components with error handling
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));

// System pages
const CenterPage = Loadable(
  lazy(() => import('src/features/admin/views/system/center-page')),
  {
    onError: (error) => console.error('Failed to load CenterPage:', error),
  }
);

const ClinicPage = Loadable(
  lazy(() => import('src/features/admin/views/system/clinic-page')),
  {
    onError: (error) => console.error('Failed to load ClinicPage:', error),
  }
);

const AuditLogPage = Loadable(
  lazy(() => import('src/features/admin/views/system/audit-log-page')),
  {
    onError: (error) => console.error('Failed to load AuditLogPage:', error),
  }
);

// Management pages
const UserPage = Loadable(
  lazy(() => import('src/features/admin/views/manage/user-page')),
  {
    onError: (error) => console.error('Failed to load UserPage:', error),
  }
);

const PatientDetailPage = Loadable(
  lazy(() => import('src/features/admin/views/manage/patient-page/PatientDetailPage')),
  {
    onError: (error) => console.error('Failed to load PatientDetailPage:', error),
  }
);

const DoctorPage = Loadable(
  lazy(() => import('src/features/admin/views/manage/doctor-page')),
  {
    onError: (error) => console.error('Failed to load DoctorPage:', error),
  }
);

const PatientPage = Loadable(
  lazy(() => import('src/features/admin/views/manage/patient-page')),
  {
    onError: (error) => console.error('Failed to load PatientPage:', error),
  }
);

const ExercisePage = Loadable(
  lazy(() => import('src/features/admin/views/manage/exercise-page')),
  {
    onError: (error) => console.error('Failed to load ExercisePage:', error),
  }
);

const VtQuestTestPage = Loadable(
  lazy(() => import('src/features/admin/views/manage/exercise-page/VtQuestTestPage')),
  {
    onError: (error) => console.error('Failed to load VtQuestTestPage:', error),
  }
);

const AdminSettingsPage = Loadable(
  lazy(() => import('src/features/admin/views/settings/AdminSettingsPage')),
  {
    onError: (error) => console.error('Failed to load AdminSettingsPage:', error),
  }
);

const RolePage = Loadable(
  lazy(() => import('src/features/admin/views/manage/role-page')),
  {
    onError: (error) => console.error('Failed to load RolePage:', error),
  }
);

const DashboardPage = Loadable(
  lazy(() => import('src/features/admin/dashboard/DashboardPage')),
  {
    onError: (error) => console.error('Failed to load DashboardPage:', error),
  }
);

// Wrapper component for routes with error boundary
const RouteWrapper = ({ children }: { children: React.ReactNode }) => (
  <RouteErrorBoundary>{children}</RouteErrorBoundary>
);

// ==============================|| MAIN ROUTING ||============================== //

const layoutChildren = [
  {
    path: '',
    element: <Navigate to="/admin/dashboard" />,
  },
  {
    path: 'dashboard',
    element: (
      <RouteWrapper>
        <DashboardPage />
      </RouteWrapper>
    ),
  },
  {
    path: 'users',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="users">
          <UserPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'roles',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="roles">
          <RolePage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'settings',
    element: (
      <RouteWrapper>
        <AdminSettingsPage />
      </RouteWrapper>
    ),
  },
  {
    path: 'settings/:tab',
    element: (
      <RouteWrapper>
        <AdminSettingsPage />
      </RouteWrapper>
    ),
  },
  {
    path: 'tools/screen-calibration',
    element: <Navigate to="/admin/settings/calibration" replace />,
  },
  {
    path: 'tools/instruction-voice',
    element: <Navigate to="/admin/settings/audio" replace />,
  },
  {
    path: 'tools/audio-voice-test',
    element: <Navigate to="/admin/settings/audio?panel=tts" replace />,
  },
  {
    path: 'notifications',
    element: <Navigate to="/admin/settings/notifications" replace />,
  },
  {
    path: 'notification-templates',
    element: <Navigate to="/admin/settings/notifications?panel=templates" replace />,
  },
  {
    path: 'centers',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="centers">
          <CenterPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'clinics',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="clinics">
          <ClinicPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'audit-logs',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="audit-logs">
          <AuditLogPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'patients',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="patients">
          <PatientPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'patients/:id',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="patients">
          <PatientDetailPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'doctors',
    element: (
      <RouteWrapper>
        <DataTableProvider endpoint="doctors">
          <DoctorPage />
        </DataTableProvider>
      </RouteWrapper>
    ),
  },
  {
    path: 'exercises',
    element: (
      <RouteWrapper>
        <ExercisePage />
      </RouteWrapper>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/auth/404" />,
  },
];

const PrivateRoutes = {
  path: '/admin',
  element: (
    <RouteErrorBoundary>
      <AdminGuard>
        <CenterProvider>
          <Outlet />
        </CenterProvider>
      </AdminGuard>
    </RouteErrorBoundary>
  ),
  children: [
    {
      path: 'exercises/vt-quest/test',
      element: (
        <RouteWrapper>
          <VtQuestTestPage />
        </RouteWrapper>
      ),
    },
    {
      path: '',
      element: <FullLayout />,
      children: layoutChildren,
    },
  ],
};

export default PrivateRoutes;
