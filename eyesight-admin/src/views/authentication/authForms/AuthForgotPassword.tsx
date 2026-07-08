import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

const AuthForgotPassword = () => {
  const { t } = useTranslation();
  return (
    <>
      <Stack mt={4} spacing={2}>
        <CustomFormLabel htmlFor="reset-email">{t('form.email')}</CustomFormLabel>
        <CustomTextField id="reset-email" variant="outlined" fullWidth />

        <Button color="primary" variant="contained" size="large" fullWidth component={Link} to="/">
          {t('auth.forgotPasswordButton')}
        </Button>
        <Button color="primary" size="large" fullWidth component={Link} to="/auth/login">
          {t('auth.backToLogin')}
        </Button>
      </Stack>
    </>
  );
};

export default AuthForgotPassword;
