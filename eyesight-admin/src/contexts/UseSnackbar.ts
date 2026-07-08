// Custom hook to use Snackbar
import { useContext } from 'react';
import { SnackbarContext } from 'src/contexts/SnackbarProvider.tsx';

const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};
export default useSnackbar;
