import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Alert } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import {
  IconEye,
  IconActivity,
  IconTrophy,
  IconFlame,
  IconClock,
} from '@tabler/icons-react';
import PageContainer from 'src/components/container/PageContainer';
import useAuth from 'src/contexts/authGuard/useAuth';
import { useTranslation } from 'src/hooks/useTranslation';
import {
  getMyAssignmentStats,
  getMyPatientInfo,
  getMyExerciseResults,
  getMyLeaderboard,
} from 'src/services/patient.service';
import { formatVisionLevel } from 'src/utils/visionUtils';
import StatCard from './components/StatCard';
import ScoreTrendChart from './components/ScoreTrendChart';
import TodaySessionsList from './components/TodaySessionsList';
import StreakAndAchievements from './components/StreakAndAchievements';
import TreatmentProgressCharts from './components/TreatmentProgressCharts';
import WarrantyPendingBanner from './components/WarrantyPendingBanner';
// Reuse the admin leaderboard component as-is (BU: dùng lại y hệt)
import TopPerformersLeaderboard from 'src/features/admin/dashboard/exercise/TopPerformersLeaderboard';
import type { AssignmentStats, ExerciseResult, PatientInfo, ScoreTrendData } from 'src/types/core';

const PortalHomePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrendData[]>([]);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [averageFocusScore, setAverageFocusScore] = useState(0);
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch all data in parallel via services
      const [statsData, infoData, resultsData, leaderboardData] = await Promise.all([
        getMyAssignmentStats(),
        getMyPatientInfo(),
        getMyExerciseResults({ sortBy: 'completedAt', order: 'desc', limit: 100 }),
        getMyLeaderboard().catch(() => []),
      ]);

      setStats(statsData);
      setPatientInfo(infoData);
      setLeaderboard(leaderboardData);

      // Calculate score trend (last 30 days)
      const trendData = calculateScoreTrend(resultsData.rows);
      setScoreTrend(trendData);

      // Calculate streak
      const { currentStreak, longestStreak: maxStreak } = calculateStreak(resultsData.rows);
      setStreak(currentStreak);
      setLongestStreak(maxStreak);
      setAverageFocusScore(calculateAverageFocusScore(resultsData.rows));

      // Calculate weekly active days (unique days in current ISO week with completed exercises)
      setWeeklyActiveDays(calculateWeeklyActiveDays(resultsData.rows));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScoreTrend = (results: ExerciseResult[]): ScoreTrendData[] => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Key bằng ISO date (YYYY-MM-DD) để sort chính xác, display label riêng
    const dailyData: { [isoDate: string]: { total: number; count: number; label: string } } = {};

    results.forEach((result) => {
      if (!result.completedAt) return;
      const date = new Date(result.completedAt);
      if (date >= last30Days) {
        const isoDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
        const label = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (!dailyData[isoDate]) {
          dailyData[isoDate] = { total: 0, count: 0, label };
        }
        if (typeof result.score === 'number') {
          dailyData[isoDate].total += result.score;
        }
        dailyData[isoDate].count++;
      }
    });

    return Object.entries(dailyData)
      .sort(([isoA], [isoB]) => isoA.localeCompare(isoB))
      .map(([, data]) => ({
        date: data.label,
        score: Math.round(data.total / data.count),
        sessionCount: data.count,
      }));
  };

  const calculateStreak = (
    results: ExerciseResult[]
  ): { currentStreak: number; longestStreak: number } => {
    if (results.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Group by date
    const dateSet = new Set(
      results.filter((r) => r.completedAt).map((r) => new Date(r.completedAt!).toDateString())
    );
    const sortedDates = Array.from(dateSet)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Check if today or yesterday has activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (sortedDates[0] >= yesterday) {
      currentStreak = 1;

      // Calculate current streak
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.floor(
          (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.floor(
        (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak, 1);

    return { currentStreak, longestStreak };
  };

  /** TB % tập trung các lượt đã hoàn thành (cùng nguồn dữ liệu với streak). */
  const calculateAverageFocusScore = (results: ExerciseResult[]): number => {
    const scores = results
      .filter((r) => r.status === 'completed' && r.focusScore != null)
      .map((r) => Number(r.focusScore));
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const calculateWeeklyActiveDays = (results: ExerciseResult[]): number => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const activeDates = new Set(
      results
        .filter((r) => r.completedAt && new Date(r.completedAt) >= startOfWeek)
        .map((r) => new Date(r.completedAt!).toDateString())
    );

    return activeDates.size;
  };

  const getMotivationalMessage = (streak: number, avgScore: number): string => {
    if (streak >= 30) return 'Tuyệt vời! Bạn đang duy trì phong độ rất tốt!';
    if (streak >= 14) return 'Xuất sắc! Tiếp tục phát huy!';
    if (streak >= 7) return 'Rất tốt! Bạn đang tiến bộ mỗi ngày!';
    if (avgScore >= 90) return 'Thành tích của bạn đang rất ấn tượng!';
    if (avgScore >= 70) return 'Tiếp tục cố gắng, bạn làm rất tốt!';
    return 'Hãy cùng nhau tiến bộ mỗi ngày!';
  };

  const incompleteCount = stats?.assignments.filter((a) => !a.isCompleted).length || 0;
  const totalToday = stats?.assignments.length || 0;

  const currentVisionLeft = patientInfo?.examResults?.far?.currentResult?.leftEye;
  const visionDisplay = currentVisionLeft ? formatVisionLevel('far', currentVisionLeft) : '--';

  const lastExamDate = patientInfo?.examResults?.far?.lastExamDate
    ? new Date(patientInfo.examResults.far.lastExamDate).toLocaleDateString('vi-VN')
    : null;

  return (
    <PageContainer title={t('portal.title')} description={t('portal.description')}>
      <Box>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Chào {user?.name}!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {getMotivationalMessage(streak, stats?.summary.averageScore || 0)}
          </Typography>
        </Box>

        <WarrantyPendingBanner />

        {/* Stats Overview */}
        <LoadingBoundary loading={loading} height="400px">
          <>
            {/* Today's Tasks Alert */}
            {incompleteCount > 0 && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Hôm nay bạn cần hoàn thành{' '}
                  <strong>
                    {incompleteCount}/{totalToday}
                  </strong>{' '}
                  buổi tập
                </Typography>
              </Alert>
            )}

            {/* KPI Cards with Streak */}
            {stats && (
              <>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <StatCard
                      title="Bài Tập Hoạt Động"
                      value={stats.summary.activeAssignments}
                      icon={IconActivity}
                      color="primary.main"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <StatCard
                      title="Thời Gian Tập"
                      value={Math.round((stats.summary.totalTime || 0) / 60) + 'm'}
                      subtitle="Tổng thời gian"
                      icon={IconClock}
                      color="secondary.main"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <StatCard
                      title="Bài Tập Trong Ngày"
                      value={`${stats.assignments.filter((a) => a.isCompleted).length}/${stats.assignments.length}`}
                      icon={IconTrophy}
                      color="success.main"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <StatCard
                      title="Chuỗi Ngày"
                      value={streak}
                      subtitle={`Kỷ lục: ${longestStreak}`}
                      icon={IconFlame}
                      color="error.main"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                    <StatCard
                      title="Thị Lực"
                      value={visionDisplay}
                      subtitle={lastExamDate || undefined}
                      icon={IconEye}
                      color="warning.main"
                    />
                  </Grid>
                </Grid>

                {/* Weekly Progress Bar */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Tiến Độ Tuần Này
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {weeklyActiveDays >= 7
                          ? 'Hoàn thành!'
                          : `${weeklyActiveDays}/7 ngày`}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 4, height: 8 }}>
                      <Box
                        sx={{
                          width: `${Math.min((weeklyActiveDays / 7) * 100, 100)}%`,
                          bgcolor: 'primary.main',
                          height: 8,
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Cột trái: buổi tập hôm nay + chuỗi/thành tích (dồn sang trái cho gọn).
                Cột phải: bảng xếp hạng toàn hệ thống (dùng lại component admin). */}
            {stats && (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TodaySessionsList
                      sessions={stats.assignments.map((a) => ({
                        assignmentId: a.assignmentId,
                        exerciseName: a.exerciseName,
                        frequency: a.frequency,
                        todayCompleted: a.todayCompleted,
                        todayRequired: a.todayRequired,
                        isCompleted: a.isCompleted,
                        currentSessionId: a.currentSessionId,
                        complianceStatus: a.complianceStatus,
                      }))}
                      loading={loading}
                    />
                    <StreakAndAchievements
                      streak={streak}
                      longestStreak={longestStreak}
                      totalSessions={stats.summary.totalSessions}
                      averageFocusScore={averageFocusScore}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TopPerformersLeaderboard data={leaderboard} loading={loading} />
                </Grid>
              </Grid>
            )}

            {/* Treatment Progress Charts (exam vision + exercise progress) */}
            <Box sx={{ mb: 3 }}>
              <TreatmentProgressCharts />
            </Box>

            {/* Score Trend Chart - cuối trang */}
            {scoreTrend.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <ScoreTrendChart data={scoreTrend} loading={loading} />
              </Box>
            )}
          </>
        </LoadingBoundary>

        {/* Tips Section */}
        {/* <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" component="div">
            <strong>💡 Mẹo:</strong> Thực hiện bài tập thường xuyên 15-20 phút mỗi ngày để đạt hiệu quả tốt nhất trong việc cải thiện thị lực.
          </Typography>
        </Alert> */}

        {/* Status Summary */}
        {/* <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tình trạng hiện tại
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    --
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Bài tập đang thực hiện
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    --
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Bài tập đã hoàn thành
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    --
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Lần kiểm tra gần nhất
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    --
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Điểm trung bình
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card> */}
      </Box>
    </PageContainer>
  );
};

export default PortalHomePage;
