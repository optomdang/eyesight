import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import LoadingBar from 'src/LoadingBar';

const MinimalLayout = () => (
  <>
    <LoadingBar />
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        padding: 0,
        margin: 0,
        bgcolor: 'grey.100',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Outlet />
    </Box>
  </>
);

export default MinimalLayout;
