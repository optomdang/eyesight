import React from 'react';
import { Box, Typography } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import PageContainer from 'src/components/container/PageContainer';
import useAuth from 'src/contexts/authGuard/useAuth';
import ProfileEditForm from './forms/ProfileEditForm';

const PatientProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <PageContainer title="Hồ sơ cá nhân" description="Quản lý thông tin cá nhân">
      <LoadingBoundary loading={!user} height="400px">
        <Box>
          {/* Page Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Hồ sơ cá nhân
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quản lý và cập nhật thông tin cá nhân của bạn
            </Typography>
          </Box>

          {/* Personal Information */}
          <ProfileEditForm user={user} />
        </Box>
      </LoadingBoundary>
    </PageContainer>
  );
};

export default PatientProfilePage;
