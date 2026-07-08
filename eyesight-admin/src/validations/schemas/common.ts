import * as Yup from 'yup';
import { messages } from '../messages';

// Common validators
export const email = Yup.string().email(messages.email).required(messages.required('Email'));

export const phone = Yup.string()
  .matches(/^[0-9]{10,11}$/, messages.phone)
  .nullable();

export const code = (field: string) =>
  Yup.string()
    .min(3, messages.minLength(field, 3))
    .max(50, messages.maxLength(field, 50))
    .required(messages.required(field));

export const name = (field: string) =>
  Yup.string()
    .min(2, messages.minLength(field, 2))
    .max(255, messages.maxLength(field, 255))
    .required(messages.required(field));

export const positiveNumber = (field: string) =>
  Yup.number().positive(messages.positive(field)).required(messages.required(field));

export const positiveInteger = (field: string) =>
  Yup.number()
    .integer(messages.integer(field))
    .positive(messages.positive(field))
    .required(messages.required(field));

export const optionalString = Yup.string().nullable();

export const optionalNumber = Yup.number().nullable();
