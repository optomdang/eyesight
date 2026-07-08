import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore, TrendingUp, Assignment, Timer } from '@mui/icons-material';
import * as PatientService from 'src/services/patient.service';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { PatientProgressReport } from 'src/types/core';

interface ProgressReportProps {
  patientId: string | number;
}

const ProgressReport: React.FC<ProgressReportProps> = ({ patientId }) => {
  const [report, setReport] = useState<PatientProgressReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadReport();
  }, [patientId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await PatientService.getPatientProgress(Number(patientId));
      setReport(data);
    } catch {
      showSnackbar('Có lỗi xảy ra khi tải báo cáo tiến độ', SNACKBAR_SEVERITY.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (rate: string) => {
    switch (rate) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'info';
      case 'average':
        return 'warning';
      default:
        return 'error';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!report) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="textSecondary">
          Không có dữ liệu báo cáo tiến độ
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Báo cáo tiến độ bài tập
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Assignment color="primary" />
                <Typography variant="h6">{report.summary.totalExercises}</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Tổng số bài tập
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUp color="success" />
                <Typography variant="h6">{report.summary.completedExercises}</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Bài tập hoàn thành
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Timer color="info" />
                <Typography variant="h6">{report.summary.totalSessions}</Typography>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Tổng phiên luyện tập
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {report.summary.averageCompletionRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Tỷ lệ hoàn thành trung bình
              </Typography>
              <LinearProgress
                variant="determinate"
                value={report.summary.averageCompletionRate}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress by PatientExerciseDetail */}
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>
          Tiến độ theo từng bài tập
        </Typography>
        {report.progressByExercise.map((exercise, index) => (
          <Accordion key={index}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Typography variant="subtitle1">{exercise.exerciseName}</Typography>
                <Chip
                  label={exercise.progressRate}
                  color={getProgressColor(exercise.progressRate)}
                  size="small"
                />
                <Typography variant="body2" color="textSecondary" ml="auto">
                  Cấp {exercise.initialLevel} → {exercise.currentLevel}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cấp độ</TableCell>
                      <TableCell>Số lần thử</TableCell>
                      <TableCell>Số lần đạt</TableCell>
                      <TableCell>Điểm cao nhất</TableCell>
                      <TableCell>Hoàn thành lúc</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exercise.levelProgress.map((level) => (
                      <TableRow key={level.level}>
                        <TableCell>
                          <Chip label={`Cấp ${level.level}`} variant="outlined" size="small" />
                        </TableCell>
                        <TableCell>{level.totalAttempts}</TableCell>
                        <TableCell>{level.passedAttempts}</TableCell>
                        <TableCell>
                          <Chip label={level.bestScore} color="success" size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(level.completedAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Khuyến nghị
          </Typography>
          <Card>
            <CardContent>
              {report.recommendations.map((rec, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="subtitle2" color="primary">
                    {rec.recommendation}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {rec.reason}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default ProgressReport;
