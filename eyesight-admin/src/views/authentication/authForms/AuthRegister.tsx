import React from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Typography, Button, Divider, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { registerType } from 'src/types/core';

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
  const { t } = useTranslation();
  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <Box mt={3}>
        <Divider>
          <Typography
            component="span"
            color="textSecondary"
            variant="h6"
            fontWeight="400"
            position="relative"
            px={2}
          >
            {t('auth.orSignUpWith')}
          </Typography>
        </Divider>
      </Box>

      <Box>
        <Stack mb={3}>
          <CustomFormLabel htmlFor="name">{t('form.name')}</CustomFormLabel>
          <CustomTextField id="name" variant="outlined" fullWidth />
          <CustomFormLabel htmlFor="email">{t('form.email')}</CustomFormLabel>
          <CustomTextField id="email" variant="outlined" fullWidth />
          <CustomFormLabel htmlFor="password">{t('form.password')}</CustomFormLabel>
          <CustomTextField id="password" variant="outlined" fullWidth />
        </Stack>
        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          component={Link}
          to="/auth/login"
        >
          {t('auth.signUp')}
        </Button>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthRegister;
