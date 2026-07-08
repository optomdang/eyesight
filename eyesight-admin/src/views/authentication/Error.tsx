import { FC } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import ErrorImg from 'src/assets/images/backgrounds/404-error-idea.gif';

const Error: FC = () => {
  const { t } = useTranslation();
  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100vh"
      textAlign="center"
      justifyContent="center"
    >
      <Container maxWidth="md">
        <img src={ErrorImg} alt="404" style={{ width: '100%', maxWidth: '500px' }} />
        <Typography align="center" variant="h1" mb={4}>
          {t('auth.errorTitle')}
        </Typography>
        <Typography align="center" variant="h4" mb={4}>
          {t('auth.errorDescription')}
        </Typography>
        <Button color="primary" variant="contained" component={Link} to="/" disableElevation>
          {t('common.home')}
        </Button>
      </Container>
    </Box>
  );
};

export default Error;
