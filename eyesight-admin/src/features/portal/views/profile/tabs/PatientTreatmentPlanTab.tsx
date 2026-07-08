import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import useAuth from 'src/contexts/authGuard/useAuth';
import { getMyPatientInfo, getMyAssignments } from 'src/services/patient.service';
import { getExamAssignmentsByPatient } from 'src/services/exam-assignment.service';
import { getFrequencyText } from 'src/utils/examUtils';
import { formatVisionLevel } from 'src/utils/visionUtils';
import type { Patient, ExamAssignment, Assignment } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';

const PatientTreatmentPlanTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [examConfigs, setExamConfigs] = useState<ExamAssignment[]>([]);
  const [exerciseAssignments, setExerciseAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Get patient info via service
        const patientData = await getMyPatientInfo();
        setPatient(patientData);

        // Get exam configs via service
        const examData = await getExamAssignmentsByPatient(patientData.id);
        setExamConfigs(examData.rows || []);

        // Get exercise assignments via service
        const exerciseData = await getMyAssignments({ limit: 100 });
        setExerciseAssignments(exerciseData.rows || []);
      } catch (error) {
        console.error('Failed to load treatment plan data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getExamTypeName = (examType: string): string => {
    const map: Record<string, string> = {
      far: t('exam.far', 'Far Vision'),
      near: t('exam.near', 'Near Vision'),
      contrast: t('exam.contrast', 'Contrast'),
      stereopsis: t('exam.stereopsis', 'Stereopsis'),
    };
    return map[examType] || examType;
  };

  const getFrequencyLabel = (frequency?: string) => {
    if (!frequency) {
      return t('common.notAvailable', 'N/A');
    }

    return t(`exercise.frequencies.${frequency}`, frequency);
  };

  const getExerciseVisionTypeLabel = (visionType?: string) => {
    if (visionType === 'far') return t('exam.far', 'Far Vision');
    if (visionType === 'near') return t('exam.near', 'Near Vision');
    if (visionType === 'contrast') return t('exam.contrast', 'Contrast');
    if (visionType === 'stereopsis') return t('exam.stereopsis', 'Stereopsis');
    return t('common.notAvailable', 'N/A');
  };

  const getStatusChip = (isActive: boolean) => {
    return (
      <Chip
        label={
          isActive
            ? t('patient.treatmentPlan.active', 'Đang hoạt động')
            : t('patient.treatmentPlan.paused', 'Tạm dừng')
        }
        color={isActive ? 'success' : 'default'}
        size="small"
      />
    );
  };

  return (
    <LoadingBoundary loading={loading} height="300px">
      {!patient ? (
        <Alert severity="warning">
          {t('patient.treatmentPlan.patientNotFound', 'Không tìm thấy thông tin bệnh nhân')}
        </Alert>
      ) : (
        <Box>
          <Grid container spacing={3}>
            {/* Chế độ kiểm tra */}
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('patient.treatmentPlan.examModes', 'CHẾ ĐỘ KIỂM TRA')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {examConfigs.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('common.index', 'STT')}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {t('patient.treatmentPlan.examType', 'Loại kiểm tra')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('exercise.frequency', 'Tần suất')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('patient.treatmentPlan.visionLevel', 'Vision Level')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('common.status', 'Trạng thái')}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {examConfigs.map((config, index) => (
                            <TableRow key={config.id}>
                              <TableCell align="center">{index + 1}</TableCell>
                              <TableCell>{getExamTypeName(config.examType)}</TableCell>
                              <TableCell align="center">
                                {getFrequencyLabel(config.frequency)}
                              </TableCell>
                              <TableCell align="center">
                                {formatVisionLevel(config.examType, config.visionLevel)}
                              </TableCell>
                              <TableCell align="center">{getStatusChip(config.isActive)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t(
                        'patient.treatmentPlan.noExamModes',
                        'Chưa có chế độ kiểm tra nào được cấu hình'
                      )}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Bài tập được giao */}
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('patient.treatmentPlan.assignedExercises', 'BÀI TẬP ĐƯỢC GIAO')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {exerciseAssignments.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('common.index', 'STT')}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {t('patient.treatmentPlan.exerciseName', 'Tên bài tập')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('patient.treatmentPlan.type', 'Loại')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('exercise.frequency', 'Tần suất')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('patient.treatmentPlan.visionLevel', 'Vision Level')}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {t('common.status', 'Trạng thái')}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {exerciseAssignments.map((assignment, index) => (
                            <TableRow key={assignment.id}>
                              <TableCell align="center">{index + 1}</TableCell>
                              <TableCell>
                                {assignment.exerciseConfig?.exercise?.name ||
                                  t('common.notAvailable', 'N/A')}
                              </TableCell>
                              <TableCell align="center">
                                {getExerciseVisionTypeLabel(assignment.exerciseConfig?.visionType)}
                              </TableCell>
                              <TableCell align="center">
                                {getFrequencyLabel(assignment.frequency)}
                              </TableCell>
                              <TableCell align="center">
                                {formatVisionLevel(
                                  assignment.exerciseConfig?.visionType || 'far',
                                  assignment.visionLevel ||
                                    assignment.exerciseConfig?.visionLevel ||
                                    0
                                )}
                              </TableCell>
                              <TableCell align="center">
                                {getStatusChip(assignment.isActive)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t(
                        'patient.treatmentPlan.noAssignedExercises',
                        'Chưa có bài tập nào được giao'
                      )}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Thông tin bổ sung */}
            <Grid size={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{t('patient.treatmentPlan.noteTitle', 'Lưu ý:')}</strong>{' '}
                  {t(
                    'patient.treatmentPlan.noteMessage',
                    'Phác đồ điều trị chỉ được xem, không thể chỉnh sửa. Bác sĩ điều trị sẽ điều chỉnh phác đồ phù hợp với tình trạng của bạn.'
                  )}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Box>
      )}
    </LoadingBoundary>
  );
};

export default PatientTreatmentPlanTab;
