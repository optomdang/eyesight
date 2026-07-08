import React, { useState, useEffect } from 'react';
import { Grid, Box, Tabs, Tab } from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import PageContainer from 'src/components/container/PageContainer';
import useSnackbar from 'src/contexts/UseSnackbar';
import {
  getPatientDashboardStats,
  getInactivePatients,
  getExamStats,
  getExerciseStats,
} from 'src/services/dashboard/dashboard.service';
import PatientKPICards from './patient/PatientKPICards';
import PatientActivityChart from './patient/PatientActivityChart';
import AgeCorrelationChart from './patient/AgeCorrelationChart';
import ImprovementBreakdown from './patient/ImprovementBreakdown';
import InactivePatientsTable from './patient/InactivePatientsTable';
import { CAUSE_CODES } from 'src/constants/causes';
import ExamKPICards from './exam/ExamKPICards';
import VisionTypeBreakdown from './exam/VisionTypeBreakdown';
import ExamCompletionTrend from './exam/ExamCompletionTrend';
import ExerciseKPICards from './exercise/ExerciseKPICards';
import ExerciseTypeDistribution from './exercise/ExerciseTypeDistribution';
import ExerciseComplianceByType from './exercise/ExerciseComplianceByType';
import type { PatientKPIData } from 'src/types/admin/dashboard';
import TopPerformersLeaderboard from './exercise/TopPerformersLeaderboard';
import ResizableSplitRow from './ResizableSplitRow';

const DashboardPage: React.FC = () => {
  const { showSnackbar } = useSnackbar();

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Vision type for the patient-stats query (#9 per-type filter dropdown is a future enhancement;
  // currently fixed to 'far').
  const [visionType] = useState('far');
  // Default = ALL causes selected (every checkbox ticked = "Tất cả").
  const [selectedCauses, setSelectedCauses] = useState<string[]>([...CAUSE_CODES]);
  const [inactiveDays, setInactiveDays] = useState(7);
  const [trendDays, setTrendDays] = useState(30);
  // #17 trend bucket selector (Tuần/Tháng/Quý/Năm) — sent to BE as date_trunc unit.
  const [examPeriod, setExamPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Loading states
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingInactive, setLoadingInactive] = useState(false);
  const [loadingExam, setLoadingExam] = useState(false);
  const [loadingExercise, setLoadingExercise] = useState(false);

  // Data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [inactivePatients, setInactivePatients] = useState<any>(null);
  const [examStats, setExamStats] = useState<any>(null);
  const [exerciseStats, setExerciseStats] = useState<any>(null);

  // Pagination for inactive patients
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // NOTE on loading UX: a fetch always flips its loading flag, but widgets only render a skeleton
  // on the INITIAL load (loading && no data yet). On a re-fetch (filter/dropdown change) the data
  // already exists, so widgets keep showing the current values and update in place — no blanking.
  // This mirrors React-Query's isLoading-vs-isFetching without the dependency.
  const fetchDashboardStats = async (
    vType: string = visionType,
    days: number = trendDays,
    causes: string[] = selectedCauses,
  ) => {
    try {
      setLoadingStats(true);
      // "Tất cả" (none or every cause selected) = no filter → BE returns all patients
      // (incl. those without a cause). A strict subset = filter by those causes.
      const effectiveCauses =
        causes.length === 0 || causes.length === CAUSE_CODES.length ? [] : causes;
      const data = await getPatientDashboardStats(vType, days, effectiveCauses);
      setDashboardStats(data);
    } catch (error: any) {
      showSnackbar(error?.message || 'Không thể tải dữ liệu dashboard', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchInactivePatients = async (
    days: number = inactiveDays,
    pg: number = page,
    lmt: number = limit,
  ) => {
    try {
      setLoadingInactive(true);
      const data = await getInactivePatients(days, pg, lmt);
      setInactivePatients(data);
    } catch (error: any) {
      showSnackbar(error?.message || 'Không thể tải danh sách bệnh nhân', 'error');
    } finally {
      setLoadingInactive(false);
    }
  };

  // Exam date window is FIXED (1 year) — the #17 selector only changes the trend BUCKET
  // granularity, it must NOT reload/alter #11/#16 (which are computed over the window).
  const EXAM_LOOKBACK_DAYS = 365;

  // Date string theo GIỜ ĐỊA PHƯƠNG — toISOString() là UTC nên từ 00:00 tới 07:00 (UTC+7)
  // sẽ ra ngày hôm trước → BE cắt range ở 23:59 local hôm trước → dashboard mất sạch
  // dữ liệu tạo sau nửa đêm local.
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const fetchExamStats = async (period: 'week' | 'month' | 'quarter' | 'year' = examPeriod) => {
    try {
      setLoadingExam(true);
      const endDate = toLocalDateStr(new Date());
      const startDate = toLocalDateStr(
        new Date(Date.now() - EXAM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
      );
      const data = await getExamStats(startDate, endDate, 1, 10, period);
      setExamStats(data);
    } catch (error: any) {
      showSnackbar(error?.message || 'Không thể tải thống kê bài kiểm tra', 'error');
    } finally {
      setLoadingExam(false);
    }
  };

  const handleExamPeriodChange = (period: 'week' | 'month' | 'quarter' | 'year') => {
    setExamPeriod(period);
    fetchExamStats(period);
  };

  // Fetch exercise statistics
  const fetchExerciseStats = async () => {
    try {
      setLoadingExercise(true);
      const endDate = toLocalDateStr(new Date());
      const startDate = toLocalDateStr(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const data = await getExerciseStats(startDate, endDate);
      setExerciseStats(data);
      setLoadingExercise(false);
    } catch (error: any) {
      setLoadingExercise(false);
      showSnackbar(error?.message || 'Không thể tải thống kê bài tập', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboardStats();
    fetchInactivePatients();
    fetchExamStats();
    fetchExerciseStats();
  }, []);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCausesChange = (causes: string[]) => {
    setSelectedCauses(causes);
    fetchDashboardStats(visionType, trendDays, causes);
  };

  const handleTrendDaysChange = (newDays: number) => {
    setTrendDays(newDays);
    fetchDashboardStats(visionType, newDays, selectedCauses);
  };

  const handleInactiveDaysChange = (newDays: number) => {
    setInactiveDays(newDays);
    setPage(1);
    fetchInactivePatients(newDays, 1, limit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchInactivePatients(inactiveDays, newPage, limit);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
    fetchInactivePatients(inactiveDays, 1, newLimit);
  };

  // Prepare KPI data (#1–#5 per BU spec — merged from kpi + root stats)
  const kpiData: PatientKPIData | null = dashboardStats
    ? {
        totalPatients: dashboardStats.totalPatients,
        activePatients: dashboardStats.activePatients,
        improvementRate: dashboardStats.kpi?.improvementRate,
        improvedCount: dashboardStats.improvement?.improvedCount,
        avgImprovementLevel: dashboardStats.kpi?.avgImprovementLevel,
        minAge: dashboardStats.ageStats?.minAge,
        maxAge: dashboardStats.ageStats?.maxAge,
        avgAge: dashboardStats.ageStats?.avgAge,
      }
    : null;

  // Show a skeleton only on the FIRST load (no data yet). A re-fetch keeps the current data
  // on screen and updates in place — so changing a dropdown never blanks the tab/widgets.
  const statsInitialLoading = loadingStats && !dashboardStats;
  const inactiveInitialLoading = loadingInactive && !inactivePatients;
  const examInitialLoading = loadingExam && !examStats;
  const exerciseInitialLoading = loadingExercise && !exerciseStats;

  return (
    <PageContainer title="Dashboard" description="System analytics and monitoring">
      <Box>
        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab label="Tổng Quan Bệnh Nhân" />
            <Tab label="Thống Kê Bài Kiểm Tra" />
            <Tab label="Hiệu Suất Bài Tập" />
          </Tabs>
        </Box>

        {/* Patient Overview Tab */}
        {activeTab === 0 && (
          <>
            <LoadingBoundary loading={statsInitialLoading} height="300px">
              <Grid container spacing={3}>
                {/* KPI Cards - Full Width */}
                <Grid size={{ xs: 12 }}>
                  <PatientKPICards
                    data={kpiData}
                    loading={statsInitialLoading}
                    inactivePatientsCount={inactivePatients?.count || 0}
                  />
                </Grid>

                {/* Xu Hướng Hoạt Động và Bảng Xếp Hạng — kéo giữa để đổi tỉ lệ (desktop) */}
                <Grid size={{ xs: 12 }}>
                  <ResizableSplitRow
                    storageKey="dashboard-activity-leaderboard-split"
                    left={
                      <PatientActivityChart
                        data={dashboardStats?.activityTrend || []}
                        loading={statsInitialLoading}
                        trendDays={trendDays}
                        onTrendDaysChange={handleTrendDaysChange}
                      />
                    }
                    right={
                      <TopPerformersLeaderboard
                        data={dashboardStats?.topPerformers || []}
                        loading={statsInitialLoading}
                      />
                    }
                  />
                </Grid>

                {/* Correlation Chart - 8 cols */}
                <Grid size={{ xs: 12, lg: 8 }} sx={{ display: 'flex' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <AgeCorrelationChart />
                  </Box>
                </Grid>

                {/* Improvement Breakdown - 4 cols */}
                <Grid size={{ xs: 12, lg: 4 }} sx={{ display: 'flex' }}>
                  <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    <ImprovementBreakdown
                      data={dashboardStats?.improvement || null}
                      loading={statsInitialLoading}
                      selectedCauses={selectedCauses}
                      onCausesChange={handleCausesChange}
                    />
                  </Box>
                </Grid>

                {/* Inactive Patients Table - Full Width */}
                <Grid size={{ xs: 12 }}>
                  <InactivePatientsTable
                    data={inactivePatients?.rows || []}
                    totalCount={inactivePatients?.count || 0}
                    page={page}
                    limit={limit}
                    loading={inactiveInitialLoading}
                    inactiveDays={inactiveDays}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                    onInactiveDaysChange={handleInactiveDaysChange}
                  />
                </Grid>
              </Grid>
            </LoadingBoundary>
          </>
        )}

        {/* Exam Statistics Tab */}
        {activeTab === 1 && (
          <>
            <LoadingBoundary loading={examInitialLoading} height="300px">
              <Grid container spacing={3}>
                {/* Exam KPI Cards */}
                <Grid size={{ xs: 12 }}>
                  <ExamKPICards
                    testComplianceRate={examStats?.stats?.kpi?.testComplianceRate || 0}
                    improvementByType={dashboardStats?.improvementByType || null}
                    loading={examInitialLoading}
                  />
                </Grid>

                {/* Vision Type Breakdown - 4 cols */}
                <Grid size={{ xs: 12, lg: 4 }}>
                  <VisionTypeBreakdown
                    data={examStats?.stats?.breakdown || []}
                    loading={examInitialLoading}
                  />
                </Grid>

                {/* Exam Completion Trend - 8 cols */}
                <Grid size={{ xs: 12, lg: 8 }}>
                  <ExamCompletionTrend
                    data={examStats?.stats?.trend || []}
                    loading={examInitialLoading}
                    period={examPeriod}
                    onPeriodChange={handleExamPeriodChange}
                  />
                </Grid>
              </Grid>
            </LoadingBoundary>
          </>
        )}

        {/* Exercise Performance Tab */}
        {activeTab === 2 && (
          <>
            <LoadingBoundary loading={exerciseInitialLoading} height="300px">
              <Grid container spacing={3}>
                {/* Exercise KPI Cards */}
                <Grid size={{ xs: 12 }}>
                  <ExerciseKPICards
                    data={exerciseStats?.stats?.kpi || null}
                    loading={exerciseInitialLoading}
                  />
                </Grid>

                {/* #25 Phân Bổ Bài Tập theo loại (bar ngang) */}
                <Grid size={{ xs: 12, lg: 5 }}>
                  <ExerciseTypeDistribution
                    data={exerciseStats?.stats?.distributionByType || []}
                    loading={exerciseInitialLoading}
                  />
                </Grid>

                {/* #26 % Tuân thủ theo loại bài tập */}
                <Grid size={{ xs: 12, lg: 7 }}>
                  <ExerciseComplianceByType
                    data={exerciseStats?.stats?.complianceByType || []}
                    loading={exerciseInitialLoading}
                  />
                </Grid>
                {/* #24 Xu Hướng Hiệu Suất — ĐÃ XÓA theo spec */}
              </Grid>
            </LoadingBoundary>
          </>
        )}
      </Box>
    </PageContainer>
  );
};

export default DashboardPage;
