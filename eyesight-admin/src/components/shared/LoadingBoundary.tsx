import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingBoundaryProps {
  loading: boolean;
  children: React.ReactNode;
  height?: number | string;
  centered?: boolean;
}

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  loading,
  children,
  height = 400,
  centered = true,
}) => {
  if (loading) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(centered && { width: '100%' }),
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

export default LoadingBoundary;
