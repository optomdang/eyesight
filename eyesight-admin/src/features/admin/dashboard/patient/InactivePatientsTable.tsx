import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  IconPhone,
  IconMail,
  IconAlertTriangle,
  IconMessage,
  IconWorld,
  IconSend,
} from '@tabler/icons-react';
import * as NotificationService from 'src/services/notification.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import type { InactivePatient } from 'src/types/admin/dashboard';

interface InactivePatientsTableProps {
  data: InactivePatient[];
  totalCount: number;
  page: number;
  limit: number;
  loading?: boolean;
  inactiveDays: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onInactiveDaysChange: (days: number) => void;
}

const INACTIVE_DAYS_OPTIONS = [
  { value: 3, label: '3 ngày' },
  { value: 7, label: '7 ngày' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
];

const getSeverityColor = (severity: string | null) => {
  switch (severity) {
    case 'mild':
      return 'success';
    case 'moderate':
      return 'warning';
    case 'severe':
      return 'error';
    case 'critical':
      return 'error';
    default:
      return 'default';
  }
};

const getSeverityLabel = (severity: string | null) => {
  switch (severity) {
    case 'mild':
      return 'Nhẹ';
    case 'moderate':
      return 'Trung bình';
    case 'severe':
      return 'Nặng';
    case 'critical':
      return 'Nghiêm trọng';
    default:
      return 'Chưa xác định';
  }
};

const InactivePatientsTable: React.FC<InactivePatientsTableProps> = ({
  data,
  totalCount,
  page,
  limit,
  loading,
  inactiveDays,
  onPageChange,
  onLimitChange,
  onInactiveDaysChange,
}) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [notificationModal, setNotificationModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<InactivePatient | null>(null);
  const [notificationChannel, setNotificationChannel] = useState<'web' | 'zalo'>('web');
  const [notificationContent, setNotificationContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleChangePage = (_event: unknown, newPage: number) => {
    onPageChange(newPage + 1); // MUI uses 0-indexed, we use 1-indexed
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLimitChange(parseInt(event.target.value, 10));
    onPageChange(1);
  };

  const handleNavigateToPatient = (patientId: number) => {
    navigate(`/admin/patients/${patientId}`);
  };

  const handleOpenNotificationModal = (patient: InactivePatient, channel: 'web' | 'zalo') => {
    setSelectedPatient(patient);
    setNotificationChannel(channel);
    setNotificationContent(
      `Xin chào ${patient.user.name}, chúng tôi nhận thấy bạn đã không hoạt động trong ${patient.daysInactive} ngày. Vui lòng kiểm tra lịch khám và bài tập của bạn.`,
    );
    setNotificationModal(true);
  };

  const handleCloseNotificationModal = () => {
    setNotificationModal(false);
    setSelectedPatient(null);
    setNotificationContent('');
  };

  const handleSendNotification = async () => {
    if (!selectedPatient || !notificationContent.trim()) {
      showSnackbar('Vui lòng nhập nội dung thông báo', 'warning');
      return;
    }

    try {
      setSending(true);
      await NotificationService.sendManualNotification({
        patientId: Number(selectedPatient.id),
        channel: notificationChannel,
        subject: 'Nhắc nhở hoạt động',
        content: notificationContent,
      });
      showSnackbar(
        `Gửi thông báo ${notificationChannel === 'web' ? 'web' : 'Zalo'} thành công`,
        'success',
      );
      handleCloseNotificationModal();
    } catch (error: any) {
      showSnackbar(error?.message || 'Gửi thông báo thất bại', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Bệnh Nhân Không Hoạt Động
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Danh sách bệnh nhân cần theo dõi và liên hệ
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Không hoạt động</InputLabel>
            <Select
              value={inactiveDays}
              label="Không hoạt động"
              onChange={(e) => onInactiveDaysChange(Number(e.target.value))}
            >
              {INACTIVE_DAYS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: 'primary.lighter' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã BN</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên Bệnh Nhân</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mức độ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lần cuối đăng nhập</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Số ngày</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không có bệnh nhân nào không hoạt động
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((patient) => (
                  <TableRow
                    key={patient.id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(patient.daysInactive && patient.daysInactive > 30
                        ? { bgcolor: 'error.lighter' }
                        : {}),
                    }}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'primary.main',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={() => handleNavigateToPatient(patient.id)}
                      >
                        {patient.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'primary.main',
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                          onClick={() => handleNavigateToPatient(patient.id)}
                        >
                          {patient.user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {patient.user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getSeverityLabel(patient.severityLevel)}
                        color={getSeverityColor(patient.severityLevel)}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {patient.user.lastLoginAt ? (
                        <Typography variant="caption">
                          {new Date(patient.user.lastLoginAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      ) : (
                        <Chip label="Chưa từng" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {patient.daysInactive !== null ? (
                          <>
                            {patient.daysInactive > 30 && (
                              <IconAlertTriangle size={16} color="#d32f2f" />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: patient.daysInactive > 30 ? 'error.main' : 'text.primary',
                              }}
                            >
                              {patient.daysInactive} ngày
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Tooltip title="Gửi thông báo Web">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenNotificationModal(patient, 'web')}
                          >
                            <IconWorld size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Gửi thông báo Zalo">
                          <IconButton
                            size="small"
                            sx={{ color: '#0084FF' }}
                            onClick={() => handleOpenNotificationModal(patient, 'zalo')}
                          >
                            <IconMessage size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={`Gọi: ${patient.user.phoneNumber}`}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => window.open(`tel:${patient.user.phoneNumber}`)}
                          >
                            <IconPhone size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={`Email: ${patient.user.email}`}>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => window.open(`mailto:${patient.user.email}`)}
                          >
                            <IconMail size={18} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {data.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={limit}
            page={page - 1} // MUI uses 0-indexed
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Số dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
          />
        )}
      </CardContent>

      {/* Quick Notification Modal */}
      <Dialog
        open={notificationModal}
        onClose={handleCloseNotificationModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Gửi thông báo {notificationChannel === 'web' ? 'Web' : 'Zalo'}</DialogTitle>
        <DialogContent dividers>
          {selectedPatient && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Bệnh nhân
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {selectedPatient.code} - {selectedPatient.user.name}
              </Typography>
            </Box>
          )}
          <TextField
            label="Nội dung thông báo"
            multiline
            rows={6}
            fullWidth
            value={notificationContent}
            onChange={(e) => setNotificationContent(e.target.value)}
            placeholder="Nhập nội dung thông báo..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotificationModal} disabled={sending}>
            Hủy
          </Button>
          <Button
            variant="contained"
            startIcon={<IconSend size={18} />}
            onClick={handleSendNotification}
            disabled={sending || !notificationContent.trim()}
          >
            {sending ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default InactivePatientsTable;
