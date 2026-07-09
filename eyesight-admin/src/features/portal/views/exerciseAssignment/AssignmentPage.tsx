import React from 'react';
import { Box, Button, Chip, Typography, LinearProgress, Tooltip } from '@mui/material';
import { IconHistory, IconTrophy, IconCalendar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { PortalExerciseAssignment } from 'src/types/core';
import CustomDataTable from 'src/components/shared/CustomDataTable';
import { MUIDataTableColumnDef } from 'mui-datatables';
import useDataTable from 'src/contexts/data-context/useDataTable';
import PageContainer from 'src/components/container/PageContainer';
import { createNestedColumn } from 'src/utils/tableColumnUtils';

const AssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { dataRes, tableState, onTableChange, loading } = useDataTable<PortalExerciseAssignment>();

  // Assignment status helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'paused':
        return 'Tạm dừng';
      case 'completed':
        return 'Hoàn thành';
      default:
        return status;
    }
  };

  // Compliance status helpers
  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'success';
      case 'overdue':
        return 'warning';
      case 'completed':
        return 'info';
      case 'paused':
        return 'default';
      default:
        return 'default';
    }
  };

  const getComplianceText = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'Đúng tiến độ';
      case 'overdue':
        return 'Quá hạn';
      case 'completed':
        return 'Hoàn thành';
      case 'paused':
        return 'Tạm dừng';
      default:
        return status || 'Không xác định';
    }
  };

  // Session status helpers (simplified: not_started, incomplete, completed)
  const getSessionStatusColor = (session: any, exerciseConfig: any) => {
    if (!session) return 'default';

    const requiredExecutions = exerciseConfig?.executionCount || 1;
    const executionsCompleted = session.executionsCompleted || 0;
    const validExecutions = session.validExecutions || 0;

    // Completed: all executions done and all valid
    if (
      executionsCompleted >= requiredExecutions &&
      validExecutions === executionsCompleted &&
      executionsCompleted > 0
    ) {
      return 'success';
    }
    // Incomplete: started but not finished
    if (executionsCompleted > 0) {
      return 'warning';
    }
    // Not started
    return 'default';
  };

  const getSessionStatusText = (session: any, exerciseConfig: any) => {
    if (!session) return 'Chưa bắt đầu';

    const requiredExecutions = exerciseConfig?.executionCount || 1;
    const executionsCompleted = session.executionsCompleted || 0;
    const validExecutions = session.validExecutions || 0;

    if (
      executionsCompleted >= requiredExecutions &&
      validExecutions === executionsCompleted &&
      executionsCompleted > 0
    ) {
      return 'Hoàn thành';
    }
    if (executionsCompleted > 0) {
      return 'Chưa hoàn thành';
    }
    return 'Chưa bắt đầu';
  };

  // Navigation handlers
  const handleViewHistory = (assignment: PortalExerciseAssignment) => {
    // If there's a current session, go directly to its results
    if (assignment.currentSession?.id) {
      navigate(
        `/portal/assignments/${assignment.id}/sessions/${assignment.currentSession.id}/results`
      );
    } else {
      // Otherwise, show all sessions list
      navigate(`/portal/assignments/${assignment.id}/sessions`);
    }
  };

  const columns: MUIDataTableColumnDef[] = [
    createNestedColumn('exerciseConfig.exercise.name', 'Bài tập'),
    {
      name: 'exerciseConfig.eye',
      label: 'Mắt',
      options: {
        filter: true,
        sort: false,
        customBodyRender: (value: string) => {
          switch (value) {
            case 'left':
              return 'Trái';
            case 'right':
              return 'Phải';
            case 'both':
              return 'Cả hai';
            default:
              return value || 'Cả hai';
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
        filter: true,
        sort: true,
        customBodyRender: (value: string) => (
          <Chip label={getStatusText(value)} color={getStatusColor(value)} size="small" />
        ),
      },
    },
    {
      name: 'complianceStatus',
      label: 'Tuân thủ',
      options: {
        filter: true,
        sort: true,
        customBodyRender: (value: string, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const nextDueDate = assignment?.nextDueDate;

          return (
            <Box>
              <Chip
                label={getComplianceText(value)}
                color={getComplianceColor(value)}
                size="small"
              />
              {nextDueDate && (
                <Tooltip title="Hạn tiếp theo">
                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                    <IconCalendar size={12} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(nextDueDate).toLocaleDateString('vi-VN')}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        },
      },
    },
    {
      name: 'currentSession.status',
      label: 'Session hiện tại',
      options: {
        filter: false,
        sort: false,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const session = assignment?.currentSession;
          const exerciseConfig = assignment?.exerciseConfig;

          return (
            <Chip
              label={getSessionStatusText(session, exerciseConfig)}
              color={getSessionStatusColor(session, exerciseConfig)}
              size="small"
              variant="outlined"
            />
          );
        },
      },
    },
    {
      name: 'currentSession.executionsCompleted',
      label: 'Tiến độ',
      options: {
        filter: false,
        sort: true,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const session = assignment?.currentSession;
          const exerciseConfig = assignment?.exerciseConfig;

          const requiredExecutions = exerciseConfig?.executionCount || 1;
          const executionsCompleted = session?.executionsCompleted || 0;
          const validExecutions = session?.validExecutions || 0;
          const validityPercentage = session?.validityPercentage || 0;

          // Check session completion
          const isSessionComplete =
            executionsCompleted >= requiredExecutions &&
            validExecutions === executionsCompleted &&
            executionsCompleted > 0;

          // Calculate progress percentage
          const progressPercentage = Math.round((executionsCompleted / requiredExecutions) * 100);

          return (
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(progressPercentage, 100)}
                  sx={{
                    width: 60,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isSessionComplete ? 'success.light' : 'grey.200',
                  }}
                  color={isSessionComplete ? 'success' : 'primary'}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: 60 }}>
                  {executionsCompleted}/{requiredExecutions} lần
                </Typography>
              </Box>
              <Typography
                variant="caption"
                color={validityPercentage === 100 ? 'success.main' : 'warning.main'}
              >
                {validityPercentage}% hợp lệ {isSessionComplete && '(hoàn thành)'}
              </Typography>
            </Box>
          );
        },
      },
    },
    {
      name: 'currentSession.bestScore',
      label: 'Điểm cao nhất',
      options: {
        filter: false,
        sort: true,
        customBodyRender: (_: any, tableMeta: any) => {
          const assignment = dataRes?.rows?.[tableMeta.rowIndex] as PortalExerciseAssignment;
          const session = assignment?.currentSession;

          if (!session || session.bestScore === 0) return '-';
          return (
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconTrophy size={16} />
              <Typography variant="body2">{session.bestScore}</Typography>
            </Box>
          );
        },
      },
    },
    {
      name: 'createdAt',
      label: 'Ngày giao',
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value: string) =>
          value ? new Date(value).toLocaleDateString('vi-VN') : 'Không xác định',
      },
    },
  ];

  // Custom actions - CHỈ có nút Lịch sử (vì đây là trang lịch sử)
  const renderCustomActions = (assignment: PortalExerciseAssignment) => {
    return (
      <Tooltip title="Xem chi tiết lịch sử các session và kết quả">
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconHistory size={16} />}
          onClick={() => handleViewHistory(assignment)}
          color="primary"
          sx={{ minWidth: 'auto' }}
        >
          Xem chi tiết
        </Button>
      </Tooltip>
    );
  };

  return (
    <PageContainer title="Lịch sử bài tập" description="Tất cả bài tập đã được giao">
      <Box>
        {/* Page Header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Lịch sử bài tập
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tất cả bài tập đã được giao cho bạn
          </Typography>
        </Box>

        <CustomDataTable
          dataRes={dataRes}
          loading={loading}
          tableState={tableState}
          columns={columns}
          onTableChange={onTableChange}
          customActions={renderCustomActions}
          options={{
            selectableRows: 'none',
            rowsPerPageOptions: [10, 25, 50],
            elevation: 0,
          }}
        />
      </Box>
    </PageContainer>
  );
};

export default AssignmentPage;
