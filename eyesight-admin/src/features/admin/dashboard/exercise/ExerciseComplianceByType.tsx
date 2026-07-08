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
  ReferenceLine,
  Cell,
} from 'recharts';

interface ComplianceItem {
  exerciseType: string;
  assigned: number;
  completed: number;
  complianceRate: number;
}

interface ExerciseComplianceByTypeProps {
  data: ComplianceItem[];
  loading?: boolean;
}

export const MAX_VISIBLE_HEIGHT = 480;
export const BAR_HEIGHT = 44;
export const computeBoxHeight = (itemCount: number) =>
  Math.min(Math.max(itemCount * BAR_HEIGHT, 200), MAX_VISIBLE_HEIGHT);

export const getBarColor = (rate: number) => {
  if (rate >= 75) return '#13DEB9';
  if (rate >= 50) return '#FFAE1F';
  return '#FA896B';
};

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
          Tuân thủ: {(d.complianceRate ?? 0).toFixed(1)}%
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hoàn thành: {d.completed} / {d.assigned} lượt
        </Typography>
      </Box>
    );
  }
  return null;
};

const ExerciseComplianceByType: React.FC<ExerciseComplianceByTypeProps> = ({ data, loading }) => {
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
    complianceRate: item.complianceRate,
    completed: item.completed,
    assigned: item.assigned,
  }));

  const contentHeight = Math.max(chartData.length * BAR_HEIGHT, 200);
  const boxHeight = computeBoxHeight(chartData.length);

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Tuân Thủ Theo Loại Bài Tập
          </Typography>
          <Typography variant="body2" color="text.secondary">
            % hoàn thành buổi tập được giao theo từng loại bài tập
          </Typography>
        </Box>

        {chartData.length > 0 ? (
          <Box data-testid="chart-scroll-box" sx={{ height: boxHeight, overflowY: 'auto' }}>
            <ResponsiveContainer width="100%" height={contentHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.08)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  style={{ fontSize: 12 }}
                  tick={{ fill: '#555' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  x={75}
                  stroke="#5D87FF"
                  strokeDasharray="4 4"
                  label={{
                    value: '75%',
                    fill: '#5D87FF',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
                <Bar
                  dataKey="complianceRate"
                  name="% Tuân thủ"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.complianceRate)} />
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

export default ExerciseComplianceByType;
