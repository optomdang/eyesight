import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  SelectChangeEvent,
} from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import dayjs from 'dayjs';
import * as DashboardService from 'src/services/dashboard/dashboard.service';
import { useTranslation } from 'src/hooks/useTranslation';
import { formatVisionLevel } from 'src/utils/visionUtils';
import type { CorrelationChartData } from 'src/types/admin/dashboard';

const VISION_DOMAIN_MAP = {
  far: { min: 1, max: 20 },
  near: { min: 1, max: 8 },
  contrast: { min: 1, max: 16 },
  stereopsis: { min: 1, max: 10 },
};

interface PatientCorrelationChartProps {
  defaultVisionType?: 'far' | 'near' | 'contrast' | 'stereopsis';
  defaultTrendDays?: 7 | 30 | 90 | 365;
}

const PatientCorrelationChart: React.FC<PatientCorrelationChartProps> = ({
  defaultVisionType = 'far',
  defaultTrendDays = 30,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [visionType, setVisionType] = useState<'far' | 'near' | 'contrast' | 'stereopsis'>(
    defaultVisionType,
  );
  const [trendDays, setTrendDays] = useState<7 | 30 | 90 | 365>(defaultTrendDays);
  const [chartData, setChartData] = useState<CorrelationChartData | null>(null);
  const visionTypeOptions = [
    { value: 'far', label: t('exam.far', 'Far Vision') },
    { value: 'near', label: t('exam.near', 'Near Vision') },
    { value: 'contrast', label: t('exam.contrast', 'Contrast') },
    { value: 'stereopsis', label: t('exam.stereopsis', 'Stereopsis') },
  ];
  const trendDaysOptions = [
    { value: 7, label: t('dashboard.patient.range7Days', '7 ngày') },
    { value: 30, label: t('dashboard.patient.range30Days', '30 ngày') },
    { value: 90, label: t('dashboard.patient.range90Days', '90 ngày') },
    { value: 365, label: t('dashboard.patient.range365Days', '1 năm') },
  ];

  useEffect(() => {
    fetchData();
  }, [visionType, trendDays]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await DashboardService.getPatientCorrelation(visionType, trendDays);
      setChartData(response);
    } catch (error) {
      console.error('Failed to fetch correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const trainingData = payload.find((p) => p.dataKey === 'trainingTime');
    const visionData = payload.find((p) => p.dataKey === 'visionLevel');

    const formatTime = (hours: number): string => {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    };

    return (
      <Card sx={{ p: 1.5, minWidth: 220, boxShadow: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {dayjs(label).format('DD/MM/YYYY')}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {trainingData && trainingData.value !== undefined && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                <Typography variant="body2">
                  {t('dashboard.patient.trainingTime', 'Thời gian tập')}:
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600}>
                {formatTime(trainingData.value)}
              </Typography>
            </Box>
          )}
          {visionData && visionData.value !== null && visionData.value !== undefined && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#10b981' }} />
                <Typography variant="body2">
                  {t('dashboard.patient.visionLevel', 'Mức độ thị lực')}:
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} color="success.main">
                {formatVisionLevel(visionType, visionData.value)}
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
    );
  };

  const { data = [], statistics = {} as Record<string, any> } = chartData || {};
  const visionDomain = VISION_DOMAIN_MAP[visionType];

  const handleVisionTypeChange = (event: SelectChangeEvent<string>) => {
    setVisionType(event.target.value as 'far' | 'near' | 'contrast' | 'stereopsis');
  };

  const handleTrendDaysChange = (event: SelectChangeEvent<string>) => {
    setTrendDays(parseInt(event.target.value) as 7 | 30 | 90 | 365);
  };

  return (
    <LoadingBoundary loading={loading} height="400px">
      <Card
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {t('dashboard.patient.correlationTitle', 'Tương quan Thời gian tập & Thị lực')}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {statistics.correlationScore >= 0
                  ? t('dashboard.patient.positiveCorrelation', 'Tương quan tích cực: {{value}}%', {
                      value: (statistics.correlationScore * 100).toFixed(0),
                    })
                  : t('dashboard.patient.negativeCorrelation', 'Tương quan tiêu cực: {{value}}%', {
                      value: Math.abs(statistics.correlationScore * 100).toFixed(0),
                    })}
              </Typography>
            </Box>

            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel sx={{ color: 'white' }}>
                  {t('dashboard.patient.visionType', 'Loại thị lực')}
                </InputLabel>
                <Select
                  value={visionType}
                  onChange={handleVisionTypeChange}
                  label={t('dashboard.patient.visionType', 'Loại thị lực')}
                  sx={{
                    color: 'white',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                    '.MuiSvgIcon-root': { color: 'white' },
                  }}
                >
                  {visionTypeOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: 'white' }}>
                  {t('dashboard.patient.timeRange', 'Khoảng')}
                </InputLabel>
                <Select
                  value={trendDays.toString()}
                  onChange={handleTrendDaysChange}
                  label={t('dashboard.patient.timeRange', 'Khoảng')}
                  sx={{
                    color: 'white',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                    '.MuiSvgIcon-root': { color: 'white' },
                  }}
                >
                  {trendDaysOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Statistics Cards */}
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  p: 1,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {statistics.totalTrainingHours?.toFixed(1)}h
                </Typography>
                <Typography variant="caption">
                  {t('dashboard.patient.totalTime', 'Tổng thời gian')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  p: 1,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {statistics.avgDailyTrainingTime?.toFixed(1)}h
                </Typography>
                <Typography variant="caption">
                  {t('dashboard.patient.averagePerDay', 'Trung bình/ngày')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  p: 1,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" fontWeight={700}>
                  {statistics.avgVisionLevel
                    ? formatVisionLevel(visionType, statistics.avgVisionLevel)
                    : '-'}
                </Typography>
                <Typography variant="caption">
                  {t('dashboard.patient.averageVisionLevel', 'TB mức độ thị lực')}
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  p: 1,
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight={700}
                  color={
                    statistics.visionImprovement > 0
                      ? '#86efac'
                      : statistics.visionImprovement < 0
                        ? '#fca5a5'
                        : 'inherit'
                  }
                >
                  {statistics.visionImprovement > 0 ? '+' : ''}
                  {statistics.visionImprovement?.toFixed(1)}
                </Typography>
                <Typography variant="caption">
                  {t('dashboard.patient.improvement', 'Cải thiện')}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Chart */}
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 2 }}>
            {data.length === 0 ? (
              <Box
                sx={{
                  height: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">
                  {t('common.noData', 'Không có dữ liệu')}
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={data}>
                  <defs>
                    <linearGradient id="colorVision" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => dayjs(value).format('DD/MM')}
                    stroke="#6b7280"
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#3b82f6"
                    label={{
                      value: t('dashboard.patient.hours', 'Giờ'),
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#3b82f6',
                    }}
                    domain={[0, 'auto']}
                    tickFormatter={(value) => `${value.toFixed(1)}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#10b981"
                    label={{
                      value: t('dashboard.patient.visionLevelShort', 'Mức độ TL'),
                      angle: 90,
                      position: 'insideRight',
                      fill: '#10b981',
                    }}
                    domain={[visionDomain.min, visionDomain.max]}
                    tickFormatter={(value) => formatVisionLevel(visionType, value)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="line"
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="trainingTime"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6 }}
                    name={t('dashboard.patient.trainingTimeHours', 'Thời gian tập (giờ)')}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="visionLevel"
                    fill="url(#colorVision)"
                    radius={[4, 4, 0, 0]}
                    name={t('dashboard.patient.visionLevel', 'Mức độ thị lực')}
                    maxBarSize={40}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Box>
        </CardContent>
      </Card>
    </LoadingBoundary>
  );
};

export default PatientCorrelationChart;
