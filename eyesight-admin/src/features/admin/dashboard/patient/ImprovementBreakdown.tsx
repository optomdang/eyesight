import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import type { ImprovementData } from 'src/types/admin/dashboard';
import { CAUSES, getCauseLabel } from 'src/constants/causes';

/** Khớp vùng vẽ `AgeCorrelationChart` (ChartContent height). */
const CHART_HEIGHT = 300;

interface ImprovementBreakdownProps {
  data: ImprovementData | null;
  loading?: boolean;
  selectedCauses: string[];
  onCausesChange: (causes: string[]) => void;
}

const COLORS = {
  improved: '#13DEB9',
  stable: '#FFAE1F',
  declined: '#FA896B',
};

interface PieSlice {
  name: string;
  value: number;
  color: string;
}

const renderActiveShape = (props: PieSectorDataItem) => {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill,
  } = props;

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={(outerRadius as number) + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={6}
    />
  );
};

const renderSegmentLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: PieSectorDataItem) => {
  if (percent < 0.06) return null;
  const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.55;
  const radian = (-midAngle * Math.PI) / 180;
  const x = (cx as number) + radius * Math.cos(radian);
  const y = (cy as number) + radius * Math.sin(radian);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const ImprovementBreakdown: React.FC<ImprovementBreakdownProps> = ({
  data,
  loading,
  selectedCauses,
  onCausesChange,
}) => {
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = [
    { name: 'Cải thiện', value: data.improved, color: COLORS.improved },
    { name: 'Ổn định', value: data.stable, color: COLORS.stable },
    { name: 'Giảm sút', value: data.declined, color: COLORS.declined },
  ].filter((item) => item.value > 0);

  const total = data.improved + data.stable + data.declined;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: PieSlice }>;
  }) => {
    if (active && payload && payload.length) {
      const slice = payload[0].payload;
      const percentage = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0';
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            border: `1px solid ${slice.color}`,
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#fff',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {slice.name}
          </Typography>
          <Typography variant="caption">
            {slice.value} BN ({percentage}%)
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = (props: any) => {
    const items = (props.payload ?? []) as Array<{
      color: string;
      value: string;
      payload: { value: number };
    }>;
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        {items.map((entry, index) => (
          <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: entry.color,
              }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
              {entry.value}: {entry.payload.value}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          '&:last-child': { pb: 2 },
        }}
      >
        <Box sx={{ containerType: 'inline-size', width: '100%', mb: 1.25 }}>
          <Typography
            noWrap
            title="Tỉ lệ cải thiện theo nhóm nguyên nhân"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              lineHeight: 1.2,
              color: 'text.primary',
              fontSize: 'clamp(0.75rem, 4.5cqi, 0.875rem)',
            }}
          >
            Tỉ lệ cải thiện theo nhóm nguyên nhân
          </Typography>
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
          <InputLabel>Nguyên nhân</InputLabel>
          <Select
            multiple
            value={selectedCauses}
            label="Nguyên nhân"
            onChange={(e) =>
              onCausesChange(
                typeof e.target.value === 'string'
                  ? e.target.value.split(',')
                  : (e.target.value as string[]),
              )
            }
            renderValue={(selected) => {
              const codes = selected as string[];
              if (codes.length === 0 || codes.length === CAUSES.length) return 'Tất cả';
              if (codes.length === 1) return getCauseLabel(codes[0]);
              return `${codes.length} nguyên nhân`;
            }}
          >
            {CAUSES.map((cause) => (
              <MenuItem key={cause.code} value={cause.code}>
                <Checkbox checked={selectedCauses.includes(cause.code)} size="small" />
                <ListItemText primary={cause.label} primaryTypographyProps={{ variant: 'body2' }} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1.25,
              px: 1,
              bgcolor: 'success.lighter',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark', lineHeight: 1.2 }}>
              {data.improvementRate}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tỷ lệ cải thiện
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1.25,
              px: 1,
              bgcolor: 'info.lighter',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'info.dark', lineHeight: 1.2 }}>
              {data.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tổng bệnh nhân
            </Typography>
          </Box>
        </Box>

        {chartData.length > 0 ? (
          <Box sx={{ position: 'relative', height: CHART_HEIGHT, minHeight: CHART_HEIGHT, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="44%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                  cornerRadius={6}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  label={renderSegmentLabel}
                  labelLine={false}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
            <Box
              sx={{
                position: 'absolute',
                top: '44%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.dark', lineHeight: 1.1 }}>
                {data.improvementRate}%
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                Cải thiện
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              height: CHART_HEIGHT,
              minHeight: CHART_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              flexShrink: 0,
            }}
          >
            <Typography>Chưa có dữ liệu khám</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ImprovementBreakdown;
