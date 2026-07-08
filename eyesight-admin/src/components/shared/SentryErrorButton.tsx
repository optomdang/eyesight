import { Button } from '@mui/material';
import { BugReport as BugIcon } from '@mui/icons-material';

/**
 * Development-only button to verify Sentry error capture.
 */
function SentryErrorButton() {
  const handleClick = () => {
    // Intentionally throw to test Sentry integration.
    throw new Error('This is your first error!');
  };

  return (
    <Button
      variant="outlined"
      color="error"
      startIcon={<BugIcon />}
      onClick={handleClick}
      sx={{ m: 2 }}
    >
      Trigger test error (Sentry)
    </Button>
  );
}

export default SentryErrorButton;
