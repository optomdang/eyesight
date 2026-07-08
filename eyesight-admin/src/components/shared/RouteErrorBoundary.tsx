import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import {
  Error as ErrorIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RouteErrorBoundaryClass extends Component<
  Props & { navigate: (path: string) => void },
  State
> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RouteErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error });
  }

  handleGoHome = () => {
    this.props.navigate('/admin');
    this.setState({ hasError: false, error: undefined });
  };

  handleGoBack = () => {
    this.props.navigate(-1);
    this.setState({ hasError: false, error: undefined });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            textAlign="center"
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                maxWidth: 500,
                width: '100%',
              }}
            >
              <ErrorIcon
                sx={{
                  fontSize: 64,
                  color: 'error.main',
                  mb: 2,
                }}
              />

              <Typography variant="h5" component="h1" gutterBottom>
                Page Error
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                We encountered an error while loading this page. You can try again or navigate to a
                different page.
              </Typography>

              <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center">
                <Button variant="contained" onClick={this.handleRetry} sx={{ minWidth: 120 }}>
                  Try Again
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={this.handleGoBack}
                  sx={{ minWidth: 120 }}
                >
                  Go Back
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  sx={{ minWidth: 120 }}
                >
                  Go Home
                </Button>
              </Box>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box sx={{ mt: 3, textAlign: 'left' }}>
                  <Typography variant="caption" color="error" display="block" gutterBottom>
                    Error Details (Development):
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography variant="caption" color="error" display="block" gutterBottom>
                      {this.state.error.message}
                    </Typography>
                    <pre style={{ fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {this.state.error.stack}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide navigation
const RouteErrorBoundary: React.FC<Props> = (props) => {
  const navigate = useNavigate();
  return <RouteErrorBoundaryClass {...props} navigate={navigate} />;
};

export default RouteErrorBoundary;
