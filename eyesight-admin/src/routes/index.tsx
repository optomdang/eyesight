import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import DefaultRoutes from './DefaultRoutes';
import AdminRoutes from './AdminRoutes';
import PortalRoutes from './PortalRoutes';
import PublicRoutes from './PublicRoutes';

const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const WarrantySignPage = Loadable(lazy(() => import('../views/sign/WarrantySignPage')));
const Game2048GuidePreviewPage = Loadable(
  lazy(() => import('../views/dev/Game2048GuidePreviewPage')),
);

// Public sign routes — no auth required
const SignRoutes = {
  path: '/sign',
  element: <BlankLayout />,
  children: [
    {
      path: 'warranty/:token',
      element: <WarrantySignPage />,
    },
  ],
};

/** Local UI preview routes (dev only). */
const DevRoutes = {
  path: '/dev',
  element: <BlankLayout />,
  children: [
    {
      path: '2048-guide',
      element: import.meta.env.DEV ? (
        <Game2048GuidePreviewPage />
      ) : (
        <Navigate to="/auth/404" replace />
      ),
    },
  ],
};

const router = createBrowserRouter(
  [DefaultRoutes, AdminRoutes, PortalRoutes, SignRoutes, DevRoutes, PublicRoutes],
  { basename: import.meta.env.VITE_APP_BASE_NAME }
);
export default router;
