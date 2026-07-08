import * as Yup from 'yup';
import { UserType } from './user-form.types';

/**
 * Create validation schema for user form
 * @param t - Translation function
 * @param getCurrentUserType - Function to get current user type from form values
 */
export const createUserFormSchema = (
  t: (key: string, defaultValue: string) => string,
  getCurrentUserType: () => UserType | undefined
) => {
  return Yup.object().shape({
    id: Yup.number().optional(),
    userType: Yup.string().when('id', {
      is: (id: string) => !id,
      then: (schema) => schema.required(t('admin.pleaseSelectUserType', 'Vui lòng chọn loại user')),
      otherwise: (schema) => schema.optional(),
    }),
    name: Yup.string().required(t('admin.pleaseEnterUsername', 'Vui lòng nhập tên người dùng')),
    email: Yup.string()
      .required(t('admin.pleaseEnterEmail', 'Vui lòng nhập email'))
      .email(t('admin.pleaseEnterValidEmailFormat', 'Vui lòng nhập đúng định dạng email')),
    phoneNumber: Yup.string()
      .required(t('admin.pleaseEnterPhoneNumber', 'Vui lòng nhập SĐT'))
      .matches(
        /^(84|0)((3|5|7|8|9)\d{8})\b/,
        t('admin.pleaseEnterValidPhoneFormat', 'Vui lòng nhập đúng định dạng SĐT')
      ),
    password: Yup.string().when('id', {
      is: (id: string) => !id,
      then: (schema) =>
        schema
          .required(t('admin.pleaseEnterPassword', 'Vui lòng nhập mật khẩu'))
          .min(8, t('admin.passwordMinimum8Characters', 'Mật khẩu phải có ít nhất 8 ký tự')),
      otherwise: (schema) => schema.optional(),
    }),
    dateOfBirth: Yup.string()
      .optional()
      .nullable()
      .transform((value) => value || undefined),
    zaloUserId: Yup.string()
      .optional()
      .nullable()
      .transform((value) => value || undefined),
    zaloPhoneNumber: Yup.string()
      .optional()
      .nullable()
      .transform((value) => value || undefined)
      .matches(
        /^(84|0)((3|5|7|8|9)\d{8})\b/,
        t('admin.pleaseEnterValidPhoneFormat', 'Vui lòng nhập đúng định dạng SĐT')
      ),
    address: Yup.mixed().optional(),
    centerId: Yup.number().optional(),
    defaultClinicId: Yup.number()
      .optional()
      .nullable()
      .transform((value) => value || undefined),

    // Doctor object validation
    doctor: Yup.object().when([], {
      is: () => getCurrentUserType() === UserType.DOCTOR,
      then: (schema) =>
        schema.shape({
          code: Yup.string().required(t('admin.pleaseEnterDoctorCode', 'Vui lòng nhập mã bác sĩ')),
          specialization: Yup.string().required(
            t('admin.pleaseEnterSpecialization', 'Vui lòng nhập chuyên khoa sâu')
          ),
          licenseNumber: Yup.string()
            .optional()
            .nullable()
            .transform((value) => value || undefined),
          qualification: Yup.string().optional(),
          departmentId: Yup.number().optional(),
        }),
      otherwise: (schema) => schema.optional(),
    }),

    // Patient object validation
    patient: Yup.object().when([], {
      is: () => getCurrentUserType() === UserType.PATIENT,
      then: (schema) =>
        schema.shape({
          code: Yup.string().required(
            t('admin.pleaseEnterPatientCode', 'Vui lòng nhập mã bệnh nhân')
          ),
          doctorId: Yup.number()
            .optional()
            .nullable()
            .transform((value) => value || undefined),
          currentEyesight: Yup.number()
            .optional()
            .nullable()
            .transform((value) => value || undefined)
            .min(0, t('admin.eyesightCannotBeNegative', 'Thị lực không được âm')),
          severityLevel: Yup.string()
            .optional()
            .nullable()
            .transform((value) => value || undefined)
            .oneOf(['mild', 'moderate', 'severe', 'critical'], 'Mức độ nghiêm trọng không hợp lệ'),
          severityNotes: Yup.string().optional(),
          treatmentStatus: Yup.boolean().optional().nullable(),
          activeFrom: Yup.string()
            .optional()
            .nullable()
            .transform((value) => value || undefined),
          activeTo: Yup.string()
            .optional()
            .nullable()
            .transform((value) => value || undefined),
        }),
      otherwise: (schema) => schema.optional(),
    }),
  });
};
