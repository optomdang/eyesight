import { lazy } from 'react';
import Loadable from 'src/layouts/full/shared/loadable/Loadable';
import GuestGuard from 'src/contexts/authGuard/GuestGuard.tsx';
import { Navigate } from 'react-router-dom';

const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const Login = Loadable(lazy(() => import('src/views/authentication/Login')));
const ForgotPassword = Loadable(lazy(() => import('src/views/authentication/ForgotPassword')));
const Error = Loadable(lazy(() => import('src/views/authentication/Error')));
const ForbiddenPage = Loadable(lazy(() => import('src/views/authentication/ForbiddenPage')));

const PublicRoutes = {
  path: '/auth',
  children: [
    {
      path: '', // Sử dụng path rỗng thay vì '/auth'
      element: (
        <GuestGuard>
          <BlankLayout />
        </GuestGuard>
      ),
      children: [
        {
          path: 'login', // Sử dụng path tương đối
          element: <Login />,
        },
        {
          path: 'forgot-password',
          element: <ForgotPassword />,
        },
      ],
    },
    {
      path: '', // Sử dụng path rỗng
      element: <BlankLayout />,
      children: [
        { path: '404', element: <Error /> },
        { path: '403', element: <ForbiddenPage /> },
        { path: '*', element: <Navigate to="/auth/404" replace /> },
      ],
    },
  ],
};

export default PublicRoutes;
