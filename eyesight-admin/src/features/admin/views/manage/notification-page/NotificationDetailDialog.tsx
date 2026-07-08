import React from 'react';
import {
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import { Notification } from './types';
import { useTranslation } from 'src/hooks/useTranslation';

interface NotificationDetailDialogProps {
  open: boolean;
  notification: Notification | null;
  onClose: () => void;
}

const NotificationDetailDialog: React.FC<NotificationDetailDialogProps> = ({
  open,
  notification,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!notification) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('notification.detail', 'Chi tiết thông báo')}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={1.5}>
          {/* Basic Info Section */}
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <Typography component="span" variant="body2" color="text.secondary">
                {t('notification.category', 'Loại thông báo')}:
              </Typography>{' '}
              <Typography component="span" variant="body2">
                {{
                  exam: 'Khám',
                  exercise: 'Tập luyện',
                  reminder: 'Nhắc nhở',
                  system: 'Hệ thống',
                }[notification.category] || notification.category}
              </Typography>
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <Typography component="span" variant="body2" color="text.secondary">
                {t('notification.channel', 'Kênh gửi')}:
              </Typography>{' '}
              <Typography component="span" variant="body2">
                {notification.channel
                  ? {
                      email: 'Email',
                      zalo: 'Zalo',
                      sms: 'SMS',
                      web: 'Web',
                    }[notification.channel] || notification.channel
                  : '-'}
              </Typography>
            </Typography>
          </Grid>

          {/* Recipient Info */}
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <Typography component="span" variant="body2" color="text.secondary">
                {t('notification.recipient', 'Người nhận')}:
              </Typography>{' '}
              <Typography component="span" variant="body2">
                {notification.receiver?.name || '-'}
              </Typography>
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <Typography component="span" variant="body2" color="text.secondary">
                {t('notification.contact', 'Liên hệ')}:
              </Typography>{' '}
              <Typography component="span" variant="body2">
                {notification.channel === 'email'
                  ? notification.receiver?.email
                  : notification.channel === 'sms' || notification.channel === 'zalo'
                    ? notification.receiver?.phoneNumber
                    : '-'}
              </Typography>
            </Typography>
          </Grid>

          {/* Status and Time */}
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2">
              <Typography component="span" variant="body2" color="text.secondary">
                {t('notification.sentAt', 'Gửi lúc')}:
              </Typography>{' '}
              <Typography component="span" variant="body2">
                {notification.sentAt ? new Date(notification.sentAt).toLocaleString('vi-VN') : '-'}
              </Typography>
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography component="span" variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {t('notification.status.label', 'Trạng thái')}:
            </Typography>
            {notification.sent ? (
              <Chip label="Đã gửi" color="success" size="small" />
            ) : notification.errorMessage ? (
              <Chip label="Lỗi" color="error" size="small" />
            ) : (
              <Chip label="Chưa gửi" color="default" size="small" />
            )}
          </Grid>

          {/* Divider */}
          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          {/* Title */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('notification.subject', 'Tiêu đề')}:
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: 'grey.50',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" fontWeight={500}>
                {notification.title}
              </Typography>
            </Paper>
          </Grid>

          {/* Message Content */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('notification.message', 'Nội dung')}:
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {notification.message}
              </Typography>
            </Paper>
          </Grid>

          {/* Error Message if any */}
          {notification.errorMessage && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="error" fontWeight={500} sx={{ mb: 1 }}>
                {t('notification.error', 'Lỗi')}:
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: 'error.lighter',
                  borderColor: 'error.light',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="error.main">
                  {notification.errorMessage}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onClose}>
          {t('common.close', 'Đóng')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationDetailDialog;
