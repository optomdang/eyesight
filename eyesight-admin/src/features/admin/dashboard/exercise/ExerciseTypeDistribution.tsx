import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ExerciseDistributionData {
  exerciseType: string;
  count: number;
}

interface ExerciseTypeDistributionProps {
  data: ExerciseDistributionData[];
  loading?: boolean;
}

const COLORS = ['#5D87FF', '#49BEFF', '#13DEB9', '#FFAE1F', '#FA896B', '#763EBD'];
export const MAX_VISIBLE_HEIGHT = 400;
export const BAR_HEIGHT = 40;
export const computeBoxHeight = (itemCount: number) =>
  Math.min(Math.max(itemCount * BAR_HEIGHT, 200), MAX_VISIBLE_HEIGHT);

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
          {d.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Số lượt tập: {d.value}
        </Typography>
      </Box>
    );
  }
  return null;
};

const ExerciseTypeDistribution: React.FC<ExerciseTypeDistributionProps> = ({ data, loading }) => {
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
    name: item.exerciseType,
    value: item.count,
  }));

  const contentHeight = Math.max(chartData.length * BAR_HEIGHT, 200);
  const boxHeight = computeBoxHeight(chartData.length);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Phân Bổ Bài Tập
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thống kê theo loại bài tập
          </Typography>
        </Box>

        {chartData.length > 0 ? (
          <Box data-testid="chart-scroll-box" sx={{ height: boxHeight, overflowY: 'auto' }}>
            <ResponsiveContainer width="100%" height={contentHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.08)" />
                <XAxis type="number" style={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  style={{ fontSize: 12 }}
                  tick={{ fill: '#555' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Số buổi" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">Chưa có dữ liệu</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseTypeDistribution;
