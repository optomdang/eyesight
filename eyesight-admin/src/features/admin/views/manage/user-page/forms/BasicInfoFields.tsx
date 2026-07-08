import { useState, useMemo, useCallback } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import {
  Grid,
  InputAdornment,
  IconButton,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
  Box,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import FormTextField from 'src/components/forms/FormTextField';
import FormSelect from 'src/components/forms/FormSelect';
import FormAutocomplete from 'src/components/forms/FormAutocomplete';
import { useTranslation } from 'src/hooks/useTranslation';
import { useAutocompleteOptions } from 'src/hooks/useAutocompleteOptions';
import useAuth from 'src/contexts/authGuard/useAuth';
import { AddressFields } from 'src/components/forms/AddressFields';
import { HelpTooltip } from 'src/components/shared/HelpTooltip';
import { UserType, UnifiedUserFormData } from './user-form.types';
import * as userService from 'src/services/user.service';
import { Clinic } from 'src/types/core';

interface BasicInfoFieldsProps {
  control: Control<UnifiedUserFormData>;
  values: UnifiedUserFormData;
  errors: FieldErrors<UnifiedUserFormData>;
  isSubmitted?: boolean;
  userType?: UserType;
  readOnly?: boolean;
}

/**
 * Basic user information fields component
 * Includes: name, email, phone, gender, DOB, password, address, clinic
 */
function BasicInfoFields({
  control,
  values,
  errors,
  isSubmitted = false,
  userType,
  readOnly = false,
}: BasicInfoFieldsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.userType === 'admin';
  const currentUserType = userType || values.userType;

  // Separate password visibility states for better UX
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Stable references to prevent infinite re-trigger in useAutocompleteOptions
  const fetchClinics = useCallback(
    async (searchTerm: string) => userService.getClinics({ name: searchTerm, limit: 20 }),
    []
  );
  const mapClinicToOption = useCallback(
    (clinic: Clinic) => ({ value: clinic.id || 0, label: clinic.name }),
    []
  );

  // Load clinics with autocomplete
  const clinics = useAutocompleteOptions({
    fetchFn: fetchClinics,
    mapToOption: mapClinicToOption,
    searchOnMount: true,
    initialSearch: '',
  });

  // Memoize gender options to prevent unnecessary re-renders
  const genderOptions = useMemo(
    () => [
      { value: '', label: t('common.select') },
      { value: 'male', label: t('user.male', 'Nam') },
      { value: 'female', label: t('user.female', 'Nữ') },
      { value: 'other', label: t('user.other', 'Khác') },
    ],
    [t]
  );

  return (
    <>
      {/* Code field - conditional based on user type */}
      {currentUserType === UserType.DOCTOR && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            name="doctor.code"
            control={control}
            label={t('doctor.code', 'Mã bác sĩ') + ' *'}
            disabled={readOnly}
          />
        </Grid>
      )}

      {currentUserType === UserType.PATIENT && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            name="patient.code"
            control={control}
            label={t('patient.code', 'Mã bệnh nhân') + ' *'}
            disabled={readOnly}
          />
        </Grid>
      )}

      {/* Default Clinic */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormAutocomplete
          name="defaultClinicId"
          control={control}
          label={t('user.defaultClinic', 'Phòng khám mặc định')}
          options={clinics.options}
          loading={clinics.loading}
          onInputChange={clinics.search}
          disabled={readOnly}
        />
      </Grid>

      {/* Full Name */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField name="name" control={control} label={t('user.fullName') + ' *'} disabled={readOnly} />
      </Grid>

      {/* Email */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="email"
          control={control}
          label={t('user.email') + ' *'}
          disabled={readOnly}
        />
      </Grid>

      {/* Phone Number */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="phoneNumber"
          control={control}
          label={t('user.phoneNumber') + ' *'}
          disabled={readOnly}
        />
      </Grid>

      {/* Gender */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormSelect
          name="gender"
          control={control}
          label={t('user.gender', 'Giới tính')}
          options={genderOptions}
          disabled={readOnly}
        />
      </Grid>

      {/* Date of Birth */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="dateOfBirth"
          control={control}
          type="date"
          label={t('patient.dateOfBirth', 'Ngày sinh')}
          disabled={readOnly}
        />
      </Grid>

      {/* Zalo Phone Number */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormTextField
          name="zaloPhoneNumber"
          control={control}
          label={t('patient.zaloPhone', 'Số điện thoại Zalo')}
          disabled={readOnly}
        />
      </Grid>

      {/* Password - only for create mode */}
      {!values?.id && !readOnly && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormTextField
            name="password"
            control={control}
            label={t('user.password') + ' *'}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      )}

      {/* Reset Password - only for edit mode */}
      {values?.id && readOnly && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch checked={field.value ?? false} color="primary" disabled />
                }
                label={
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t('user.accountStatus', 'Trạng thái tài khoản')}
                    </Typography>
                    <HelpTooltip title="Bật: người dùng có thể đăng nhập. Tắt: tạm khóa tài khoản." />
                  </Box>
                }
              />
            )}
          />
        </Grid>
      )}

      {values?.id && !readOnly && (
        <>
          {/* Account Status */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value ?? false}
                      onChange={field.onChange}
                      color="primary"
                      disabled={!isAdmin}
                    />
                  }
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t('user.accountStatus', 'Trạng thái tài khoản')}
                      </Typography>
                      <HelpTooltip title="Bật: người dùng có thể đăng nhập. Tắt: tạm khóa tài khoản." />
                    </Box>
                  }
                />
              )}
            />
          </Grid>

          {/* Password Change Toggle - controlled by react-hook-form */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="changePassword"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value ?? false}
                      onChange={field.onChange}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t('user.changePassword', 'Đổi mật khẩu')}
                      </Typography>
                      <HelpTooltip title="Bật để nhập mật khẩu mới cho người dùng." />
                    </Box>
                  }
                />
              )}
            />
          </Grid>

          {/* New Password Fields - only show when changePassword is true */}
          {values.changePassword && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormTextField
                  name="newPassword"
                  control={control}
                  label={t('user.newPassword', 'Mật khẩu mới') + ' *'}
                  type={showNewPassword ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                          size="small"
                        >
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormTextField
                  name="confirmPassword"
                  control={control}
                  label={t('user.confirmPassword', 'Xác nhận mật khẩu') + ' *'}
                  type={showConfirmPassword ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </>
          )}
        </>
      )}

      {/* Address Section */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          {t('user.addressInfo', 'Thông tin địa chỉ')}
        </Typography>
        <Divider />
      </Grid>

      <Controller
        name="address"
        control={control}
        render={({ field }) => {
          // Type-safe error extraction with proper type guard
          const addressFieldErrors = errors.address as
            | Record<string, { message?: string }>
            | undefined;

          return (
            <AddressFields
              value={field.value}
              onChange={field.onChange}
              disabled={readOnly}
              errors={{
                country: addressFieldErrors?.country?.message,
                province: addressFieldErrors?.province?.message,
                ward: addressFieldErrors?.ward?.message,
                specificAddress: addressFieldErrors?.specificAddress?.message,
              }}
              touched={{}}
              isSubmitted={isSubmitted}
            />
          );
        }}
      />
    </>
  );
}

export default BasicInfoFields;
