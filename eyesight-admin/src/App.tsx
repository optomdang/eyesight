import { useContext } from 'react';
import { CustomizerContext } from 'src/contexts/CustomizerContext';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import ErrorBoundary from './components/shared/ErrorBoundary';

function App() {
  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);

  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.error('Global error caught:', error, errorInfo);
    }
  };

  return (
    <ErrorBoundary onError={handleGlobalError}>
      <ThemeProvider theme={theme}>
        <RTL direction={activeDir}>
          <CssBaseline />
          <RouterProvider router={router} />
        </RTL>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
