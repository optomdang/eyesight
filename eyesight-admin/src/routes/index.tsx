import { createBrowserRouter } from 'react-router-dom';
import DefaultRoutes from './DefaultRoutes';
import AdminRoutes from './AdminRoutes';
import PortalRoutes from './PortalRoutes';
import PublicRoutes from './PublicRoutes';

const router = createBrowserRouter([DefaultRoutes, AdminRoutes, PortalRoutes, PublicRoutes], {
  basename: import.meta.env.VITE_APP_BASE_NAME,
});
export default router;
