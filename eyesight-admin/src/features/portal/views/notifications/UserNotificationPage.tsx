import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  IconButton,
  Button,
  Pagination,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import {
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteUserNotificationById,
  getTypeColor,
  getPriorityColor,
  formatRelativeTime,
} from 'src/services/notification.service';
import type { UserNotification } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { useConfirm } from 'src/hooks/useConfirm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface NotificationListProps {
  notifications: UserNotification[];
  loading: boolean;
  page: number;
  totalPages: number;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onPageChange: (_event: React.ChangeEvent<unknown>, page: number) => void;
  emptyMessage: string;
  showUnreadOnly?: boolean;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  loading,
  page,
  totalPages,
  onMarkAsRead,
  onDelete,
  onPageChange,
  emptyMessage,
  showUnreadOnly = false,
}) => {
  return (
    <>
      <LoadingBoundary loading={loading} height="200px">
        {notifications.length > 0 ? (
          <>
            <List>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor:
                      showUnreadOnly || notification.isRead ? 'action.hover' : 'action.hover',
                    cursor: notification.actionUrl ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                  onClick={() => {
                    if (!notification.isRead && !showUnreadOnly) {
                      onMarkAsRead(notification.id);
                    }
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: getTypeColor(notification.type) + '.light',
                        color: getTypeColor(notification.type) + '.main',
                      }}
                    >
                      {notification.avatar}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={!showUnreadOnly && notification.isRead ? 400 : 600}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={notification.category}
                          color={getPriorityColor(notification.priority)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatRelativeTime(notification.sentAt || '')}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box display="flex" flexDirection="column" gap={1}>
                    {!notification.isRead && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <MarkEmailReadIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={onPageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        ) : (
          <Box textAlign="center" py={4}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              {emptyMessage}
            </Typography>
          </Box>
        )}
      </LoadingBoundary>
    </>
  );
};

const UserNotificationPage: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tabValue, setTabValue] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (pageNum: number = 1, isRead?: boolean) => {
    try {
      setLoading(true);
      const response = await getUserNotifications({
        page: pageNum,
        limit: 10,
        isRead,
        channel: 'web', // Portal only shows web notifications
      });

      setNotifications(response.rows);
      setTotalPages(response.totalPages);
      setPage(pageNum);

      // Count unread notifications
      const unreadResponse = await getUserNotifications({
        page: 1,
        limit: 100,
        isRead: false,
        channel: 'web',
      });
      setUnreadCount(unreadResponse.count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(1, tabValue === 1 ? false : undefined);
  }, [tabValue]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      const confirmed = await confirm({
        title: t('common.confirmDeleteTitle', 'Xác nhận xóa'),
        message: t('common.confirmDelete', 'Bạn có chắc chắn muốn xóa?'),
        confirmText: t('common.delete', 'Xóa'),
        cancelText: t('common.cancel', 'Hủy'),
        confirmColor: 'error',
      });

      if (!confirmed) return;

      await deleteUserNotificationById(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    loadNotifications(value, tabValue === 1 ? false : undefined);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <PageContainer
      title={t('userNotification.title')}
      description={t('userNotification.description')}
    >
      <Card>
        <CardContent>
          {/* Page Header */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              {t('userNotification.myNotifications')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MarkEmailReadIcon />}
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                {t('userNotification.markAllRead')}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => loadNotifications(page, tabValue === 1 ? false : undefined)}
              >
                {t('common.refresh')}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label={t('userNotification.all')} />
              <Tab
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {t('userNotification.unread')}
                    {unreadCount > 0 && <Chip size="small" label={unreadCount} color="primary" />}
                  </Box>
                }
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <NotificationList
              notifications={notifications}
              loading={loading}
              page={page}
              totalPages={totalPages}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              onPageChange={handlePageChange}
              emptyMessage={t('userNotification.noNotifications')}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <NotificationList
              notifications={notifications}
              loading={loading}
              page={page}
              totalPages={totalPages}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              onPageChange={handlePageChange}
              emptyMessage={t('userNotification.noUnreadNotifications')}
              showUnreadOnly
            />
          </TabPanel>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default UserNotificationPage;
