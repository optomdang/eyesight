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
const LazyErrorFallback = ({ retry, error }: { retry: () => void; error?: Error }) => (
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
      Failed to load component
    </Typography>
    <Typography variant="body2" color="text.secondary" textAlign="center">
      There was an error loading this page. Please try again.
    </Typography>
    {import.meta.env.DEV && error?.message && (
      <Typography variant="caption" color="error" textAlign="center" sx={{ maxWidth: 480 }}>
        {error.message}
      </Typography>
    )}
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
