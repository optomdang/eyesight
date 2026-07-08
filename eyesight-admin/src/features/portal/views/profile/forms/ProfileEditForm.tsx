import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import AvatarUpload from 'src/components/forms/AvatarUpload';
import useSnackbar from 'src/contexts/UseSnackbar';
import { updateMyProfile } from 'src/services/patient.service';
import type { User } from 'src/types/core';
import { profileSchema, type ProfileFormData } from 'src/validations';
import { getErrorMessage } from 'src/utils/errorHandler';

interface ProfileEditFormProps {
  user: User;
  onSuccess?: () => void;
}

const getInitialValues = (user: User): ProfileFormData => ({
  name: user.name || '',
  email: user.email || '',
  phoneNumber: user.phoneNumber || '',
  dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth).format('YYYY-MM-DD') : '',
  gender: user.gender || null,
  zaloUserId: user.zaloUserId || '',
  zaloPhoneNumber: user.zaloPhoneNumber || '',
  address:
    typeof user.address === 'object'
      ? user.address
      : {
          specificAddress: '',
          ward: '',
          district: '',
          province: '',
          country: 'Việt Nam',
        },
  avatar: user.avatar || '',
});

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ user, onSuccess }) => {
  const { showSnackbar } = useSnackbar();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: getInitialValues(user),
  });

  const values = watch();

  // Reset form when user changes
  useEffect(() => {
    reset(getInitialValues(user));
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Filter out unchanged fields to reduce payload
      const changedData: Partial<ProfileFormData> = {};

      Object.keys(data).forEach((key) => {
        const k = key as keyof ProfileFormData;
        if (JSON.stringify(data[k]) !== JSON.stringify(user[k as keyof User])) {
          (changedData as Record<string, unknown>)[k] = data[k];
        }
      });

      if (Object.keys(changedData).length === 0) {
        showSnackbar('Không có thay đổi nào để lưu', 'info');
        return;
      }

      await updateMyProfile(changedData);

      showSnackbar('Cập nhật thông tin thành công', 'success');

      if (onSuccess) {
        onSuccess();
      }

      // Reload page to refresh user context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      showSnackbar(getErrorMessage(error, 'Cập nhật thất bại'), 'error');
    }
  };

  const handleCancel = () => {
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3}>
        {/* Avatar Section */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ảnh đại diện
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Box display="flex" justifyContent="center">
                <AvatarUpload
                  value={values.avatar || undefined}
                  onChange={(base64) => setValue('avatar', base64 || '', { shouldDirty: true })}
                  name={user.name}
                  size={150}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Information */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thông tin cá nhân
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                {/* Name */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Họ và tên *"
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Date of Birth */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="dateOfBirth"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Ngày sinh"
                        type="date"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.dateOfBirth}
                        helperText={errors.dateOfBirth?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Gender */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Giới tính"
                        select
                        fullWidth
                        error={!!errors.gender}
                        helperText={errors.gender?.message}
                      >
                        <MenuItem value="">-- Chọn giới tính --</MenuItem>
                        <MenuItem value="male">Nam</MenuItem>
                        <MenuItem value="female">Nữ</MenuItem>
                        <MenuItem value="other">Khác</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>

                {/* Email */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Email *"
                        type="email"
                        fullWidth
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Phone Number */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="phoneNumber"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Số điện thoại *"
                        fullWidth
                        error={!!errors.phoneNumber}
                        helperText={errors.phoneNumber?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Zalo User ID */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="zaloUserId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Zalo ID"
                        fullWidth
                        error={!!errors.zaloUserId}
                        helperText={errors.zaloUserId?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Zalo Phone Number */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="zaloPhoneNumber"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Số điện thoại Zalo"
                        fullWidth
                        error={!!errors.zaloPhoneNumber}
                        helperText={errors.zaloPhoneNumber?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Address Information */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Địa chỉ
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2}>
                {/* Specific Address */}
                <Grid size={12}>
                  <Controller
                    name="address.specificAddress"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Địa chỉ cụ thể"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Số nhà, tên đường..."
                      />
                    )}
                  />
                </Grid>

                {/* Ward */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="address.ward"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} value={field.value || ''} label="Phường/Xã" fullWidth />
                    )}
                  />
                </Grid>

                {/* District */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="address.district"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Quận/Huyện"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                {/* Province */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="address.province"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        value={field.value || ''}
                        label="Tỉnh/Thành phố"
                        fullWidth
                      />
                    )}
                  />
                </Grid>

                {/* Country */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Controller
                    name="address.country"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} value={field.value || ''} label="Quốc gia" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={isSubmitting || !isDirty}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  );
};

export default ProfileEditForm;
