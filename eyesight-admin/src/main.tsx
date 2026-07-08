import { Suspense } from 'react';
import { CustomizerContextProvider } from './contexts/CustomizerContext';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry } from './utils/sentry';

import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import { AuthProvider } from 'src/contexts/authGuard/JwtContext.tsx';
import { SnackbarProvider } from 'src/contexts/SnackbarProvider.tsx';
import { ConfirmProvider } from 'src/hooks/useConfirm.tsx';
import { NotificationProvider } from 'src/contexts/NotificationContext';

// Initialize Sentry BEFORE rendering React app
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <CustomizerContextProvider>
    <Suspense fallback={<Spinner />}>
      <SnackbarProvider>
        <ConfirmProvider>
          <AuthProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </AuthProvider>
        </ConfirmProvider>
      </SnackbarProvider>
    </Suspense>
  </CustomizerContextProvider>
);
