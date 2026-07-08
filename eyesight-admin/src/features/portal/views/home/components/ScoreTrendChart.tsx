import React from 'react';
import { Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import type { ScoreTrendData } from 'src/types/core';

interface ScoreTrendChartProps {
  data: ScoreTrendData[];
  loading?: boolean;
}

const ScoreTrendChart: React.FC<ScoreTrendChartProps> = ({ data, loading }) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" height={250} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Xu Hướng Điểm Số
          </Typography>
          <Box
            sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              Chưa có dữ liệu bài tập
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const avgScore = (data.reduce((sum, item) => sum + item.score, 0) / data.length).toFixed(0);
  const maxScore = Math.max(...data.map((item) => item.score));
  const totalSessions = data.reduce((sum, item) => sum + item.sessionCount, 0);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Xu Hướng Điểm Số (30 Ngày)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Theo dõi tiến độ cải thiện của bạn
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {avgScore}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Điểm TB
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tổng buổi
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {totalSessions}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cao nhất
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {maxScore}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="date"
                stroke={theme.palette.text.secondary}
                style={{ fontSize: 11 }}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                style={{ fontSize: 11 }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: `1px solid ${theme.palette.primary.main}`,
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'score') return [`${value} điểm`, 'Điểm số'];
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                fill="url(#colorScore)"
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

export default ScoreTrendChart;
