/**
 * ExerciseSessionProgressChart
 *
 * Shared chart dùng cho cả trang bác sĩ (TreatmentPlanTab) lẫn portal bệnh nhân
 * (TreatmentProgressCharts). Mỗi điểm dữ liệu = 1 ExerciseSession hoàn thành.
 *
 * Multi cấu hình: mỗi ExerciseAssignment hiển thị 1 biểu đồ con (small multiples)
 * vì khác visionType → ký hiệu độ khó & thang điểm khác nhau, không gộp chung trục.
 *
 * Mỗi biểu đồ con:
 *   Trục X      : ngày thực hiện (categorical, chỉ ngày có buổi tập)
 *   Trục Y trái : Điểm trung bình (Bar)
 *   Trục Y phải : % (Thời gian thực hiện & Mức độ tập trung — Line)
 *   Label Bar   : Độ khó (visionLevel đã định dạng theo visionType)
 *
 * Toàn bộ dữ liệu đọc từ SESSION (snapshot). Không fetch ExerciseResult.
 *
 * Props:
 *   sessions   — mảng session thô từ API (rows)
 *   loading    — hiển thị skeleton khi đang tải
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from '@mui/material';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import { formatVisionLevel } from 'src/utils/visionUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawSession {
  id: number;
  exerciseAssignmentId: number;
  completedAt?: string | null;
  averageScore?: number | null;
  /** Σ active seconds — server snapshot (đã = tổng ExerciseResult.duration). */
  duration?: number | null;
  /** Phút/lượt yêu cầu (snapshot lúc tạo buổi). */
  executionDuration?: number | null;
  /** Số lượt yêu cầu (snapshot lúc tạo buổi). */
  executionCount?: number | null;
  /** 0–100, server-computed. */
  focusScore?: number | null;
  /** Độ khó snapshot lúc thực hiện buổi. */
  visionLevel?: number | null;
  exerciseAssignment?: {
    /** Per-patient eye override; chart title prefers this over config.eye. */
    trainingEye?: string | null;
    exerciseConfig?: {
      id?: number;
      name?: string | null;
      visionType?: string | null;
      eye?: string | null;
      frequency?: string | null;
    } | null;
  } | null;
}

interface ChartPoint {
  dateLabel: string;
  fullDate: string;
  timestamp: number;
  averageScore: number;
  timePercent: number | null;
  focusScore: number | null;
  difficultyLabel: string;
}

interface AssignmentGroup {
  assignmentId: number;
  name: string;
  visionType: string;
  colorIndex: number;
  points: ChartPoint[];
}

interface ExerciseSessionProgressChartProps {
  sessions: RawSession[];
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERIES_COLORS = [
  '#9C27B0',
  '#2196F3',
  '#4CAF50',
  '#FF5722',
  '#00ACC1',
  '#8D6E63',
  '#7CB342',
  '#F06292',
];

const TIME_COLOR = '#FF9800';
const FOCUS_COLOR = '#00BCD4';
const ALL_KEY = '__all__';

const ChartLegendItem: React.FC<{
  color: string;
  label: string;
  variant: 'line' | 'bar';
}> = ({ color, label, variant }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
    {variant === 'line' ? (
      <Box
        component="span"
        sx={{
          width: 20,
          height: 0,
          borderTop: `2px solid ${color}`,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
          },
        }}
      />
    ) : (
      <Box component="span" sx={{ width: 12, height: 12, borderRadius: 0.5, backgroundColor: color }} />
    )}
    <Typography component="span" variant="caption" sx={{ color, lineHeight: 1.2 }}>
      {label}
    </Typography>
  </Box>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatEyeLabel = (eye?: string | null): string => {
  if (eye === 'right') return 'Mắt phải';
  if (eye === 'left') return 'Mắt trái';
  if (eye === 'both') return 'Cả hai mắt';
  return '';
};

/** Nhãn trục X thích nghi theo chu kỳ: monthly+ → MM/YYYY; còn lại → DD/MM/YYYY. */
const formatAxisDate = (ts: number, frequency?: string | null): string => {
  if (frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') {
    return dayjs(ts).format('MM/YYYY');
  }
  return dayjs(ts).format('DD/MM/YYYY');
};

const safePct = (value: number | null | undefined): string =>
  value != null ? `${value}%` : '-';

/**
 * Chỉ số 2 — Thời gian thực hiện %.
 * = duration / (executionDuration × executionCount × 60) × 100. KHÔNG cap (K1):
 * hệ thống đảm bảo ≤ 100 theo bất biến; nếu > 100 → lộ bug, không che.
 */
const computeTimePercent = (s: RawSession): number | null => {
  const { executionDuration, executionCount, duration } = s;
  if (executionDuration == null || executionCount == null || duration == null) return null;
  // DECIMAL cột (executionDuration/averageScore…) có thể về dưới dạng string ("10.00") → ép số.
  const requiredSec = Number(executionDuration) * Number(executionCount) * 60;
  const activeSec = Number(duration);
  if (!Number.isFinite(requiredSec) || requiredSec <= 0 || !Number.isFinite(activeSec)) return null;
  return Math.round((activeSec / requiredSec) * 100);
};

// ---------------------------------------------------------------------------
// Sub-component: 1 biểu đồ con cho 1 assignment
// ---------------------------------------------------------------------------

const AssignmentProgressChart: React.FC<{ group: AssignmentGroup }> = ({ group }) => {
  const barColor = SERIES_COLORS[group.colorIndex % SERIES_COLORS.length];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const pt: ChartPoint = payload[0]?.payload;
    if (!pt) return null;
    return (
      <Box
        sx={{
          p: 1.5,
          backgroundColor: 'rgba(255,255,255,0.97)',
          border: '1px solid #ddd',
          borderRadius: 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          minWidth: 210,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {pt.fullDate}
        </Typography>
        <Typography variant="caption" display="block">
          Điểm trung bình: <strong>{pt.averageScore}</strong>
        </Typography>
        <Typography variant="caption" display="block">
          Thời gian thực hiện: <strong>{safePct(pt.timePercent)}</strong>
        </Typography>
        <Typography variant="caption" display="block">
          Mức độ tập trung: <strong>{safePct(pt.focusScore)}</strong>
        </Typography>
        <Typography variant="caption" display="block">
          Độ khó: <strong>{pt.difficultyLabel}</strong>
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {group.name}
      </Typography>
      <Box sx={{ height: 300, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={group.points} margin={{ top: 28, right: 28, left: 8, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              height={40}
              tickMargin={8}
            />

            {/* Y trái — điểm */}
            <YAxis
              yAxisId="score"
              orientation="left"
              tick={{ fontSize: 11 }}
              allowDecimals={false}
              label={{ value: 'Điểm', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />

            {/* Y phải — phần trăm */}
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              label={{ value: '%', angle: 90, position: 'insideRight', fontSize: 12 }}
            />

            <Tooltip isAnimationActive={false} content={<CustomTooltip />} />

            {/* Bar — điểm trung bình; nhãn độ khó trên đầu cột */}
            <Bar
              yAxisId="score"
              dataKey="averageScore"
              name="Điểm trung bình"
              maxBarSize={48}
              radius={[3, 3, 0, 0]}
              fill={barColor}
              fillOpacity={0.85}
            >
              <LabelList
                dataKey="difficultyLabel"
                position="top"
                style={{ fontSize: 10, fill: '#555', fontWeight: 600 }}
              />
            </Bar>

            {/* Line — thời gian thực hiện (%) */}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="timePercent"
              name="Thời gian thực hiện (%)"
              stroke={TIME_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: TIME_COLOR }}
              connectNulls
            />

            {/* Line — mức độ tập trung (%) */}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="focusScore"
              name="Mức độ tập trung (%)"
              stroke={FOCUS_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: FOCUS_COLOR }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          mt: 3,
          pt: 0.5,
          px: 1,
        }}
      >
        <ChartLegendItem color={FOCUS_COLOR} variant="line" label="Mức độ tập trung (%)" />
        <ChartLegendItem color={TIME_COLOR} variant="line" label="Thời gian thực hiện (%)" />
        <ChartLegendItem color={barColor} variant="bar" label="Điểm trung bình" />
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExerciseSessionProgressChart: React.FC<ExerciseSessionProgressChartProps> = ({
  sessions,
  loading = false,
}) => {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(ALL_KEY);

  // ── Group sessions theo assignment → mỗi nhóm 1 biểu đồ con ───────────────
  const groups = useMemo<AssignmentGroup[]>(() => {
    const map = new Map<number, AssignmentGroup>();

    sessions
      .filter((s) => !!s.completedAt)
      .forEach((s) => {
        const id = s.exerciseAssignmentId;
        const config = s.exerciseAssignment?.exerciseConfig;
        const visionType = config?.visionType ?? '';
        const frequency = config?.frequency;

        if (!map.has(id)) {
          const eyeLabel = formatEyeLabel(
            s.exerciseAssignment?.trainingEye ?? config?.eye
          );
          const displayName =
            [config?.name, eyeLabel].filter(Boolean).join(' — ') || `Bài tập ${id}`;
          map.set(id, {
            assignmentId: id,
            name: displayName,
            visionType,
            colorIndex: map.size,
            points: [],
          });
        }

        const ts = dayjs(s.completedAt).valueOf();
        map.get(id)!.points.push({
          dateLabel: formatAxisDate(ts, frequency),
          fullDate: dayjs(s.completedAt).format('DD/MM/YYYY'),
          timestamp: ts,
          averageScore: Number(s.averageScore ?? 0),
          timePercent: computeTimePercent(s),
          focusScore: s.focusScore ?? null,
          difficultyLabel:
            s.visionLevel != null ? formatVisionLevel(visionType, s.visionLevel) : '-',
        });
      });

    const result = Array.from(map.values());
    result.forEach((g) => g.points.sort((a, b) => a.timestamp - b.timestamp));
    return result;
  }, [sessions]);

  // ── Nhóm hiển thị theo filter ─────────────────────────────────────────────
  const visibleGroups = useMemo(() => {
    if (selectedAssignmentId === ALL_KEY) return groups;
    const id = parseInt(selectedAssignmentId, 10);
    return groups.filter((g) => g.assignmentId === id);
  }, [groups, selectedAssignmentId]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />;
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Tiến độ bài tập theo thời gian — Các chỉ số đánh giá</Typography>

          {groups.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Bài tập</InputLabel>
              <Select
                value={selectedAssignmentId}
                label="Bài tập"
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
              >
                <MenuItem value={ALL_KEY}>Tất cả</MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g.assignmentId} value={String(g.assignmentId)}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {groups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography variant="body2">Chưa có dữ liệu phiên bài tập.</Typography>
          </Box>
        ) : (
          visibleGroups.map((g) => <AssignmentProgressChart key={g.assignmentId} group={g} />)
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseSessionProgressChart;
