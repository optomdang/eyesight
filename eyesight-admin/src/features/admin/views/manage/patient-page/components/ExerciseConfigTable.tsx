import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import type { Assignment, ExerciseConfig } from 'src/types/core';
import * as exerciseService from 'src/services/exercise.service';

interface PatientExerciseConfigTableProps {
  assignments: Assignment[];
  loading?: boolean;
}

interface AssignmentWithConfig extends Assignment {
  exerciseConfig?: ExerciseConfig;
}

const PatientExerciseConfigTable: React.FC<PatientExerciseConfigTableProps> = ({
  assignments,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [assignmentsWithConfig, setAssignmentsWithConfig] = React.useState<AssignmentWithConfig[]>(
    []
  );
  const [configLoading, setConfigLoading] = React.useState(false);

  // Fetch exercise configs for assignments
  React.useEffect(() => {
    if (assignments.length > 0) {
      fetchConfigs();
    } else {
      setAssignmentsWithConfig([]);
    }
  }, [assignments]);

  const fetchConfigs = async () => {
    setConfigLoading(true);
    try {
      const configPromises = assignments.map(async (assignment) => {
        try {
          const config = await exerciseService.getExerciseConfigById(assignment.exerciseConfigId);
          return { ...assignment, exerciseConfig: config };
        } catch (error) {
          console.error(`Error fetching config for assignment ${assignment.id}:`, error);
          return { ...assignment, exerciseConfig: undefined };
        }
      });

      const results = await Promise.all(configPromises);
      setAssignmentsWithConfig(results);
    } catch (error) {
      console.error('Error fetching configs:', error);
      setAssignmentsWithConfig(assignments.map((a) => ({ ...a, exerciseConfig: undefined })));
    } finally {
      setConfigLoading(false);
    }
  };

  const getEyeChip = (eye: string) => {
    const eyeMap: { [key: string]: { label: string; color: 'primary' | 'secondary' | 'default' } } =
      {
        left: { label: 'MT', color: 'secondary' },
        right: { label: 'MP', color: 'primary' },
        both: { label: 'Cả hai', color: 'default' },
      };

    const config = eyeMap[eye] || { label: eye, color: 'default' };

    return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
  };

  const getStatusChip = (status: string) => {
    const statusMap: {
      [key: string]: { label: string; color: 'success' | 'warning' | 'error' | 'default' };
    } = {
      active: { label: 'Đang tập', color: 'success' },
      paused: { label: 'Tạm dừng', color: 'warning' },
      completed: { label: 'Hoàn thành', color: 'default' },
      cancelled: { label: 'Hủy bỏ', color: 'error' },
    };

    const config = statusMap[status] || { label: status, color: 'default' };

    return <Chip label={config.label} color={config.color} size="small" variant="filled" />;
  };

  const formatFrequency = (frequency: string) => {
    const frequencyMap: { [key: string]: string } = {
      daily: 'Hàng ngày',
      weekly: 'Hàng tuần',
      monthly: 'Hàng tháng',
      quarterly: 'Hàng quý',
      yearly: 'Hàng năm',
    };

    return frequencyMap[frequency] || frequency;
  };

  if (loading || configLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('patient.exerciseConfig.title', 'PHÁC ĐỒ ĐIỀU TRỊ')}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.stt', 'STT')}</TableCell>
                  <TableCell>{t('config.exercise', 'BÀI TẬP')}</TableCell>
                  <TableCell>{t('config.eye', 'MẮT TẬP')}</TableCell>
                  <TableCell>{t('config.distance', 'KHOẢNG CÁCH')}</TableCell>
                  <TableCell>{t('config.mode', 'CHẾ ĐỘ')}</TableCell>
                  <TableCell>{t('config.duration', 'THỜI GIAN/LẦN')}</TableCell>
                  <TableCell>{t('config.frequency', 'TẦN SUẤT')}</TableCell>
                  <TableCell>{t('config.executionCount', 'SỐ LẦN')}</TableCell>
                  <TableCell>{t('common.status', 'TRẠNG THÁI')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3].map((index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  }

  if (!assignmentsWithConfig || assignmentsWithConfig.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('patient.exerciseConfig.title', 'PHÁC ĐỒ ĐIỀU TRỊ')}
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {t('patient.exerciseConfig.noData', 'Chưa có bài tập nào được gán')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('patient.exerciseConfig.title', 'PHÁC ĐỒ ĐIỀU TRỊ')}
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('common.stt', 'STT')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('config.exercise', 'BÀI TẬP')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('config.eye', 'MẮT TẬP')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('config.distance', 'KHOẢNG CÁCH')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('config.mode', 'CHẾ ĐỘ')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('config.duration', 'THỜI GIAN/LẦN')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('config.executionCount', 'SỐ LẦN')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('config.frequency', 'TẦN SUẤT')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('common.status', 'TRẠNG THÁI')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignmentsWithConfig.map((assignment, index) => {
                const config = assignment.exerciseConfig;
                const exercise = config?.exercise;

                return (
                  <TableRow key={assignment.id} hover>
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {exercise?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {exercise?.code || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{getEyeChip(config?.eye || 'both')}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{config?.distance || 0}m</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{config?.name || 'Mặc định'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{config?.duration || 0} phút</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{config?.executionCount || 0} lần</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatFrequency(config?.frequency || 'daily')}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{getStatusChip(assignment.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default PatientExerciseConfigTable;
