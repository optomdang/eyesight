import { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingBoxProps {
  loading: boolean;
  children: ReactNode;
}

const LoadingBox = ({ loading, children }: LoadingBoxProps) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

export default LoadingBox;
