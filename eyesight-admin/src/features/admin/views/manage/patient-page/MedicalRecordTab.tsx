import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import ReactQuill from 'react-quill-new';
import { ZaloChatAdornment } from 'src/components/shared/ZaloChatAdornment';
import 'react-quill-new/dist/quill.snow.css';
import { v4 as uuidv4 } from 'uuid';

import type { Patient, MedicalImage, UpdateMedicalRecordDto } from 'src/types/core/patient';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import * as PatientService from 'src/services/patient.service';
import { formatAddress } from 'src/utils';
import { MedicalRecordFormData, medicalRecordSchema } from 'src/validations/schemas/medicalRecord';
import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from 'src/utils/errorHandler';
import { CAUSES } from 'src/constants/causes';

interface MedicalRecordTabProps {
  patient: Patient;
  onPatientUpdated?: (patient: Patient) => void;
}

const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
const MAX_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const MedicalRecordTab: React.FC<MedicalRecordTabProps> = ({ patient, onPatientUpdated }) => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<MedicalImage[]>(patient.medicalImages || []);
  const [currentPatient, setCurrentPatient] = useState<Patient>(patient);
  const [selectedCauses, setSelectedCauses] = useState<string[]>(patient.causes || []);

  // Decode HTML entities helper
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const [editorContent, setEditorContent] = useState(decodeHtml(patient.medicalHistory || ''));
  const [editorKey, setEditorKey] = useState(0); // Key to force remount
  const [viewImageDialog, setViewImageDialog] = useState<{
    open: boolean;
    image: MedicalImage | null;
  }>({
    open: false,
    image: null,
  });

  // Reload patient data from API
  const reloadPatientData = async () => {
    try {
      const updatedPatient = await PatientService.getPatient(patient.id);
      setCurrentPatient(updatedPatient);
      setImages(updatedPatient.medicalImages || []);
      // Decode HTML entities from backend
      setEditorContent(decodeHtml(updatedPatient.medicalHistory || ''));

      setValue('additionalNotes', updatedPatient.additionalNotes || '');
      setSelectedCauses(updatedPatient.causes || []);

      onPatientUpdated?.(updatedPatient);

      // Force ReactQuill remount with new data
      setEditorKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to reload patient data:', error);
    }
  };

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MedicalRecordFormData>({
    resolver: yupResolver(medicalRecordSchema),
    defaultValues: {
      medicalHistory: currentPatient.medicalHistory || '',
      additionalNotes: currentPatient.additionalNotes || '',
    },
  });

  useEffect(() => {
    setCurrentPatient(patient);
    setSelectedCauses(patient.causes || []);
    setImages(patient.medicalImages || []);
    setEditorContent(decodeHtml(patient.medicalHistory || ''));
    setValue('additionalNotes', patient.additionalNotes || '');
  }, [patient, setValue]);

  const onSubmit = async (values: MedicalRecordFormData) => {
    try {
      setLoading(true);

      const payload: UpdateMedicalRecordDto = {
        medicalHistory: editorContent,
        additionalNotes: values.additionalNotes,
        medicalImages: images,
        causes: selectedCauses,
      };

      await PatientService.updatePatientMedicalRecord(patient.id, payload);

      showSnackbar('Cập nhật bệnh án thành công', SNACKBAR_SEVERITY.SUCCESS);

      // Reload patient data after successful update
      await reloadPatientData();
    } catch (error) {
      showSnackbar(getErrorMessage(error, 'Cập nhật bệnh án thất bại'), SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showSnackbar('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)', SNACKBAR_SEVERITY.ERROR);
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      showSnackbar('Kích thước ảnh phải nhỏ hơn 1MB', SNACKBAR_SEVERITY.ERROR);
      return;
    }

    // Validate max images
    if (images.length >= MAX_IMAGES) {
      showSnackbar(`Chỉ được upload tối đa ${MAX_IMAGES} ảnh`, SNACKBAR_SEVERITY.ERROR);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;

      const newImage: MedicalImage = {
        id: uuidv4(),
        data: base64Data,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      setImages([...images, newImage]);
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

  // Handle image delete
  const handleImageDelete = (imageId: string) => {
    setImages(images.filter((img) => img.id !== imageId));
  };

  const handleViewImage = (image: MedicalImage) => {
    setViewImageDialog({ open: true, image });
  };

  const handleDownloadImage = (image: MedicalImage) => {
    const link = document.createElement('a');
    link.href = image.data;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseImageDialog = () => {
    setViewImageDialog({ open: false, image: null });
  };

  return (
    <Box sx={{ p: 1 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Section 1: Thông tin cá nhân (Readonly) */}
          <Grid size={12}>
            <Typography variant="h6" gutterBottom>
              1. THÔNG TIN CÁ NHÂN
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Tên bệnh nhân"
                  value={currentPatient.user?.name || currentPatient.name || ''}
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  value={currentPatient.user?.email || ''}
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Mã bệnh nhân"
                  value={currentPatient.code || ''}
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Ngày sinh"
                  value={
                    currentPatient.user?.dateOfBirth
                      ? new Date(currentPatient.user.dateOfBirth).toLocaleDateString('vi-VN')
                      : ''
                  }
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Giới tính"
                  value={
                    currentPatient.user?.gender === 'male'
                      ? 'Nam'
                      : currentPatient.user?.gender === 'female'
                        ? 'Nữ'
                        : currentPatient.user?.gender === 'other'
                          ? 'Khác'
                          : ''
                  }
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Số điện thoại"
                  value={currentPatient.user?.phoneNumber || ''}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <ZaloChatAdornment phone={currentPatient.user?.phoneNumber} />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Số điện thoại Zalo"
                  value={currentPatient.user?.zaloPhoneNumber || ''}
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Quốc gia"
                  value={
                    typeof currentPatient.user?.address === 'object'
                      ? currentPatient.user?.address?.country || ''
                      : ''
                  }
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Tỉnh/Thành phố"
                  value={
                    typeof currentPatient.user?.address === 'object'
                      ? currentPatient.user?.address?.province || ''
                      : ''
                  }
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Phường/Xã"
                  value={
                    typeof currentPatient.user?.address === 'object'
                      ? currentPatient.user?.address?.ward || ''
                      : ''
                  }
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Địa chỉ chi tiết"
                  value={
                    typeof currentPatient.user?.address === 'object'
                      ? currentPatient.user?.address?.specificAddress || ''
                      : typeof currentPatient.user?.address === 'string'
                        ? currentPatient.user?.address
                        : ''
                  }
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Section 2: Bệnh sử (Rich Text Editor) */}
          <Grid size={12}>
            <Typography variant="h6" gutterBottom>
              2. BỆNH SỬ
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ minHeight: 300, '& .quill': { height: 300 } }}>
              <ReactQuill
                key={`quill-${editorKey}-${currentPatient.id}`}
                theme="snow"
                value={editorContent}
                onChange={setEditorContent}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ color: [] }, { background: [] }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    [{ align: [] }],
                    ['link', 'image'],
                    ['blockquote', 'code-block'],
                    ['clean'],
                  ],
                }}
                formats={[
                  'header',
                  'bold',
                  'italic',
                  'underline',
                  'strike',
                  'color',
                  'background',
                  'list',
                  'align',
                  'link',
                  'image',
                  'blockquote',
                  'code-block',
                ]}
                placeholder="Nhập bệnh sử của bệnh nhân..."
                style={{ height: '250px', marginBottom: '50px' }}
              />
            </Box>

            {errors.medicalHistory && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors.medicalHistory.message}
              </Alert>
            )}
          </Grid>

          {/* Section 2B: Nguyên nhân gây nhược thị */}
          <Grid size={12}>
            <Box
              sx={{
                border: '2px solid',
                borderColor: 'warning.main',
                borderRadius: 1,
                p: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase' }}
              >
                Nguyên nhân gây nhược thị
              </Typography>
              <Typography variant="caption" sx={{ color: 'warning.main', fontStyle: 'italic', display: 'block', mb: 1 }}>
                (Bắt buộc phải hoàn thiện)
              </Typography>
              <FormGroup row sx={{ gap: 1 }}>
                {CAUSES.map((cause) => (
                  <FormControlLabel
                    key={cause.code}
                    control={
                      <Checkbox
                        checked={selectedCauses.includes(cause.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCauses([...selectedCauses, cause.code]);
                          } else {
                            setSelectedCauses(selectedCauses.filter((c) => c !== cause.code));
                          }
                        }}
                        sx={{ color: 'warning.main', '&.Mui-checked': { color: 'warning.main' } }}
                      />
                    }
                    label={cause.label}
                  />
                ))}
              </FormGroup>
            </Box>
          </Grid>

          {/* Section 3: Thông tin khác + Upload ảnh */}
          <Grid size={12}>
            <Typography variant="h6" gutterBottom>
              3. THÔNG TIN KHÁC
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Ô nhập text */}
            <Controller
              name="additionalNotes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={4}
                  label="Ghi chú thêm"
                  error={!!errors.additionalNotes}
                  helperText={errors.additionalNotes?.message}
                  variant="outlined"
                  sx={{ mb: 3 }}
                />
              )}
            />

            {/* Upload ảnh */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1">Ảnh bệnh án</Typography>
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<UploadIcon />}
                  disabled={images.length >= MAX_IMAGES}
                >
                  Upload ảnh
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  ({images.length}/{MAX_IMAGES} ảnh, tối đa 1MB/ảnh)
                </Typography>
              </Box>

              {images.length > 0 && (
                <ImageList cols={5} gap={10} sx={{ maxHeight: 300 }}>
                  {images.map((img) => (
                    <ImageListItem key={img.id}>
                      <img
                        src={img.data}
                        alt={img.filename}
                        loading="lazy"
                        style={{ height: 130, objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => handleViewImage(img)}
                      />
                      <ImageListItemBar
                        title={img.filename}
                        subtitle={`${(img.size / 1024).toFixed(1)} KB`}
                        actionIcon={
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                              onClick={() => handleViewImage(img)}
                              title="Xem ảnh"
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                              onClick={() => handleDownloadImage(img)}
                              title="Tải xuống"
                            >
                              <DownloadIcon />
                            </IconButton>
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                              onClick={() => handleImageDelete(img.id)}
                              title="Xóa"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              )}
            </Box>
          </Grid>

          {/* Action buttons */}
          <Grid size={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                type="submit"
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} />}
              >
                {loading ? 'Đang lưu...' : 'Lưu bệnh án'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Image View Dialog */}
      <Dialog open={viewImageDialog.open} onClose={handleCloseImageDialog} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: 'black' }}>
          {viewImageDialog.image && (
            <img
              src={viewImageDialog.image.data}
              alt={viewImageDialog.image.filename}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => viewImageDialog.image && handleDownloadImage(viewImageDialog.image)}
            startIcon={<DownloadIcon />}
          >
            Tải xuống
          </Button>
          <Button onClick={handleCloseImageDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicalRecordTab;
