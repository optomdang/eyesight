import { Outlet } from 'react-router-dom';
import LoadingBar from 'src/LoadingBar';

const BlankLayout = () => (
  <>
    <LoadingBar />
    <Outlet />
  </>
);

export default BlankLayout;
