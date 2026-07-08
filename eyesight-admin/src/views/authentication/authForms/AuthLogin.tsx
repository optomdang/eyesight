import React, { useState } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { Box, Typography, FormGroup, FormControlLabel, Button, Stack, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { loginType } from 'src/types/core';
import Checkbox from '@mui/material/Checkbox';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { loginSchema, type LoginFormData } from 'src/validations';
import useMounted from 'src/contexts/authGuard/useMounted';
import useAuth from 'src/contexts/authGuard/useAuth';

const AuthLogin = ({ title }: loginType) => {
  const { t } = useTranslation();
  const mounted = useMounted();
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormData) => {
    try {
      setSubmitError(null);
      await login(values.email, values.password);
    } catch (err: Error | unknown) {
      if (mounted.current) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setSubmitError(errorMessage);
      }
    }
  };

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={3}>
          {title}
        </Typography>
      ) : null}
      {submitError && (
        <Box mt={2}>
          <Alert severity="error">{submitError}</Alert>
        </Box>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={2}>
          <Box>
            <CustomFormLabel htmlFor="email">{t('form.email')}</CustomFormLabel>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  id="email"
                  variant="outlined"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="password">{t('form.password')}</CustomFormLabel>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  id="password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
              )}
            />
          </Box>
          <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
            <FormGroup>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="Remeber this Device"
              />
            </FormGroup>
            <Typography
              component={Link}
              to="/auth/reset-password"
              fontWeight="500"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
              }}
            >
              Forgot Password ?
            </Typography>
          </Stack>
        </Stack>
        <Box>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={isSubmitting}
          >
            Sign In
          </Button>
        </Box>
      </form>
    </>
  );
};

export default AuthLogin;
