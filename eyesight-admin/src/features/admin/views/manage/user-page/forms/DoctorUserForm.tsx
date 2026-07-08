import React from 'react';
import UserModal from './user-form';
import { UserType, UserFormProps } from './user-form.types';

type DoctorUserFormProps = Omit<UserFormProps, 'userType'>;

const DoctorUserForm: React.FC<DoctorUserFormProps> = (props) => {
  return <UserModal {...props} userType={UserType.DOCTOR} />;
};

export default DoctorUserForm;
