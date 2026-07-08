import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  IconButton,
  Chip,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Autocomplete,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Close, Search, Refresh } from '@mui/icons-material';
import { useTranslation } from 'src/hooks/useTranslation';
import type { ExerciseConfig, NotificationTemplate } from 'src/types/core';
import useSnackbar from 'src/contexts/UseSnackbar';
import {
  SNACKBAR_SEVERITY,
  farVisionLevels,
  nearVisionLevels,
  contrastVisionLevels,
  stereopsisLevels,
} from 'src/utils/constant';
import assignmentService from 'src/services/assignment.service';
import * as PatientService from 'src/services/patient.service';
import * as NotificationService from 'src/services/notification.service';

interface BulkAssignModalProps {
  open: boolean;
  onClose: () => void;
  config: ExerciseConfig | null;
  onSuccess: () => void;
}

// Local type for patient in bulk assign - more specific than core Patient
interface BulkAssignPatient {
  id: number;
  code: string;
  user: {
    name: string;
    birthDate?: string;
  };
  createdAt?: string;
}

interface ExistingAssignment {
  id: number;
  patientId: number;
  status?: string;
}

const BulkAssignModal: React.FC<BulkAssignModalProps> = ({ open, onClose, config, onSuccess }) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();

  const [patients, setPatients] = useState<BulkAssignPatient[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<
    Record<number, ExistingAssignment>
  >({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [visionLevel, setVisionLevel] = useState<number>(20);
  const [levelOverride, setLevelOverride] = useState<boolean>(false);

  // Helper function to calculate age
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await NotificationService.getNotificationTemplates({
          category: 'exercise',
          isActive: true,
        });
        setTemplates(response.rows || []);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSelectedTemplateId(null);
      setLevelOverride(false);
      // Set default vision level based on config's visionType
      if (config?.levelOverride && config.visionLevel != null) {
        setLevelOverride(true);
        setVisionLevel(config.visionLevel);
      } else if (config?.visionType === 'far') {
        setVisionLevel(14); // 20/20
      } else if (config?.visionType === 'near') {
        setVisionLevel(3); // N24
      } else if (config?.visionType === 'contrast') {
        setVisionLevel(10); // ~4.47%
      } else if (config?.visionType === 'stereopsis') {
        setVisionLevel(5); // Lv 5
      } else {
        setVisionLevel(20); // Default
      }

      void initializeModalData();
    }
  }, [open, config]);

  const initializeModalData = async () => {
    setPatientsLoading(true);
    try {
      const [patientsResponse, assignedResponse] = await Promise.all([
        PatientService.getPatients({ limit: 1000 }),
        config?.id
          ? assignmentService.getConfigAssignments(config.id, { limit: 1000 })
          : Promise.resolve({ rows: [] }),
      ]);

      setPatients(patientsResponse.rows || []);

      const assignedRows = (assignedResponse.rows || []) as ExistingAssignment[];
      const assignedMap = assignedRows.reduce<Record<number, ExistingAssignment>>(
        (accumulator, assignment) => {
          accumulator[assignment.patientId] = assignment;
          return accumulator;
        },
        {}
      );

      setExistingAssignments(assignedMap);
      setSelectedPatientIds(assignedRows.map((assignment) => assignment.patientId));
    } catch {
      showSnackbar(
        t('patient.assignment.loadError', 'Không thể tải dữ liệu gán bài tập'),
        SNACKBAR_SEVERITY.ERROR
      );
    } finally {
      setPatientsLoading(false);
    }
  };

  // Get vision level options based on config's visionType
  const getVisionOptions = () => {
    if (!config?.visionType) return [];

    switch (config.visionType) {
      case 'far':
        return farVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'near':
        return nearVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'contrast':
        return contrastVisionLevels.map((v) => ({
          value: v.level,
          label: v.score,
        }));
      case 'stereopsis':
        return stereopsisLevels.map((v) => ({ value: v.level, label: v.score }));
      default:
        return [];
    }
  };

  const visionOptions = getVisionOptions();

  const loadPatients = async () => {
    try {
      setPatientsLoading(true);
      const response = await PatientService.getPatients({ limit: 1000 });
      setPatients(response.rows || []);
    } catch {
      showSnackbar(t('error.loadingPatients'), SNACKBAR_SEVERITY.ERROR);
    } finally {
      setPatientsLoading(false);
    }
  };

  const loadAssignedPatients = async () => {
    if (!config?.id) return;

    try {
      // Call API to get assigned patients for this config
      const response = await assignmentService.getConfigAssignments(config.id);
      const assignedRows = (response.rows || []) as ExistingAssignment[];
      const assignedMap = assignedRows.reduce<Record<number, ExistingAssignment>>(
        (accumulator, assignment) => {
          accumulator[assignment.patientId] = assignment;
          return accumulator;
        },
        {}
      );
      setExistingAssignments(assignedMap);
      setSelectedPatientIds(assignedRows.map((assignment) => assignment.patientId));
    } catch (error) {
      console.error('Error loading assigned patients:', error);
      // Don't show error to user since this is just for pre-selecting
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const code = patient.code.toLowerCase();
    const search = searchTerm.toLowerCase();
    return patient.user.name.toLowerCase().includes(search) || code.includes(search);
  });

  const handlePatientToggle = (patientId: number) => {
    setSelectedPatientIds((prev) =>
      prev.includes(patientId) ? prev.filter((id) => id !== patientId) : [...prev, patientId]
    );
  };

  const handleBulkAssign = async () => {
    if (!config) {
      showSnackbar(t('config.notFound'), SNACKBAR_SEVERITY.ERROR);
      return;
    }

    try {
      setLoading(true);

      // Sử dụng assignmentService theo pattern của bạn
      await assignmentService.assignConfigToPatients(config.id, {
        patientIds: selectedPatientIds,
        notes: t('patient.assignment.bulkNotes', { count: selectedPatientIds.length }),
        templateId: selectedTemplateId,
        visionLevel: levelOverride ? visionLevel : undefined,
        levelOverride,
      });

      showSnackbar(
        t('patient.assignment.syncSuccess', { count: selectedPatientIds.length }),
        SNACKBAR_SEVERITY.SUCCESS
      );

      onSuccess();
      onClose();
    } catch {
      showSnackbar(t('patient.assignment.error'), SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{t('patient.assignment.title')}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Configuration Info */}
        <Paper sx={{ p: 1, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2">
            {t('config.configuration')}: "{config?.name}"
          </Typography>
        </Paper>

        {/* Notification Template Selection */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            {t('patient.assignment.notificationTemplate', 'Template thông báo')}
          </Typography>
          <Autocomplete
            size="small"
            options={templates}
            getOptionLabel={(option) => option.name}
            value={templates.find((t) => t.id === selectedTemplateId) || null}
            onChange={(_, newValue) => setSelectedTemplateId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t(
                  'patient.assignment.selectTemplate',
                  'Chọn template hoặc để trống dùng mặc định'
                )}
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        </Box>

        {/* Vision Level Configuration */}
        {config?.visionType && visionOptions.length > 0 && (
          <Box mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={levelOverride}
                    onChange={(e) => {
                      setLevelOverride(e.target.checked);
                      if (!e.target.checked) {
                        // Clear value when unchecked
                        if (config?.visionType === 'far') {
                          setVisionLevel(14);
                        } else if (config?.visionType === 'near') {
                          setVisionLevel(3);
                        } else if (config?.visionType === 'contrast') {
                          setVisionLevel(10);
                        } else if (config?.visionType === 'stereopsis') {
                          setVisionLevel(5);
                        }
                      }
                    }}
                    size="small"
                  />
                }
                label={t('config.overrideVisionLevel', 'Ghi đè cấp độ')}
              />
              {levelOverride && (
                <TextField
                  select
                  size="small"
                  label={t('config.visionLevel', 'Cấp độ thị lực')}
                  value={visionLevel}
                  onChange={(e) => setVisionLevel(Number(e.target.value))}
                  sx={{ minWidth: 200 }}
                >
                  {visionOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          </Box>
        )}

        {/* Patient Selection */}
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            {t('patient.assignment.selectPatients')}
          </Typography>

          {/* Search Bar */}
          <Box display="flex" gap={1}>
            <TextField
              placeholder={t('patient.search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
                endAdornment: (
                  <IconButton
                    onClick={() => {
                      void loadPatients();
                      void loadAssignedPatients();
                    }}
                    size="small"
                    edge="end"
                    aria-label={t('common.refresh')}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                ),
              }}
            />
          </Box>

          {/* Patient List */}
          <Paper sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider' }}>
            <List dense>
              {patientsLoading && (
                <ListItem>
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        gap={1}
                        py={2}
                      >
                        <CircularProgress size={18} />
                        <Typography variant="body2">{t('common.loading')}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              )}

              {!patientsLoading &&
                filteredPatients.map((patient) => (
                  <ListItem
                    key={patient.id}
                    onClick={() => handlePatientToggle(patient.id)}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 0 },
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={selectedPatientIds.includes(patient.id)}
                        onChange={() => handlePatientToggle(patient.id)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography variant="body2">{patient.user.name}</Typography>
                          {existingAssignments[patient.id] && (
                            <Chip
                              size="small"
                              variant="outlined"
                              color="primary"
                              label={t('patient.assignment.alreadyAssigned', 'Đã được gán')}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        patient.user.birthDate
                          ? `${t('patient.dateOfBirth')}: ${patient.user.birthDate} (${calculateAge(patient.user.birthDate)} ${t('patient.years')})`
                          : `${t('patient.created')}: ${patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('vi-VN') : 'N/A'}`
                      }
                    />
                  </ListItem>
                ))}

              {!patientsLoading && filteredPatients.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary={t('patient.noResults')}
                    sx={{ textAlign: 'center', py: 2 }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Box>

        {/* Selected Count with Bulk indicator */}
        <Box display="flex" alignItems="center" gap={1} mt={2}>
          <Typography variant="body2" color="text.secondary">
            {t('patient.assignment.selected')}:
          </Typography>
          <Chip
            label={`${selectedPatientIds.length} ${t('patient.patients')}`}
            size="small"
            color={selectedPatientIds.length > 0 ? 'primary' : 'default'}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleBulkAssign} variant="contained" disabled={loading || !config}>
          {loading
            ? t('common.assigning')
            : t('patient.assignment.saveSelection', 'Lưu danh sách gán')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkAssignModal;
