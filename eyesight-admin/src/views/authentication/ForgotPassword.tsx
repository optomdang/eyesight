import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Grid, Box, Typography } from '@mui/material';

import Logo from 'src/layouts/full/shared/logo/Logo';
import PageContainer from 'src/components/container/PageContainer';

import img1 from 'src/assets/images/backgrounds/login-bg.svg';

import AuthForgotPassword from './authForms/AuthForgotPassword';

const ForgotPassword = () => {
  const { t } = useTranslation();
  return (
    <PageContainer
      title={t('auth.forgotPasswordTitle')}
      description={t('auth.forgotPasswordDescription')}
    >
      <Grid container justifyContent="center" spacing={0} sx={{ overflowX: 'hidden' }}>
        <Grid
          sx={{
            position: 'relative',
            '&:before': {
              content: '""',
              background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
              backgroundSize: '400% 400%',
              animation: 'gradient 15s ease infinite',
              position: 'absolute',
              height: '100%',
              width: '100%',
              opacity: '0.3',
            },
          }}
          size={{
            xs: 12,
            sm: 12,
            lg: 8,
            xl: 9,
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
            lg: 4,
            xl: 3,
          }}
        >
          <Box p={4}>
            <Typography variant="h4" fontWeight="700">
              {t('auth.forgotPasswordHeader')}
            </Typography>

            <Typography color="textSecondary" variant="subtitle2" fontWeight="400" mt={2}>
              {t('auth.forgotPasswordInstruction')}
            </Typography>
            <AuthForgotPassword />
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ForgotPassword;
