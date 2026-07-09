import React, { useState, useCallback, useEffect } from 'react';
import {
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import { useForm, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import useDataTable from 'src/contexts/data-context/useDataTable';
import FormSelect from 'src/components/forms/FormSelect';
import useAuth from 'src/contexts/authGuard/useAuth.tsx';
import { useTranslation } from 'src/hooks/useTranslation';
import * as userService from 'src/services/user.service';
import { SelectOptions, Role } from 'src/types/core';
import { User } from 'src/types';
import useSnackbar from 'src/contexts/UseSnackbar';
import { getErrorMessage } from 'src/utils/errorHandler';
import { userSchema } from 'src/validations';

// Import from split files
import { UserFormProps, UserType, UnifiedUserFormData } from './user-form.types';
import { parseUserData } from './user-form.utils';
import { computeTreatmentStatus } from 'src/utils/treatmentStatus';
import { getPatientActiveTreatmentPackage } from 'src/services/treatmentPackage.service';
import BasicInfoFields from './BasicInfoFields';
import DoctorFields from './DoctorFields';
import PatientFields from './PatientFields';

function UserModal({ open, onClose, rowData, userType, readOnly = false }: UserFormProps): React.JSX.Element {
  // Don't specify generic type - let DataTableProvider determine the actual type
  // (Patient/Doctor/User depending on which page is using this form)
  const { fetchData } = useDataTable();
  const [roleOptions, setRoleOptions] = useState<SelectOptions[]>([]);
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isSubmitted, errors },
  } = useForm<UnifiedUserFormData>({
    resolver: yupResolver(userSchema) as Resolver<UnifiedUserFormData>,
    defaultValues: parseUserData({
      name: '',
      email: '',
      phoneNumber: '',
      userType: userType,
    }),
  });

  const values = watch();

  const onSubmit = async (values: UnifiedUserFormData) => {
    try {
      const currentUserType = userType || values.userType;

      // Base user data (common fields)
      const baseUserData = {
        userType: currentUserType,
        name: values.name!,
        email: values.email!,
        phoneNumber: values.phoneNumber!,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        zaloUserId: values.zaloUserId,
        zaloPhoneNumber: values.zaloPhoneNumber,
        address: values.address,
        roleId: values.roleId,
        centerId: user?.centerId || values.centerId,
        defaultClinicId: values.defaultClinicId,
        active: values.id ? values.active : true, // Tạo mới bởi admin → active ngay
      };

      if (values?.id) {
        // UPDATE mode
        const updateData: Partial<User> = {
          ...baseUserData,
          id: values.id,
        };

        // Add password only if user explicitly enabled password change and provided new password
        if (values.changePassword && values.newPassword?.trim()) {
          updateData.password = values.newPassword;
        }

        // Add role-specific data
        if (currentUserType === UserType.DOCTOR) {
          updateData.doctor = {
            id: values.doctor?.id || 0,
            code: values.doctor?.code || '',
            specialization: values.doctor?.specialization || '',
            licenseNumber: values.doctor?.licenseNumber || '',
            qualification: values.doctor?.qualification,
            departmentId: values.doctor?.departmentId,
          };
        } else if (currentUserType === UserType.PATIENT) {
          updateData.patient = {
            id: values.patient?.id || 0,
            code: values.patient?.code || '',
            doctorId: values.patient?.doctorId,
            currentEyesight: values.patient?.currentEyesight,
            severityLevel: values.patient?.severityLevel,
            severityNotes: values.patient?.severityNotes,
            // Form toggle (boolean) → backend string enum (SOT).
            treatmentStatus: computeTreatmentStatus({
              paused: values.patient?.treatmentStatus === false,
              activeFrom: values.patient?.activeFrom,
              activeTo: values.patient?.activeTo,
            }),
            activeFrom: values.patient?.activeFrom,
            activeTo: values.patient?.activeTo,
          };
          if (user?.userType === 'admin' && values.patient?.treatmentPackageId) {
            updateData.patient.treatmentPackageId = values.patient.treatmentPackageId;
          }
        }

        await userService.updateUser(values.id, updateData);
      } else {
        // CREATE mode
        const createData: any = {
          ...baseUserData,
          password: values.password!,
        };

        // Add role-specific data
        if (currentUserType === UserType.DOCTOR) {
          createData.doctor = {
            code: values.doctor?.code || '',
            specialization: values.doctor?.specialization || '',
            licenseNumber: values.doctor?.licenseNumber || '',
            qualification: values.doctor?.qualification,
            departmentId: values.doctor?.departmentId,
            clinicId: values.defaultClinicId,
          };
        } else if (currentUserType === UserType.PATIENT) {
          createData.patient = {
            code: values.patient?.code || '',
            doctorId: values.patient?.doctorId,
            currentEyesight: values.patient?.currentEyesight,
            clinicId: values.defaultClinicId,
            severityLevel: values.patient?.severityLevel,
            severityNotes: values.patient?.severityNotes,
            treatmentPackageId: values.patient?.treatmentPackageId,
            // Form toggle (boolean) → backend string enum (SOT).
            treatmentStatus: computeTreatmentStatus({
              paused: values.patient?.treatmentStatus === false,
              activeFrom: values.patient?.activeFrom,
              activeTo: values.patient?.activeTo,
            }),
            activeFrom: values.patient?.activeFrom,
            activeTo: values.patient?.activeTo,
          };
        }

        await userService.createUser(createData);
      }

      reset();
      onClose();
      fetchData();
      showSnackbar(
        values.id
          ? t('common.updateSuccess', 'Cập nhật thành công')
          : t('common.createSuccess', 'Tạo mới thành công'),
        'success'
      );
    } catch (error: any) {
      const fallback = values.id
        ? t('common.updateError', 'Cập nhật thất bại')
        : t('common.createError', 'Tạo mới thất bại');
      showSnackbar(getErrorMessage(error, fallback), 'error');
    }
  };

  useEffect(() => {
    const handleGetData = async () => {
      if (rowData && open) {
        // Always fetch from /users endpoint, regardless of DataTableProvider endpoint
        const data = await userService.getUser(Number(rowData));
        // parseUserData now handles everything including dates, doctor, patient
        const formData = parseUserData(data);
        if (formData.patient?.id) {
          try {
            const active = await getPatientActiveTreatmentPackage(formData.patient.id);
            if (active?.treatmentPackage?.id) {
              formData.patient.treatmentPackageId = active.treatmentPackage.id;
            }
          } catch {
            // ignore — package field stays empty
          }
        }
        reset(formData);
      } else if (!rowData && open) {
        // Reset to default values for create mode
        const defaultValues = parseUserData({
          name: '',
          email: '',
          phoneNumber: '',
          userType: userType,
        });
        // Explicitly clear all date fields to prevent placeholder overlap
        reset({
          ...defaultValues,
          dateOfBirth: undefined,
          patient: {
            ...defaultValues.patient,
            activeFrom: undefined,
            activeTo: undefined,
          },
        });
      }
    };
    void handleGetData();
  }, [rowData, open, reset, userType]);

  useEffect(() => {
    // Fetch roles (small dataset, no need for autocomplete)
    userService.getRoles({ limit: 1000 }).then((data) => {
      const roles = data.rows.map(
        (x: Role): SelectOptions => ({
          value: x.id || 0,
          label: x.name,
        })
      );
      setRoleOptions(roles);
    });
  }, [rowData]);

  // Auto-set roleId based on userType
  useEffect(() => {
    if (!values?.id && roleOptions.length > 0) {
      const currentUserType = userType || values.userType;

      const matchingRole = roleOptions.find((role) =>
        role.label.toLowerCase().includes(currentUserType?.toLowerCase() || '')
      );

      if (matchingRole && values.roleId !== matchingRole.value) {
        reset({
          ...values,
          roleId: Number(matchingRole.value),
        });
      }
    }
  }, [values.userType, userType, roleOptions, values?.id, values, reset]);

  const handleClose = useCallback(() => {
    onClose();
    reset();
  }, [onClose, reset]);

  const currentUserType = userType || values.userType;

  const dialogTitle = readOnly
    ? t('user.viewUser', 'Xem người dùng')
    : values?.id
      ? t('user.updateUser', 'Cập nhật người dùng')
      : t('user.createNewUser', 'Tạo người dùng mới');

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <Box component={readOnly ? 'div' : 'form'} onSubmit={readOnly ? undefined : handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* User Type Selection (only for create mode and when no predefined userType) */}
            {!readOnly && !values?.id && !userType && (
              <Grid size={{ xs: 12 }}>
                <FormSelect
                  name="userType"
                  control={control}
                  label={t('user.userType')}
                  options={[
                    { value: UserType.ADMIN, label: t('admin.admin') },
                    { value: UserType.DOCTOR, label: t('doctor.doctor') },
                    { value: UserType.PATIENT, label: t('patient.patient') },
                  ]}
                />
              </Grid>
            )}

            {/* Common User Information */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
                {t('user.basicInfo')}
              </Typography>
              <Divider />
            </Grid>

            {/* Basic Info Fields */}
            <BasicInfoFields
              control={control}
              values={values}
              errors={errors}
              isSubmitted={isSubmitted}
              userType={userType}
              readOnly={readOnly}
            />

            {/* Doctor specific fields */}
            {currentUserType === UserType.DOCTOR && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    {t('doctor.doctorInfo', 'Thông tin bác sĩ')}
                  </Typography>
                  <Divider />
                </Grid>
                <DoctorFields
                  control={control}
                  values={values}
                  errors={errors}
                  userType={userType}
                  readOnly={readOnly}
                />
              </>
            )}

            {/* Patient specific fields */}
            {currentUserType === UserType.PATIENT && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    {t('patient.patientInfo', 'Thông tin bệnh nhân')}
                  </Typography>
                  <Divider />
                </Grid>
                <PatientFields
                  control={control}
                  values={values}
                  errors={errors}
                  userType={userType}
                  readOnly={readOnly}
                />
              </>
            )}

            {/* Information note for create mode */}
            {!readOnly && !values?.id && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.main">
                    <strong>{t('common.note')}:</strong>
                    {currentUserType === UserType.ADMIN && t('user.createAdminNote')}
                    {currentUserType === UserType.DOCTOR && t('user.createDoctorNote')}
                    {currentUserType === UserType.PATIENT && t('user.createPatientNote')}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={handleClose}>
            {t('common.close')}
          </Button>
          {!readOnly && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={isSubmitting}
              type="submit"
            >
              {values.id ? t('common.update') : t('common.create')}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default UserModal;
