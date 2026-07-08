import * as Yup from 'yup';

// Create validation schemas with i18n support
export const createValidationSchema = (t: (key: string, options?: any) => string) => {
  return {
    // Common field validations
    required: (fieldName?: string) =>
      Yup.string().required(fieldName ? `${fieldName} ${t('form.required')}` : t('form.required')),

    email: () => Yup.string().email(t('form.invalidEmail')).required(t('form.required')),

    phone: () =>
      Yup.string()
        .matches(/^[0-9+\-\s()]+$/, t('form.invalidPhone'))
        .required(t('form.required')),

    minLength: (min: number) =>
      Yup.string()
        .min(min, t('form.minLength', { count: min }))
        .required(t('form.required')),

    maxLength: (max: number) =>
      Yup.string()
        .max(max, t('form.maxLength', { count: max }))
        .required(t('form.required')),

    password: () =>
      Yup.string()
        .min(6, t('form.minLength', { count: 6 }))
        .required(t('form.required')),

    confirmPassword: () =>
      Yup.string()
        .oneOf([Yup.ref('password')], t('form.passwordMismatch'))
        .required(t('form.required')),

    number: () => Yup.number().typeError(t('form.invalidNumber')).required(t('form.required')),

    select: () => Yup.string().nullable().required(t('form.selectOption')),

    // Patient-specific validations
    patientSchema: () =>
      Yup.object({
        firstName: Yup.string().required(t('form.required')),
        lastName: Yup.string().required(t('form.required')),
        email: Yup.string().email(t('form.invalidEmail')).required(t('form.required')),
        phone: Yup.string()
          .matches(/^[0-9+\-\s()]+$/, t('form.invalidPhone'))
          .required(t('form.required')),
        dateOfBirth: Yup.date().max(new Date(), t('form.invalidDate')).required(t('form.required')),
        gender: Yup.string().required(t('form.selectOption')),
      }),

    // Exercise-specific validations
    exerciseSchema: () =>
      Yup.object({
        name: Yup.string()
          .min(2, t('form.minLength', { count: 2 }))
          .max(100, t('form.maxLength', { count: 100 }))
          .required(t('form.required')),
        description: Yup.string()
          .max(500, t('form.maxLength', { count: 500 }))
          .required(t('form.required')),
        difficulty: Yup.string().required(t('form.selectOption')),
        category: Yup.string().required(t('form.selectOption')),
      }),
  };
};
