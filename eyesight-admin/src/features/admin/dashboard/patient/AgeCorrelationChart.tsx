import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Dialog, Tooltip } from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import * as DashboardService from 'src/services/dashboard/dashboard.service';
import type { AgeCorrelationDataPoint } from 'src/services/dashboard/dashboard.service';

const CHART_COLORS = {
  totalBar: '#93c5fd',
  improvedBar: '#10b981',
  completionLine: '#f59e0b',
  focusLine: '#8b5cf6',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <Card sx={{ p: 1.5, minWidth: 220, boxShadow: 3 }}>
      <Typography variant="caption" fontWeight={600}>
        Tuổi: {label}
      </Typography>
      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {payload.map((entry: any) => (
          <Box key={entry.dataKey} display="flex" justifyContent="space-between" gap={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color }} />
              <Typography variant="body2">{entry.name}:</Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>
              {entry.value != null
                ? entry.dataKey === 'avgCompletionRate' || entry.dataKey === 'avgFocusScore'
                  ? `${entry.value}%`
                  : entry.value
                : '—'}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
};

const renderImprovementLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 4}
      fill="#10b981"
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
    >
      {value}%
    </text>
  );
};

interface ChartContentProps {
  data: AgeCorrelationDataPoint[];
  /** Số px hoặc '100%' khi bọc trong vùng flex co giãn. */
  height?: number | `${number}%` | '100%';
}

const ChartContent: React.FC<ChartContentProps> = ({ data, height = '100%' }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 28 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="ageGroup" stroke="#6b7280" tick={{ fontSize: 12 }} />
      <YAxis
        yAxisId="count"
        orientation="left"
        stroke="#6b7280"
        label={{
          value: 'Số BN',
          angle: -90,
          position: 'insideLeft',
          fill: '#6b7280',
          fontSize: 12,
        }}
        allowDecimals={false}
      />
      <YAxis
        yAxisId="pct"
        orientation="right"
        stroke="#6b7280"
        domain={[0, 100]}
        tickFormatter={(v) => `${v}%`}
        label={{ value: '%', angle: 90, position: 'insideRight', fill: '#6b7280', fontSize: 12 }}
      />
      <RechartsTooltip content={<CustomTooltip />} />
      <Legend
        verticalAlign="bottom"
        height={32}
        wrapperStyle={{ fontSize: 11, paddingTop: 4, bottom: 0 }}
      />
      <Bar
        yAxisId="count"
        dataKey="totalPatients"
        name="Tổng BN"
        fill={CHART_COLORS.totalBar}
        maxBarSize={30}
        radius={[3, 3, 0, 0]}
      />
      <Bar
        yAxisId="count"
        dataKey="improvedPatients"
        name="Cải thiện"
        fill={CHART_COLORS.improvedBar}
        maxBarSize={30}
        radius={[3, 3, 0, 0]}
      >
        <LabelList dataKey="improvementRate" content={renderImprovementLabel} />
      </Bar>
      <Line
        yAxisId="pct"
        type="monotone"
        dataKey="avgCompletionRate"
        name="% Hoàn thành (nhóm cải thiện)"
        stroke={CHART_COLORS.completionLine}
        strokeWidth={2}
        dot={{ r: 4 }}
        connectNulls
      />
      <Line
        yAxisId="pct"
        type="monotone"
        dataKey="avgFocusScore"
        name="% Tập trung (nhóm cải thiện)"
        stroke={CHART_COLORS.focusLine}
        strokeWidth={2}
        dot={{ r: 4 }}
        connectNulls
      />
    </ComposedChart>
  </ResponsiveContainer>
);

const AgeCorrelationChart: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AgeCorrelationDataPoint[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await DashboardService.getAgeCorrelation();
      setData(response.data || []);
    } catch (error) {
      console.error('Failed to fetch age correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingBoundary loading={loading} height="100%">
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <CardContent
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              '&:last-child': { pb: 2 },
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexShrink={0}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Tương quan giữa độ tuổi - hiệu quả và tuân thủ điều trị
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Toàn bộ thời gian · Tuổi &gt;18 gộp chung
                </Typography>
              </Box>
              <Tooltip title="Phóng to">
                <IconButton
                  size="small"
                  onClick={() => setFullscreen(true)}
                  sx={{ color: 'white' }}
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Box
              sx={{
                bgcolor: 'white',
                borderRadius: 2,
                pt: 1.5,
                px: 2,
                pb: 0.75,
                flex: 1,
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              {data.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">Không có dữ liệu</Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: '1 1 0',
                    minHeight: 0,
                    width: '100%',
                    mt: '1cm',
                    height: 0,
                  }}
                >
                  <ChartContent data={data} />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </LoadingBoundary>

      <Dialog
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: '95vw', maxWidth: '95vw', height: '85vh' } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Tương quan giữa độ tuổi - hiệu quả và tuân thủ điều trị
            </Typography>
            <IconButton onClick={() => setFullscreen(false)}>
              <FullscreenExitIcon />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1 }}>
            <ChartContent data={data} height={500} />
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default AgeCorrelationChart;
