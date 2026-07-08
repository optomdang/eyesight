import * as Yup from 'yup';

export const exerciseSetupSchema = Yup.object({
  diagonalInch: Yup.number()
    .required('Vui lòng nhập kích thước màn hình')
    .min(10, 'Kích thước tối thiểu 10 inch')
    .max(50, 'Kích thước tối đa 50 inch'),
  screenWidth: Yup.number()
    .required('Vui lòng nhập độ phân giải ngang')
    .min(800, 'Độ phân giải ngang tối thiểu 800px')
    .max(7680, 'Độ phân giải ngang tối đa 7680px'),
  screenHeight: Yup.number()
    .required('Vui lòng nhập độ phân giải dọc')
    .min(600, 'Độ phân giải dọc tối thiểu 600px')
    .max(4320, 'Độ phân giải dọc tối đa 4320px'),
});

export type ExerciseSetupFormData = Yup.InferType<typeof exerciseSetupSchema>;
