import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import DefaultRoutes from './DefaultRoutes';
import AdminRoutes from './AdminRoutes';
import PortalRoutes from './PortalRoutes';
import PublicRoutes from './PublicRoutes';

const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const WarrantySignPage = Loadable(lazy(() => import('../views/sign/WarrantySignPage')));

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

const router = createBrowserRouter(
  [DefaultRoutes, AdminRoutes, PortalRoutes, SignRoutes, PublicRoutes],
  { basename: import.meta.env.VITE_APP_BASE_NAME }
);
export default router;
