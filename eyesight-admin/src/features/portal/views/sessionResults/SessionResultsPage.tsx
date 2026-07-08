import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import PortalBreadcrumb from 'src/components/shared/PortalBreadcrumb';
import { MUIDataTableColumnDef } from 'mui-datatables';
import type { ExerciseResult } from 'src/types/core';
import { createDateColumn, createSortableColumn } from 'src/utils/tableColumnUtils';
import { getData } from 'src/utils/request';
import { useTranslation } from 'src/hooks/useTranslation';

interface SessionSummary {
  status?: 'incomplete' | 'completed';
  validExecutions: number;
  executionsCompleted: number;
  requiredExecutions: number;
  /** Phút/lượt yêu cầu (snapshot trên session hoặc config). */
  executionDuration: number;
}

/** % hoàn thành một lượt theo thời gian (cùng công thức BE exerciseSlotCompletionPct). */
const computeSlotCompletionPct = (
  durationSec: number | null | undefined,
  assignedDurationMin: number
): number | null => {
  const assignedSec = Number(assignedDurationMin) * 60;
  const actual = Math.max(0, durationSec ?? 0);
  if (!Number.isFinite(assignedSec) || assignedSec <= 0) {
    return actual > 0 ? 100 : null;
  }
  return Math.min(100, Math.round((actual / assignedSec) * 100));
};

const formatPct = (value: number | null | undefined): string =>
  value != null ? `${value}%` : '—';

const SessionResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId, sessionId } = useParams<{ assignmentId: string; sessionId: string }>();
  const { t } = useTranslation();

  const [dataRes, setDataRes] = useState<{
    rows: ExerciseResult[];
    count: number;
    totalPages: number;
  }>({
    rows: [],
    count: 0,
    totalPages: 0,
  });
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableState, setTableState] = useState({ page: 0, limit: 10, sortOrder: {} });

  const fetchSessionSummary = useCallback(async () => {
    if (!assignmentId || !sessionId) return;

    try {
      const response = await getData<any>(
        `me/assignments/${assignmentId}/sessions?page=1&limit=100`
      );
      const session = (response?.rows || []).find(
        (row: any) => String(row?.id) === String(sessionId)
      );

      if (!session) {
        setSessionSummary(null);
        return;
      }

      const executionDuration =
        Number(session.executionDuration) ||
        Number(session.exerciseAssignment?.exerciseConfig?.duration) ||
        0;

      setSessionSummary({
        status: session.status,
        validExecutions: session.validExecutions || 0,
        executionsCompleted: session.executionsCompleted || 0,
        requiredExecutions: session.exerciseAssignment?.exerciseConfig?.executionCount || 1,
        executionDuration,
      });
    } catch (error) {
      console.error('Error fetching session summary:', error);
      setSessionSummary(null);
    }
  }, [assignmentId, sessionId]);

  const fetchResults = useCallback(async () => {
    if (!assignmentId || !sessionId) return;

    setLoading(true);
    try {
      const response = await getData<any>(
        `me/assignments/${assignmentId}/sessions/${sessionId}/results?page=${tableState.page + 1}&limit=${tableState.limit}`
      );
      setDataRes({
        rows: response.rows || [],
        count: response.count || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (error) {
      console.error('Error fetching session results:', error);
      setDataRes({ rows: [], count: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [assignmentId, sessionId, tableState.page, tableState.limit]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    fetchSessionSummary();
  }, [fetchSessionSummary]);

  const onTableChange = (action: string, newTableState: any) => {
    if (action === 'changePage') {
      setTableState((prev) => ({ ...prev, page: newTableState.page }));
    } else if (action === 'changeRowsPerPage') {
      setTableState((prev) => ({ ...prev, limit: newTableState.rowsPerPage, page: 0 }));
    }
  };

  const columns: MUIDataTableColumnDef[] = [
    createDateColumn('createdAt', 'Thời gian', 'vi-VN', { includeTime: true }),
    createSortableColumn('score', 'Điểm số', {
      filter: false,
      customBodyRender: (value: number) => value?.toLocaleString('vi-VN') || '0',
    }),
    createSortableColumn('accuracy', 'Độ chính xác', {
      filter: false,
      customBodyRender: (value: number) => `${Math.round((value || 0) * 100)}%`,
    }),
    createSortableColumn('duration', 'Thời gian (s)', {
      filter: false,
      customBodyRender: (value: number) => `${value || 0}s`,
    }),
    {
      name: 'completionPct',
      label: t('sessionResults.completionLabel', '% hoàn thành'),
      options: {
        filter: false,
        sort: false,
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes.rows[dataIndex];
          const assignedMin = sessionSummary?.executionDuration ?? 0;
          return formatPct(computeSlotCompletionPct(row?.duration, assignedMin));
        },
      },
    },
    {
      name: 'focusScore',
      label: t('sessionResults.focusLabel', '% tập trung'),
      options: {
        filter: false,
        sort: true,
        customBodyRenderLite: (dataIndex: number) => {
          const row = dataRes.rows[dataIndex];
          return formatPct(row?.focusScore ?? null);
        },
      },
    },
  ];

  const breadcrumbItems = [
    {
      label: 'Assignment',
      onClick: () => navigate('/portal/exercises'),
    },
    {
      label: assignmentId,
      onClick: () => navigate(`/portal/assignments/${assignmentId}/sessions`),
    },
    {
      label: 'Session',
    },
    {
      label: sessionId,
      // No onClick - already on this page's results
    },
    {
      label: 'Results',
    },
  ];

  return (
    <Box>
      <PortalBreadcrumb items={breadcrumbItems} />

      {sessionSummary && (
        <Alert severity={sessionSummary.status === 'completed' ? 'success' : 'info'} sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Typography variant="body2" fontWeight={600}>
              {t('sessionResults.sessionStatusLabel', 'Trạng thái phiên')}:{' '}
              {sessionSummary.status === 'completed'
                ? t('common.completed', 'Hoàn thành')
                : t('common.incomplete', 'Chưa hoàn thành')}
            </Typography>
            <Typography variant="body2">
              {t('sessionResults.progressLabel', 'Tiến độ hợp lệ')}:{' '}
              {sessionSummary.validExecutions}/{sessionSummary.requiredExecutions}
            </Typography>
            <Typography variant="body2">
              {t('sessionResults.executionsLabel', 'Tổng lần đã chơi')}:{' '}
              {sessionSummary.executionsCompleted}
            </Typography>
          </Stack>
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t(
          'sessionResults.noteAttemptVsSession',
          'Bảng dưới là kết quả theo từng lần chơi; trạng thái phiên tổng được hiển thị ở phần tóm tắt phía trên.'
        )}
      </Typography>

      <CustomDataTable
        title={`Chi tiết các lần thực hiện - Session ${sessionId}`}
        dataRes={dataRes}
        loading={loading}
        tableState={tableState}
        columns={columns}
        onTableChange={onTableChange}
        options={{
          selectableRows: 'none',
          rowsPerPageOptions: [10, 25, 50],
          elevation: 0,
        }}
      />
    </Box>
  );
};

export default SessionResultsPage;
