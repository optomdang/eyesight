import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Menu, Avatar, Typography, Divider, Button, IconButton, Stack } from '@mui/material';

import { IconMail, IconUser, IconPhone } from '@tabler/icons-react';

import useAuth from 'src/contexts/authGuard/useAuth';
import { useTranslation } from 'src/hooks/useTranslation';

const Profile = () => {
  const { logout, user } = useAuth(); // Get user info from auth context
  const { t } = useTranslation();
  const [anchorEl2, setAnchorEl2] = useState(null);
  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleLogout = () => {
    logout();
  };

  // Generate avatar from user name
  const getAvatarText = (name: string) => {
    return (
      name
        ?.split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    );
  };

  // Get user role display text
  const getRoleDisplayText = (userType: string) => {
    switch (userType) {
      case 'admin':
        return t('profile.admin');
      case 'doctor':
        return t('profile.doctor');
      case 'patient':
        return t('profile.patient');
      default:
        return t('profile.user');
    }
  };

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="show 11 new notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === 'object' && {
            color: 'primary.main',
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar
          src={user?.avatar || undefined}
          sx={{
            width: 35,
            height: 35,
            bgcolor: user?.name ? 'primary.main' : 'grey.500',
            color: 'white',
            fontWeight: 600,
          }}
        >
          {user?.name ? getAvatarText(user.name) : 'U'}
        </Avatar>
      </IconButton>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
            p: 4,
          },
        }}
      >
        <Typography variant="h5">{t('profile.userProfile')}</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <Avatar
            src={user?.avatar || undefined}
            sx={{
              width: 50,
              height: 50,
              bgcolor: user?.name ? 'primary.main' : 'grey.500',
              color: 'white',
              fontWeight: 600,
              fontSize: '1.2rem',
            }}
          >
            {user?.name ? getAvatarText(user.name) : 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="600">
              {user?.name || t('profile.user')}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              {user?.userType ? getRoleDisplayText(user.userType) : t('profile.unknown')}
            </Typography>
            <Box>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                display="flex"
                alignItems="center"
                gap={1}
                sx={{ mb: 0.5 }}
              >
                <IconMail width={15} height={15} />
                {user?.email || t('profile.noEmail')}
              </Typography>
              {user?.phoneNumber && (
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <IconPhone width={15} height={15} />
                  {user.phoneNumber}
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>
        <Divider />
        {/* Custom profile menu items based on user role */}
        <Box sx={{ py: 2, px: 0 }} className="hover-text-primary">
          <Link to={user?.userType === 'patient' ? '/portal/profile' : '/admin/users'}>
            <Stack direction="row" spacing={2}>
              <Box
                width="45px"
                height="45px"
                bgcolor="primary.light"
                display="flex"
                alignItems="center"
                justifyContent="center"
                sx={{ borderRadius: 1 }}
              >
                <IconUser size={24} />
              </Box>
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  color="textPrimary"
                  className="text-hover"
                  noWrap
                  sx={{ width: '240px' }}
                >
                  {user?.userType === 'patient'
                    ? t('profile.medicalHistory')
                    : t('profile.manageProfile')}
                </Typography>
                <Typography
                  color="textSecondary"
                  variant="subtitle2"
                  sx={{ width: '240px' }}
                  noWrap
                >
                  {user?.userType === 'patient'
                    ? t('profile.viewResults')
                    : t('profile.systemSettings')}
                </Typography>
              </Box>
            </Stack>
          </Link>
        </Box>
        <Box mt={2}>
          <Button onClick={handleLogout} variant="outlined" color="primary" fullWidth>
            {t('common.logout')}
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
