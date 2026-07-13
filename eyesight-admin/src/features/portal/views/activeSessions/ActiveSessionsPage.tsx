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
  'Tỷ lệ buổi hoàn thành đủ chuẩn từ lúc được giao bài đến hôm nay. ' +
  'Công thức: số buổi hoàn thành ÷ số buổi kỳ vọng × 100. ' +
  'Số buổi kỳ vọng tính theo tần suất giao (ví dụ hằng ngày = số ngày kể từ ngày giao). ' +
  'Buổi hoàn thành = đủ tất cả lượt bắt buộc, mỗi lượt tập ≥ 80% thời gian giao.';

const SESSION_COMPLETION_COLUMN_HELP =
  'Tiến độ buổi tập hôm nay: số lượt đạt chuẩn ÷ tổng lượt bắt buộc trong phiên hiện tại. ' +
  'Một lượt đạt chuẩn khi tập ≥ 80% thời gian giao cho lượt đó. ' +
  'Dừng sớm hơn vẫn được lưu nhưng chưa tính vào số lượt đạt chuẩn.';

const ActiveSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { dataRes, tableState, onTableChange, loading } = useDataTable<PortalExerciseAssignment>();

  // Session status based on currentSession - đây là trạng thái hiển thị chính
  const getSessionStatusChip = (assignment: PortalExerciseAssignment) => {
    const session = assignment.currentSession;
    if (!session) {
      return <Chip label="Chưa hoàn thành" color="warning" size="small" />;
    }
    if (session.status === 'completed') {
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
    createNestedColumn('exerciseConfig.exercise.name', 'Bài tập'),
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
        sort: true,
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
          const required = assignment?.exerciseConfig?.executionCount ?? 1;
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
          const sessionCompleted = assignment?.currentSession?.status === 'completed';
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
