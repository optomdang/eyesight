import { Box, Typography, Button, Container } from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { Lock } from '@mui/icons-material';

const ForbiddenPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const { t } = useTranslation();
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <Lock sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'error.main' }}>
          403
        </Typography>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          {t('auth.forbiddenTitle')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', maxWidth: '500px' }}>
          {t('auth.forbiddenDescription')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={handleGoBack} size="large">
            {t('common.back')}
          </Button>
          <Button variant="contained" onClick={handleGoHome} size="large">
            {t('common.home')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default ForbiddenPage;
