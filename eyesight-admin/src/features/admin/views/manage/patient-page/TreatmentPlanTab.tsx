import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';
import ExamHistoryTable from './ExamHistoryTable';
import PatientExerciseResultsTable from './PatientExerciseResultsTable';
import ExamResultDetail from './ExamResultDetail';
import ExerciseSessionProgressChart from 'src/components/shared/ExerciseSessionProgressChart';
import type { Patient, ExamResult } from 'src/types/core';
import * as PatientService from 'src/services/patient.service';
import { getExamResult } from 'src/services/exam.service';
import dayjs from 'dayjs';
import { formatVisionLevel, getVisionExamChartYAxisConfig, mapExamResultLevelsForChart } from 'src/utils/visionUtils';

interface TreatmentPlanTabProps {
  patient: Patient;
  getExamTypeName: (type: string) => string;
}

type TimeRangeOption = 'all' | '3m' | '6m' | '12m';

const TreatmentPlanTab: React.FC<TreatmentPlanTabProps> = ({ patient, getExamTypeName }) => {
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [resultDetailDialogOpen, setResultDetailDialogOpen] = useState(false);
  const [resultDetailLoading, setResultDetailLoading] = useState(false);
  const [examResultsChartData, setExamResultsChartData] = useState<{ [key: string]: any[] }>({});
  const [exerciseSessions, setExerciseSessions] = useState<any[]>([]);
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>('far');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>('all');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // ── Date range filtering for exam chart ─────────────────────────────────
  const activeFromDate = useMemo(() => {
    if (!patient.activeFrom) return null;
    const parsed = dayjs(patient.activeFrom);
    return parsed.isValid() ? parsed : null;
  }, [patient.activeFrom]);

  const rangeEndDate = useMemo(() => {
    if (!activeFromDate || selectedTimeRange === 'all') return null;
    const monthsToAdd = selectedTimeRange === '3m' ? 3 : selectedTimeRange === '6m' ? 6 : 12;
    return activeFromDate.add(monthsToAdd, 'month').endOf('day');
  }, [activeFromDate, selectedTimeRange]);

  const filteredExamResultsChartData = useMemo(() => {
    const isInRange = (timestamp: number) => {
      if (!timestamp) return false;
      const valueDate = dayjs(timestamp);
      if (activeFromDate && valueDate.isBefore(activeFromDate)) return false;
      if (rangeEndDate && valueDate.isAfter(rangeEndDate)) return false;
      return true;
    };
    return Object.fromEntries(
      Object.entries(examResultsChartData).map(([examType, rows]) => [
        examType,
        rows.filter((row) => isInRange(row.timestamp)),
      ])
    );
  }, [activeFromDate, examResultsChartData, rangeEndDate]);

  const examYAxis = useMemo(() => {
    const rows = filteredExamResultsChartData[selectedExamType] ?? [];
    return getVisionExamChartYAxisConfig(selectedExamType, rows);
  }, [selectedExamType, filteredExamResultsChartData]);

  // ── Fetch data ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchChartData = async () => {
      const patientId = patient.id;
      if (!patientId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [examResultsResponse, sessionsResponse] = await Promise.all([
          PatientService.getPatientExamResults(patientId),
          PatientService.getPatientExerciseSessions(patientId, { limit: 500 }),
        ]);

        // ── Exam results → chart data ──────────────────────────────────────
        const examResultsByType: { [key: string]: any[] } = {};
        const examTypes = new Set<string>();

        examResultsResponse.rows?.forEach((result: any) => {
          const examType = result.examType;
          const levels = mapExamResultLevelsForChart(examType, result);
          if (!levels) return;

          examTypes.add(examType);
          if (!examResultsByType[examType]) examResultsByType[examType] = [];

          examResultsByType[examType].push({
            date: result.startedAt ? dayjs(result.startedAt).format('DD/MM/YYYY') : '',
            timestamp: result.startedAt ? dayjs(result.startedAt).valueOf() : 0,
            ...levels,
          });
        });

        Object.keys(examResultsByType).forEach((type) => {
          examResultsByType[type].sort((a, b) => a.timestamp - b.timestamp);
        });

        setExamResultsChartData(examResultsByType);
        setAvailableExamTypes(Array.from(examTypes));
        if (examTypes.size > 0) {
          setSelectedExamType(examTypes.has('far') ? 'far' : Array.from(examTypes)[0]);
        }

        // ── Exercise sessions ──────────────────────────────────────────────
        setExerciseSessions(sessionsResponse.rows ?? []);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [patient.id]);

  // ── Exam result dialog ───────────────────────────────────────────────────
  const handleOpenResultDialog = async (result: ExamResult) => {
    setSelectedResult(result);
    setResultDetailDialogOpen(true);
    if (!result.id) return;
    setResultDetailLoading(true);
    try {
      const fullResult = await getExamResult(result.id);
      setSelectedResult(fullResult);
    } catch {
      // keep list-row data as fallback
    } finally {
      setResultDetailLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Box>
      <LoadingBoundary loading={loading} height="300px">
        <Grid container spacing={2}>

          {/* Biểu đồ kết quả kiểm tra thị lực */}
          <Grid size={12}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">
                    {t('treatmentPlan.examHistory', 'Lịch sử kết quả kiểm tra theo thời gian')}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{t('treatmentPlan.timeRange', 'Khoảng thời gian')}</InputLabel>
                    <Select
                      value={selectedTimeRange}
                      label={t('treatmentPlan.timeRange', 'Khoảng thời gian')}
                      onChange={(e) => setSelectedTimeRange(e.target.value as TimeRangeOption)}
                    >
                      <MenuItem value="all">{t('treatmentPlan.timeRangeAll', 'Toàn thời gian')}</MenuItem>
                      <MenuItem value="3m">{t('treatmentPlan.timeRange3Months', '3 tháng đầu')}</MenuItem>
                      <MenuItem value="6m">{t('treatmentPlan.timeRange6Months', '6 tháng đầu')}</MenuItem>
                      <MenuItem value="12m">{t('treatmentPlan.timeRange12Months', '1 năm đầu')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Tabs
                  value={selectedExamType}
                  onChange={(_, v) => setSelectedExamType(v)}
                  sx={{ mb: 2 }}
                >
                  {availableExamTypes.map((examType) => (
                    <Tab key={examType} value={examType} label={getExamTypeName(examType)} />
                  ))}
                </Tabs>

                <Box sx={{ height: 400, width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart data={filteredExamResultsChartData[selectedExamType] || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-30}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        ticks={examYAxis.ticks}
                        domain={examYAxis.domain}
                        allowDecimals={examYAxis.allowDecimals}
                        reversed={examYAxis.reversed}
                        tickFormatter={examYAxis.tickFormatter}
                        label={{ value: t('treatmentPlan.visionResult', 'Chỉ số thị lực'), angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value: unknown, name: string) => [
                          value == null ? '—' : formatVisionLevel(selectedExamType, value as number),
                          name,
                        ]}
                      />
                      <Legend />
                      {selectedExamType === 'stereopsis' ? (
                        <Line
                          type="monotone"
                          dataKey="bothEye"
                          stroke="#9C27B0"
                          strokeWidth={3}
                          name="Cả hai mắt"
                          dot={{ fill: '#9C27B0', r: 5 }}
                          connectNulls={false}
                        />
                      ) : (
                        <>
                          <Line
                            type="monotone"
                            dataKey="leftEye"
                            stroke="#2196F3"
                            strokeWidth={2}
                            name="Mắt trái"
                            dot={{ fill: '#2196F3', r: 4 }}
                            connectNulls={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="rightEye"
                            stroke="#4CAF50"
                            strokeWidth={2}
                            name="Mắt phải"
                            dot={{ fill: '#4CAF50', r: 4 }}
                            connectNulls={false}
                          />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Biểu đồ tiến độ bài tập — dùng shared component */}
          <Grid size={12}>
            <ExerciseSessionProgressChart sessions={exerciseSessions} />
          </Grid>

          {/* Lịch sử kiểm tra */}
          <Grid size={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  {t('treatmentPlan.testHistory', 'Lịch sử kiểm tra')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <DataTableProvider endpoint={`patients/${patient.id}/exam-results`}>
                  <ExamHistoryTable onViewDetail={handleOpenResultDialog} getExamTypeName={getExamTypeName} />
                </DataTableProvider>
              </CardContent>
            </Card>
          </Grid>

          {/* Kết quả thực hiện bài tập */}
          <Grid size={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  {t('treatmentPlan.exerciseResults', 'Kết quả thực hiện bài tập')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <DataTableProvider endpoint={`patients/${patient.id}/exercise-results`}>
                  <PatientExerciseResultsTable patient={patient} />
                </DataTableProvider>
              </CardContent>
            </Card>
          </Grid>

        </Grid>

        {/* Dialog chi tiết kết quả kiểm tra */}
        <Dialog open={resultDetailDialogOpen} onClose={() => setResultDetailDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('patient.dialog.resultDetailTitle', 'Chi tiết kết quả bài kiểm tra')}</DialogTitle>
          <DialogContent>
            {resultDetailLoading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">{t('common.loading', 'Đang tải...')}</Typography>
              </Box>
            ) : selectedResult ? (
              <ExamResultDetail result={selectedResult} />
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResultDetailDialogOpen(false)} variant="contained" size="small">
              {t('common.close', 'Đóng')}
            </Button>
          </DialogActions>
        </Dialog>
      </LoadingBoundary>
    </Box>
  );
};

export default TreatmentPlanTab;
