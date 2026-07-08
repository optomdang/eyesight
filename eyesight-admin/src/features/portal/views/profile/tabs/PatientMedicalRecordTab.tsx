import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Alert,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Paper,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import useAuth from 'src/contexts/authGuard/useAuth';
import { getMyPatientInfo } from 'src/services/patient.service';
import { formatAddress } from 'src/utils';
import type { Patient, MedicalImage } from 'src/types/core/patient';

const PatientMedicalRecordTab: React.FC = () => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewImageDialog, setViewImageDialog] = useState<{
    open: boolean;
    image: MedicalImage | null;
  }>({
    open: false,
    image: null,
  });

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setLoading(true);
        // Get current user's patient info via service
        const patientData = await getMyPatientInfo();
        setPatient(patientData);
      } catch (error) {
        console.error('Failed to load patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, []);

  const handleViewImage = (image: MedicalImage) => {
    setViewImageDialog({ open: true, image });
  };

  const handleCloseImageDialog = () => {
    setViewImageDialog({ open: false, image: null });
  };

  return (
    <LoadingBoundary loading={loading} height="300px">
      {!patient ? (
        <Alert severity="warning">Không tìm thấy thông tin bệnh nhân</Alert>
      ) : (
        <Box>
          <Grid container spacing={3}>
            {/* Thông tin bệnh nhân */}
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    THÔNG TIN BỆNH NHÂN
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Họ và tên:</strong> {user?.name || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Mã bệnh nhân:</strong> {patient.code || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Ngày sinh:</strong> {user?.dateOfBirth || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Giới tính:</strong>{' '}
                        {user?.gender === 'male'
                          ? 'Nam'
                          : user?.gender === 'female'
                            ? 'Nữ'
                            : 'Khác'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Số điện thoại:</strong> {user?.phoneNumber || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Email:</strong> {user?.email || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={12}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Địa chỉ:</strong>{' '}
                        {typeof user?.address === 'object'
                          ? formatAddress(user.address)
                          : user?.address || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Bệnh sử */}
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    BỆNH SỬ
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {patient.medicalHistory ? (
                    <Box
                      sx={{
                        '& img': { maxWidth: '100%', height: 'auto' },
                        '& p': { marginBottom: 1 },
                      }}
                      dangerouslySetInnerHTML={{ __html: patient.medicalHistory }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có thông tin bệnh sử
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Ghi chú bổ sung */}
            {patient.additionalNotes && (
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      GHI CHÚ BỔ SUNG
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {patient.additionalNotes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Hình ảnh y tế */}
            {patient.medicalImages && patient.medicalImages.length > 0 && (
              <Grid size={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      HÌNH ẢNH Y TẾ ({patient.medicalImages.length})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ImageList cols={3} gap={16}>
                      {patient.medicalImages.map((image) => (
                        <ImageListItem key={image.id}>
                          <Paper
                            elevation={2}
                            sx={{
                              overflow: 'hidden',
                              cursor: 'pointer',
                              '&:hover': { opacity: 0.9 },
                            }}
                            onClick={() => handleViewImage(image)}
                          >
                            <img
                              src={image.imageData}
                              alt={image.caption || 'Medical image'}
                              loading="lazy"
                              style={{
                                width: '100%',
                                height: '200px',
                                objectFit: 'cover',
                              }}
                            />
                            <ImageListItemBar
                              title={image.caption || 'Hình ảnh y tế'}
                              actionIcon={
                                <IconButton
                                  sx={{ color: 'white' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewImage(image);
                                  }}
                                >
                                  <ViewIcon />
                                </IconButton>
                              }
                            />
                          </Paper>
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Thông tin bổ sung */}
            <Grid size={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Lưu ý:</strong> Thông tin bệnh án chỉ được xem, không thể chỉnh sửa. Vui
                  lòng liên hệ bác sĩ nếu cần cập nhật thông tin.
                </Typography>
              </Alert>
            </Grid>
          </Grid>

          {/* Image View Dialog */}
          <Dialog
            open={viewImageDialog.open}
            onClose={handleCloseImageDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogContent>
              {viewImageDialog.image && (
                <Box>
                  <img
                    src={viewImageDialog.image.imageData}
                    alt={viewImageDialog.image.caption || 'Medical image'}
                    style={{ width: '100%', height: 'auto' }}
                  />
                  {viewImageDialog.image.caption && (
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      {viewImageDialog.image.caption}
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseImageDialog}>Đóng</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </LoadingBoundary>
  );
};

export default PatientMedicalRecordTab;
