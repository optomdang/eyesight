import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import { AuditLog } from 'src/types/core';
import { getAuditActionLabel } from './actionLabels';

interface AuditLogDetailDialogProps {
  open: boolean;
  auditLog: AuditLog | null;
  onClose: () => void;
}

const formatJson = (value: Record<string, unknown> | null | undefined) => {
  if (!value || Object.keys(value).length === 0) {
    return null;
  }

  return JSON.stringify(value, null, 2);
};

const AuditLogDetailDialog = ({ open, auditLog, onClose }: AuditLogDetailDialogProps) => {
  const { t, currentLanguage } = useTranslation();

  if (!auditLog) {
    return null;
  }

  const formattedMetadata = formatJson(auditLog.metadata ?? null);
  const actionLabel = getAuditActionLabel(auditLog.action, t);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('auditLog.detail', 'Chi tiết audit log')}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {t('auditLog.actorInfo', 'Thông tin người thực hiện')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">
                  <strong>{t('auditLog.actor', 'Người thực hiện')}:</strong>{' '}
                  {auditLog.actorUser?.name ||
                    auditLog.actorUser?.email ||
                    auditLog.actorUserId ||
                    t('auditLog.emptyActor', 'Không có thông tin người thực hiện')}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.actorType', 'Loại người dùng')}:</strong>{' '}
                  {auditLog.actorUserType || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.email', 'Email')}:</strong>{' '}
                  {auditLog.actorUser?.email || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.id', 'ID')}:</strong> {auditLog.actorUserId || '-'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {t('auditLog.requestInfo', 'Thông tin request')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">
                  <strong>{t('auditLog.method', 'Phương thức')}:</strong>{' '}
                  {auditLog.requestMethod || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.path', 'Đường dẫn')}:</strong> {auditLog.requestPath || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.ipAddress', 'Địa chỉ IP')}:</strong>{' '}
                  {auditLog.ipAddress || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.occurredAt', 'Thời điểm')}:</strong>{' '}
                  {new Date(auditLog.occurredAt).toLocaleString(
                    currentLanguage === 'en' ? 'en-US' : 'vi-VN'
                  )}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {t('auditLog.metadata', 'Metadata')}
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'background.default',
                maxHeight: 320,
                overflow: 'auto',
              }}
            >
              {formattedMetadata ? (
                <Typography
                  component="pre"
                  variant="body2"
                  sx={{ m: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                >
                  {formattedMetadata}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('auditLog.emptyMetadata', 'Không có metadata')}
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {t('auditLog.entity', 'Đối tượng')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="body2">
                  <strong>{t('auditLog.action', 'Hành động')}:</strong> {actionLabel}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.actionCode', 'Mã action')}:</strong> {auditLog.action}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.entityType', 'Loại đối tượng')}:</strong>{' '}
                  {auditLog.entityType || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('auditLog.entityId', 'ID đối tượng')}:</strong>{' '}
                  {auditLog.entityId || '-'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" size="small" onClick={onClose}>
          {t('common.close', 'Đóng')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuditLogDetailDialog;
