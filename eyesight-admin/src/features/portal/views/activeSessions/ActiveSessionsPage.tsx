import React from 'react';
import { Box, Button, Chip, Typography, Tooltip } from '@mui/material';
import { IconPlayerPlay, IconHistory } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import { MUIDataTableColumnDef } from 'mui-datatables';
import { useDataTable } from 'src/contexts/data-context/useDataTable';
import PageContainer from 'src/components/container/PageContainer';
import { createNestedColumn } from 'src/utils/tableColumnUtils';
import { TableHeaderWithHelp } from 'src/components/shared/HelpTooltip';
import type { PortalExerciseAssignment } from 'src/types/core/portal';

const COMPLIANCE_COLUMN_HELP =
  'Tiến độ tuân thủ từ lúc được giao bài đến hôm nay. ' +
  'Tính theo số buổi đạt chuẩn ÷ số buổi kỳ vọng × 100; buổi kỳ vọng theo tần suất (hằng ngày = số ngày kể từ ngày giao). ' +
  'Buổi đang tập dở được tính theo phần lượt đạt chuẩn (ví dụ 1/2 lượt → 50% của một buổi). ' +
  'Một lượt đạt chuẩn khi tập ≥ 80% thời gian giao cho lượt đó.';

const SESSION_COMPLETION_COLUMN_HELP =
  'Tiến độ buổi tập hôm nay: số lượt đạt chuẩn ÷ tổng lượt bắt buộc trong phiên hiện tại. ' +
  'Một lượt đạt chuẩn khi tập ≥ 80% thời gian giao cho lượt đó. ' +
  'Dừng sớm hơn vẫn được lưu nhưng chưa tính vào số lượt đạt chuẩn.';

const resolveRequiredExecutions = (assignment: PortalExerciseAssignment): number =>
  assignment.exerciseConfig?.executionCount ?? assignment.currentSession?.executionCount ?? 1;

const isCurrentSessionFullyComplete = (assignment: PortalExerciseAssignment): boolean => {
  const session = assignment.currentSession;
  if (!session) return false;
  const required = resolveRequiredExecutions(assignment);
  const valid = session.validExecutions ?? 0;
  return valid >= required && valid > 0;
};

const ActiveSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { dataRes, tableState, onTableChange, loading } = useDataTable<PortalExerciseAssignment>();

  // Session status based on currentSession - đây là trạng thái hiển thị chính
  const getSessionStatusChip = (assignment: PortalExerciseAssignment) => {
    const session = assignment.currentSession;
    if (!session) {
      return <Chip label="Chưa hoàn thành" color="warning" size="small" />;
    }
    if (isCurrentSessionFullyComplete(assignment)) {
      return <Chip label="Đã hoàn thành" color="success" size="small" />;
    }
    return <Chip label="Chưa hoàn thành" color="warning" size="small" />;
  };

  // Navigation handlers
  const handleExecuteExercise = (assignment: PortalExerciseAssignment) => {
    if (assignment.currentSession) {
      navigate(
        `/portal/exercise/assignments/${assignment.id}/sessions/${assignment.currentSession.id}`
      );
    } else {
      console.error('No active session found for assignment', assignment.id);
    }
  };

  const handleViewHistory = (assignment: PortalExerciseAssignment) => {
    navigate(`/portal/assignments/${assignment.id}/sessions`);
  };

  const columns: MUIDataTableColumnDef[] = [
    createNestedColumn('exerciseConfig.exercise.name', 'Bài tập', 'N/A', { sort: false }),
    {
      name: 'trainingEye',
      label: 'Mắt',
      options: {
        filter: true,
        sort: false,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const eye = assignment?.trainingEye || assignment?.exerciseConfig?.eye;
          switch (eye) {
            case 'left':
              return 'Trái';
            case 'right':
              return 'Phải';
            case 'both':
              return 'Cả hai';
            default:
              return eye || 'Cả hai';
          }
        },
      },
    },
    {
      name: 'exerciseConfig.frequency',
      label: 'Tần suất',
      options: {
        filter: true,
        sort: false,
        customBodyRender: (value: string) => {
          const frequencyMap: Record<string, string> = {
            daily: 'Hằng ngày',
            weekly: 'Hằng tuần',
            monthly: 'Hằng tháng',
            quarterly: 'Hằng quý',
            yearly: 'Hằng năm',
          };
          return frequencyMap[value] || value;
        },
      },
    },
    {
      name: 'status',
      label: 'Trạng thái',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          return getSessionStatusChip(assignment);
        },
      },
    },
    {
      name: 'compliancePercentage',
      label: (
        <TableHeaderWithHelp help={COMPLIANCE_COLUMN_HELP}>% Tuân thủ</TableHeaderWithHelp>
      ),
      options: {
        filter: false,
        // Portal API only allows sortBy=assignedAt|lastCompletedAt — sorting this
        // column used to 400 and leave the table looking empty.
        sort: false,
        customBodyRender: (value: number | null) => {
          if (value === null || value === undefined)
            return (
              <Typography variant="body2" color="text.secondary">
                -
              </Typography>
            );
          const color = value >= 80 ? 'success.main' : value >= 50 ? 'warning.main' : 'error.main';
          return (
            <Typography variant="body2" fontWeight="medium" color={color}>
              {value}%
            </Typography>
          );
        },
      },
    },
    {
      name: 'currentSession.validExecutions',
      label: (
        <TableHeaderWithHelp help={SESSION_COMPLETION_COLUMN_HELP}>
          Phiên hoàn thành
        </TableHeaderWithHelp>
      ),
      options: {
        filter: false,
        sort: false,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const passed = assignment?.currentSession?.validExecutions ?? 0;
          const required = resolveRequiredExecutions(assignment);
          return (
            <Typography variant="body2">
              {passed}/{required} lần
            </Typography>
          );
        },
      },
    },
    {
      name: 'actions',
      label: 'Thao tác',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const sessionCompleted = isCurrentSessionFullyComplete(assignment);
          const hasActiveSession = assignment?.currentSession && !sessionCompleted;

          return (
            <Box display="flex" gap={1}>
              <Tooltip
                title={
                  sessionCompleted
                    ? 'Đã hoàn thành hôm nay'
                    : hasActiveSession
                      ? 'Thực hiện bài tập'
                      : 'Không có phiên hoạt động'
                }
              >
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<IconPlayerPlay size={16} />}
                    onClick={() => handleExecuteExercise(assignment)}
                    disabled={!hasActiveSession}
                  >
                    Thực hiện
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Xem lịch sử">
                <Button
                  variant="outlined"
                  color="secondary"
                  size="small"
                  startIcon={<IconHistory size={16} />}
                  onClick={() => handleViewHistory(assignment)}
                >
                  Lịch sử
                </Button>
              </Tooltip>
            </Box>
          );
        },
      },
    },
  ];

  return (
    <PageContainer title="Danh sách bài tập" description="Các bài tập cần thực hiện">
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight={600}>
            Danh sách bài tập
          </Typography>
        </Box>

        <CustomDataTable
          title=""
          dataRes={dataRes}
          columns={columns}
          tableState={tableState}
          onTableChange={onTableChange}
          loading={loading}
        />
      </Box>
    </PageContainer>
  );
};

export default ActiveSessionsPage;
