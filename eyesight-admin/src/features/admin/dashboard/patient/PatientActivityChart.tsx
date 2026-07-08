import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';

const ACTIVITY_CHART_HELP =
  'Số bệnh nhân vào bài test hoặc bài tập mỗi ngày (không cần hoàn thành)';

// Local type for activity chart data
interface LoginActivityData {
  date: string;
  loginCount: number;
}

interface PatientActivityChartProps {
  data: LoginActivityData[];
  loading?: boolean;
  trendDays?: number;
  onTrendDaysChange?: (days: number) => void;
}

const TREND_DAYS_OPTIONS = [
  { value: 7, label: '7 ngày' },
  { value: 30, label: '30 ngày' },
  { value: 90, label: '90 ngày' },
  { value: 365, label: '365 ngày' },
];

const PatientActivityChart: React.FC<PatientActivityChartProps> = ({
  data,
  loading,
  trendDays = 30,
  onTrendDaysChange,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item) => {
    const [, month, day] = item.date.split('-');
    return {
      date: `${parseInt(day, 10)}/${parseInt(month, 10)}`,
      fullDate: item.date,
      count: item.loginCount,
    };
  });

  const totalLogins = data.reduce((sum, item) => sum + item.loginCount, 0);
  const avgLogins = data.length > 0 ? (totalLogins / data.length).toFixed(1) : 0;
  const maxLogins = data.length > 0 ? Math.max(...data.map((item) => item.loginCount)) : 0;

  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
      }}
    >
      <CardContent>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 2 }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              <LabelWithHelp help={ACTIVITY_CHART_HELP} gap={1}>
                Xu Hướng Hoạt Động ({trendDays} Ngày)
              </LabelWithHelp>
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 120, flexShrink: 0, alignSelf: 'flex-start' }}>
            <InputLabel>Khoảng thời gian</InputLabel>
            <Select
              value={trendDays}
              label="Khoảng thời gian"
              onChange={(e) => onTrendDaysChange?.(Number(e.target.value))}
            >
              {TREND_DAYS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tổng lượt hoạt động
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {totalLogins}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cao nhất
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {maxLogins}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Trung bình/ngày
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {avgLogins}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                type="category"
                scale="point"
                padding={{ left: 0, right: 0 }}
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                tickMargin={6}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                width={28}
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: `1px solid ${theme.palette.primary.main}`,
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: any) => [`${value} BN`, 'Bệnh nhân hoạt động']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                fill="url(#colorCount)"
                dot={{ fill: theme.palette.primary.main, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientActivityChart;
