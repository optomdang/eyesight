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
  Legend,
} from 'recharts';
import { useTranslation } from 'src/hooks/useTranslation';

// #16 — one row per vision type, matching the exam-stats `breakdown` shape (BE getExamStats).
interface VisionTypeData {
  type: string;
  total: number;
  completed: number;
  completionRate: number;
}

interface VisionTypeBreakdownProps {
  data: VisionTypeData[];
  loading?: boolean;
}

const VISION_TYPE_LABELS: Record<string, string> = {
  far: 'Nhìn xa',
  near: 'Nhìn gần',
  contrast: 'Độ tương phản',
  stereopsis: 'Lập thể',
};

const ALL_VISION_TYPES = ['far', 'near', 'contrast', 'stereopsis'];

const VisionTypeBreakdown: React.FC<VisionTypeBreakdownProps> = ({ data, loading }) => {
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

  // Normalize: luôn hiện đủ 4 loại, type thiếu data thì để 0
  const normalizedData = ALL_VISION_TYPES.map((type) => {
    const found = data.find((d) => d.type === type);
    return found ?? { type, total: 0, completed: 0, completionRate: 0 };
  });

  const chartData = normalizedData.map((item) => ({
    name: VISION_TYPE_LABELS[item.type] ?? t(`exam.${item.type}`, item.type),
    completed: item.completed,
    incomplete: item.total - item.completed,
    total: item.total,
    rate: item.completionRate,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {data.name}
          </Typography>
          <Typography variant="body2" color="success.main">
            {t('dashboard.exam.completed', 'Hoàn thành')}: {data.completed}
          </Typography>
          <Typography variant="body2" color="warning.main">
            {t('dashboard.exam.notCompleted', 'Chưa xong')}: {data.incomplete}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.exam.rate', 'Tỷ lệ')}: {data.rate?.toFixed(1)}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('dashboard.exam.visionTypeBreakdownTitle', 'Phân Bổ Loại Test')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.exam.visionTypeBreakdownSubtitle', 'Thống kê theo loại thị lực')}
          </Typography>
        </Box>

        {chartData.length > 0 ? (
          <Box sx={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" style={{ fontSize: 12 }} />
                <YAxis style={{ fontSize: 12 }} unit=" lượt" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="#13DEB9"
                  radius={[0, 0, 4, 4]}
                  name="Hoàn thành (lượt)"
                />
                <Bar
                  dataKey="incomplete"
                  stackId="a"
                  fill="#FFAE1F"
                  radius={[4, 4, 0, 0]}
                  name="Chưa xong (lượt)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box
            sx={{
              height: 350,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">{t('common.noData', 'Chưa có dữ liệu')}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default VisionTypeBreakdown;
