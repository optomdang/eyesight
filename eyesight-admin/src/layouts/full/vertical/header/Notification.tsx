import React, { useState } from 'react';
import {
  IconButton,
  Box,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { getTypeColor, formatRelativeTime } from 'src/services/notification.service';

import { IconBellRinging } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { UserNotification } from 'src/types/core';
import { useNotifications } from 'src/contexts/NotificationContext';

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markNotificationRead,
    loadNotifications,
    registerPush,
  } = useNotifications();
  const [anchorEl2, setAnchorEl2] = useState(null);

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
    // Load full notification list when user opens the menu (on-demand)
    void loadNotifications();
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  // Xử lý khi click vào thông báo
  const handleNotificationClick = async (notification: UserNotification) => {
    try {
      // Đánh dấu đã đọc
      if (!notification.isRead) {
        await markNotificationRead(notification.id);
      }

      // Chuyển hướng nếu có actionUrl
      if (notification.actionUrl) {
        // Có thể sử dụng navigate hoặc window.location
        window.location.href = notification.actionUrl;
      }

      // Đóng menu
      handleClose2();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  return (
    <Box>
      <IconButton
        size="large"
        aria-label={`show ${unreadCount} new notifications`}
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          color: anchorEl2 ? 'primary.main' : 'text.secondary',
        }}
        onClick={handleClick2}
      >
        <Badge
          badgeContent={unreadCount > 0 ? unreadCount : undefined}
          color="primary"
          variant={unreadCount > 0 ? 'standard' : 'dot'}
        >
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
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
          },
        }}
      >
        <Stack direction="row" py={2} px={4} justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Thông báo</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {typeof Notification !== 'undefined' && Notification.permission !== 'granted' ? (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  await registerPush();
                }}
              >
                Bật thông báo
              </Button>
            ) : null}
            {unreadCount > 0 && <Chip label={`${unreadCount} mới`} color="primary" size="small" />}
          </Stack>
        </Stack>

        <Scrollbar sx={{ height: '385px' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <Box key={notification.id}>
                <MenuItem
                  sx={{
                    py: 2,
                    px: 4,
                    backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: getTypeColor(notification.type) + '.light',
                        color: getTypeColor(notification.type) + '.main',
                      }}
                    >
                      {notification.avatar}
                    </Avatar>
                    <Box flex={1}>
                      <Typography
                        variant="subtitle2"
                        color="textPrimary"
                        fontWeight={notification.isRead ? 400 : 600}
                        sx={{
                          width: '240px',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Typography
                        color="textSecondary"
                        variant="body2"
                        sx={{
                          width: '240px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography color="textSecondary" variant="caption" sx={{ mt: 0.5 }}>
                        {formatRelativeTime(notification.sentAt)}
                      </Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              </Box>
            ))
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <Typography color="textSecondary" variant="body2">
                Không có thông báo mới
              </Typography>
            </Box>
          )}
        </Scrollbar>

        <Box p={3} pb={1}>
          <Button
            to="/portal/notifications"
            variant="outlined"
            component={Link}
            color="primary"
            fullWidth
          >
            Xem tất cả thông báo
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Notifications;
