import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Grid, Box, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import img1 from 'src/assets/images/backgrounds/login-bg.svg';
import Logo from 'src/layouts/full/shared/logo/Logo';
import AuthLogin from './authForms/AuthLogin';

const Login = () => {
  const { t } = useTranslation();
  return (
    <PageContainer title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
      <Grid container spacing={0} sx={{ overflowX: 'hidden' }}>
        <Grid
          sx={{
            position: 'relative',
            '&:before': {
              content: '""',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              position: 'absolute',
              height: '100%',
              width: '100%',
              opacity: '0.15',
            },
          }}
          size={{
            xs: 12,
            sm: 12,
            lg: 7,
            xl: 8,
          }}
        >
          <Box position="relative">
            <Box px={3}>
              <Logo />
            </Box>
            <Box
              alignItems="center"
              justifyContent="center"
              height={'calc(100vh - 75px)'}
              sx={{
                display: {
                  xs: 'none',
                  lg: 'flex',
                },
              }}
            >
              <img
                src={img1}
                alt="bg"
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  filter: 'brightness(0.85) saturate(0.8) contrast(1.1)',
                }}
              />
            </Box>
          </Box>
        </Grid>
        <Grid
          display="flex"
          justifyContent="center"
          alignItems="center"
          size={{
            xs: 12,
            sm: 12,
            lg: 5,
            xl: 4,
          }}
        >
          <Box p={4}>
            <AuthLogin
              title={t('auth.welcomeTitle')}
              subtext={
                <Typography variant="subtitle1" color="textSecondary" mb={1}>
                  {t('auth.adminDashboard')}
                </Typography>
              }
            />
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Login;
