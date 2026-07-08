import React from 'react';
import UserModal from './user-form';
import { UserType, UserFormProps } from './user-form.types';

type PatientUserFormProps = Omit<UserFormProps, 'userType'>;

const PatientUserForm: React.FC<PatientUserFormProps> = (props) => {
  return <UserModal {...props} userType={UserType.PATIENT} />;
};

export default PatientUserForm;
