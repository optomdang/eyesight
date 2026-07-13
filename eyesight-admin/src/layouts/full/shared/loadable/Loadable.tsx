import React, { Suspense, lazy, ComponentType } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ErrorBoundary from 'src/components/shared/ErrorBoundary';

// Enhanced loading component
const LoadingFallback = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

// Error fallback for lazy components
const LazyErrorFallback = ({
  retry,
  error,
}: {
  retry: () => void;
  error?: Error;
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
    gap={2}
    px={2}
  >
    <Typography variant="h6" color="error">
      Không tải được trang
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      Có lỗi khi tải trang. Thử tải lại (Cmd+Shift+R) hoặc đăng nhập lại sau vài giây.
    </Typography>
    {error?.message && (
      <Typography variant="caption" color="error" textAlign="center" sx={{ maxWidth: 480 }}>
        {error.message}
      </Typography>
    )}
    <Box display="flex" gap={1}>
      <Typography
        component="button"
        variant="body2"
        onClick={retry}
        sx={{
          cursor: 'pointer',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          px: 2,
          py: 0.75,
          bgcolor: 'background.paper',
        }}
      >
        Thử lại
      </Typography>
      <Typography
        component="button"
        variant="body2"
        onClick={() => window.location.reload()}
        sx={{
          cursor: 'pointer',
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
          px: 2,
          py: 0.75,
          color: 'primary.main',
          bgcolor: 'background.paper',
        }}
      >
        Tải lại trang
      </Typography>
    </Box>
  </Box>
);

interface LoadableOptions {
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

const Loadable = <T extends ComponentType<any>>(Component: T, options: LoadableOptions = {}) => {
  const {
    fallback: FallbackComponent = LoadingFallback,
    errorFallback: ErrorFallbackComponent = LazyErrorFallback,
    onError,
  } = options;

  const LoadableComponent = (props: React.ComponentProps<T>) => {
    const [retryKey, setRetryKey] = React.useState(0);

    const handleRetry = () => {
      setRetryKey((prev) => prev + 1);
    };

    return (
      <ErrorBoundary
        key={retryKey}
        fallback={<ErrorFallbackComponent retry={handleRetry} />}
        onError={onError}
      >
        <Suspense fallback={<FallbackComponent />}>
          <Component {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  return LoadableComponent;
};

export default Loadable;
