import { createContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import PropTypes from 'prop-types';
import { SnackbarState, SnackbarContextState } from 'src/types/core';

interface SnackbarProviderProps {
  children: ReactNode;
}

// Create Snackbar Context
const SnackbarContext = createContext<SnackbarContextState | undefined>(undefined);

// Snackbar Provider
const SnackbarProvider = ({ children }: SnackbarProviderProps) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info', // 'error', 'warning', 'info', 'success'
  });

  const showSnackbar = useCallback((message: string, severity: AlertColor | string = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

SnackbarProvider.propTypes = {
  children: PropTypes.node.isRequired, // Ensures that children are passed and are valid React nodes
};

export { SnackbarContext, SnackbarProvider };
