import React, { useState, useEffect, useMemo } from 'react';
import { Box, Card, CardContent, Divider, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMyExamResults, getMyExerciseSessionsHistory } from 'src/services/patient.service';
import ExerciseSessionProgressChart from 'src/components/shared/ExerciseSessionProgressChart';
import { formatVisionLevel, getVisionExamChartYAxisConfig, mapExamResultLevelsForChart } from 'src/utils/visionUtils';
import dayjs from 'dayjs';

const EXAM_TYPE_LABELS: Record<string, string> = {
  far: 'Thị lực xa',
  near: 'Thị lực gần',
  contrast: 'Độ tương phản',
  stereopsis: 'Thị giác lập thể',
};

const TreatmentProgressCharts: React.FC = () => {
  const [examChartData, setExamChartData] = useState<Record<string, any[]>>({});
  const [exerciseSessions, setExerciseSessions] = useState<any[]>([]);
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>('far');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [examRes, sessionsRes] = await Promise.all([
          getMyExamResults({ limit: 200 }),
          getMyExerciseSessionsHistory({ limit: 500 }),
        ]);

        // ── Exam results ─────────────────────────────────────────────────
        const byType: Record<string, any[]> = {};
        const types = new Set<string>();

        (examRes?.rows ?? []).forEach((result: any) => {
          const examType: string = result.examType;
          const levels = mapExamResultLevelsForChart(examType, result);
          if (!levels) return;

          types.add(examType);
          if (!byType[examType]) byType[examType] = [];

          byType[examType].push({
            date: result.startedAt ? dayjs(result.startedAt).format('DD/MM/YYYY') : '',
            timestamp: result.startedAt ? dayjs(result.startedAt).valueOf() : 0,
            ...levels,
          });
        });

        Object.keys(byType).forEach((t) => byType[t].sort((a, b) => a.timestamp - b.timestamp));

        setExamChartData(byType);
        const typeArr = Array.from(types);
        setAvailableExamTypes(typeArr);
        if (typeArr.length > 0) {
          setSelectedExamType(typeArr.includes('far') ? 'far' : typeArr[0]);
        }

        // ── Exercise sessions ─────────────────────────────────────────────
        setExerciseSessions(sessionsRes?.rows ?? []);
      } catch (err) {
        console.error('Error fetching treatment progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const currentExamData = useMemo(
    () => examChartData[selectedExamType] ?? [],
    [examChartData, selectedExamType]
  );

  const examYAxis = useMemo(
    () => getVisionExamChartYAxisConfig(selectedExamType, currentExamData),
    [selectedExamType, currentExamData]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  const hasExamData = availableExamTypes.length > 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Biểu đồ kết quả kiểm tra thị lực */}
      {hasExamData && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Lịch Sử Kiểm Tra Thị Lực
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Tabs
              value={selectedExamType}
              onChange={(_, v) => setSelectedExamType(v)}
              sx={{ mb: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {availableExamTypes.map((type) => (
                <Tab key={type} value={type} label={EXAM_TYPE_LABELS[type] ?? type} />
              ))}
            </Tabs>

            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentExamData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    ticks={examYAxis.ticks}
                    domain={examYAxis.domain}
                    allowDecimals={examYAxis.allowDecimals}
                    reversed={examYAxis.reversed}
                    tickFormatter={examYAxis.tickFormatter}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: string) => [
                      value == null ? '—' : formatVisionLevel(selectedExamType, value as number),
                      name,
                    ]}
                  />
                  <Legend />
                  {selectedExamType === 'stereopsis' ? (
                    <Line
                      type="monotone"
                      dataKey="bothEye"
                      stroke="#9C27B0"
                      strokeWidth={2}
                      name="Cả hai mắt"
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="leftEye"
                        stroke="#2196F3"
                        strokeWidth={2}
                        name="Mắt trái"
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="rightEye"
                        stroke="#4CAF50"
                        strokeWidth={2}
                        name="Mắt phải"
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Biểu đồ tiến độ bài tập — luôn hiện (tự render empty state khi chưa có buổi tập) */}
      <ExerciseSessionProgressChart sessions={exerciseSessions} />

    </Box>
  );
};

export default TreatmentProgressCharts;
