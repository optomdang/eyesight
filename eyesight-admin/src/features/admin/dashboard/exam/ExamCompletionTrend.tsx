import React from 'react';
import { Card, CardContent, Typography, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import type { ExamTrendData } from 'src/types/admin/dashboard';
import { useTranslation } from 'src/hooks/useTranslation';

type ExamPeriod = 'week' | 'month' | 'quarter' | 'year';

// #17 bucket selector — values are the date_trunc units sent to the BE.
const PERIOD_OPTIONS: { label: string; value: ExamPeriod }[] = [
  { label: 'Tuần', value: 'week' },
  { label: 'Tháng', value: 'month' },
  { label: 'Quý', value: 'quarter' },
  { label: 'Năm', value: 'year' },
];

interface ExamCompletionTrendProps {
  data: ExamTrendData[];
  loading?: boolean;
  period: ExamPeriod;
  onPeriodChange: (period: ExamPeriod) => void;
}

const ExamCompletionTrend: React.FC<ExamCompletionTrendProps> = ({
  data,
  loading,
  period,
  onPeriodChange,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    total: item.totalExams,
    completed: item.completedExams,
    rate: parseFloat(item.completionRate?.toString() || '0'),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            padding: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('dashboard.exam.date', 'Ngày')}: {d.date}
          </Typography>
          <Typography variant="body2" color="primary.main">
            Tổng bài (lượt): {d.total}
          </Typography>
          <Typography variant="body2" color="success.main">
            Hoàn thành (lượt): {d.completed}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tỉ lệ (%): {d.rate.toFixed(1)}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t('dashboard.exam.completionTrendTitle', 'Xu Hướng Hoàn Thành')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.exam.completionTrendSubtitle', 'Theo dõi tiến độ làm bài theo ngày')}
            </Typography>
          </Box>

          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(_e, val) => val !== null && onPeriodChange(val)}
            size="small"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value} sx={{ px: 2 }}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5D87FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5D87FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="date" style={{ fontSize: 12 }} />
              <YAxis yAxisId="left" style={{ fontSize: 12 }} unit=" lượt" />
              <YAxis yAxisId="right" orientation="right" style={{ fontSize: 12 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total"
                stroke="#5D87FF"
                strokeWidth={2}
                fill="url(#colorTotal)"
                name="Tổng bài (lượt)"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="completed"
                stroke="#13DEB9"
                strokeWidth={3}
                dot={{ fill: '#13DEB9', r: 4 }}
                activeDot={{ r: 6 }}
                name="Hoàn thành (lượt)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                stroke="#FFAE1F"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ fill: '#FFAE1F', r: 4 }}
                activeDot={{ r: 6 }}
                name="Tỉ lệ (%)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ExamCompletionTrend;
