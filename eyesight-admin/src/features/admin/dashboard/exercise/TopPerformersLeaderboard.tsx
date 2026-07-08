import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import { IconTrophy, IconMedal, IconAward } from '@tabler/icons-react';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import type { TopPerformer } from 'src/types/admin/dashboard';

const LEADERBOARD_SUBTITLE_HELP =
  'Sắp xếp ưu tiên: Hoàn thành TB % (cao hơn trước), rồi Tập trung, rồi Cải thiện.';

const LEADERBOARD_METRIC_TOOLTIPS = {
  completion: 'Mức độ hoàn thành các nhiệm vụ được giao (kiểm tra thị lực và lượt tập).',
  focus: 'Mức độ tập trung khi thực hiện bài tập (ít tạm dừng và bỏ tương tác).',
  improvement: 'Mức cải thiện thị lực nhìn xa so với lúc bắt đầu điều trị.',
  recovery: 'Thị lực nhìn xa hiện tại so với chuẩn 20/20 (không liên quan bài tập).',
} as const;

const MetricHeaderLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <Tooltip
    title={
      <Typography
        variant="caption"
        sx={{ whiteSpace: 'normal', lineHeight: 1.45, display: 'block', maxWidth: 280 }}
      >
        {tooltip}
      </Typography>
    }
    arrow
    placement="top"
    enterTouchDelay={0}
    describeChild
  >
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        cursor: 'help',
        borderBottom: '1px dotted',
        borderColor: 'text.disabled',
        lineHeight: 1.2,
      }}
    >
      {label}
    </Box>
  </Tooltip>
);

// Extended interface for this component's specific needs
// Aligned to BE getLeaderboard (#7): HOÀN THÀNH(#8) / TẬP TRUNG(#9) / CẢI THIỆN / PHỤC HỒI(#10)
interface LeaderboardPerformer extends Partial<TopPerformer> {
  patientCode: string;
  patientName: string;
  completionRate?: number; // #8 HOÀN THÀNH %
  focusScore?: number; // #9 TẬP TRUNG %
  improvementLines?: number; // CẢI THIỆN — số dòng thị lực xa
  recoveryPct?: number | null; // #10 PHỤC HỒI %
}

interface TopPerformersLeaderboardProps {
  data: LeaderboardPerformer[];
  loading?: boolean;
}

const headerCellSx = {
  fontWeight: 700,
  fontSize: '0.625rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  py: 0.75,
  lineHeight: 1.2,
  color: 'text.secondary',
} as const;

/** Cột chỉ số: đủ rộng cho header dài nhất, không xuống dòng. */
const METRIC_COL_WIDTH = '4.875rem';

const rankColSx = {
  width: '2.25rem',
  minWidth: '2.25rem',
  maxWidth: '2.25rem',
  px: 0.25,
  whiteSpace: 'nowrap',
} as const;

/** Cột co giãn — nhận phần còn lại; tên dài bị ellipsis. */
const patientColSx = {
  minWidth: 0,
  px: 0.75,
  overflow: 'hidden',
} as const;

const metricColSx = {
  width: METRIC_COL_WIDTH,
  minWidth: METRIC_COL_WIDTH,
  maxWidth: METRIC_COL_WIDTH,
  px: 0.375,
  whiteSpace: 'nowrap',
  textAlign: 'center',
  overflow: 'hidden',
} as const;

const metricHeaderColSx = {
  ...headerCellSx,
  ...metricColSx,
} as const;

const metricBodyColSx = {
  ...metricColSx,
  overflow: 'hidden',
} as const;

const compactChipSx = {
  height: 22,
  fontSize: '0.75rem',
  fontWeight: 600,
  flexShrink: 0,
  '& .MuiChip-label': { px: 0.5, whiteSpace: 'nowrap' },
};

const TopPerformersLeaderboard: React.FC<TopPerformersLeaderboardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <IconTrophy size={18} color="#FFD700" />;
      case 1:
        return <IconMedal size={18} color="#C0C0C0" />;
      case 2:
        return <IconAward size={18} color="#CD7F32" />;
      default:
        return null;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
      case 1:
        return 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)';
      case 2:
        return 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)';
      default:
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pt: 1.5, pb: 1 }}>
          <IconTrophy size={28} color="#FFD700" />
          <Box sx={{ ml: 1.5, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>
              Bảng Xếp Hạng
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
              <LabelWithHelp help={LEADERBOARD_SUBTITLE_HELP}>
                Top 10 bệnh nhân đang điều trị
              </LabelWithHelp>
            </Typography>
          </Box>
        </Box>

        {data.length === 0 ? (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">Chưa có dữ liệu</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '2.25rem' }} />
                <col />
                <col style={{ width: METRIC_COL_WIDTH }} />
                <col style={{ width: METRIC_COL_WIDTH }} />
                <col style={{ width: METRIC_COL_WIDTH }} />
                <col style={{ width: METRIC_COL_WIDTH }} />
              </colgroup>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell align="center" sx={{ ...headerCellSx, ...rankColSx }}>
                    HẠNG
                  </TableCell>
                  <TableCell align="left" sx={{ ...headerCellSx, ...patientColSx, whiteSpace: 'nowrap' }}>
                    BỆNH NHÂN
                  </TableCell>
                  <TableCell align="center" sx={metricHeaderColSx}>
                    <MetricHeaderLabel
                      label="HOÀN THÀNH"
                      tooltip={LEADERBOARD_METRIC_TOOLTIPS.completion}
                    />
                  </TableCell>
                  <TableCell align="center" sx={metricHeaderColSx}>
                    <MetricHeaderLabel
                      label="TẬP TRUNG"
                      tooltip={LEADERBOARD_METRIC_TOOLTIPS.focus}
                    />
                  </TableCell>
                  <TableCell align="center" sx={metricHeaderColSx}>
                    <MetricHeaderLabel
                      label="CẢI THIỆN"
                      tooltip={LEADERBOARD_METRIC_TOOLTIPS.improvement}
                    />
                  </TableCell>
                  <TableCell align="center" sx={metricHeaderColSx}>
                    <MetricHeaderLabel
                      label="PHỤC HỒI"
                      tooltip={LEADERBOARD_METRIC_TOOLTIPS.recovery}
                    />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.slice(0, 10).map((performer, index) => (
                  <TableRow
                    key={performer.patientCode}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      ...(index < 3 && { bgcolor: 'action.selected' }),
                      '& .MuiTableCell-root': { py: 0.75 },
                    }}
                  >
                    <TableCell align="center" sx={rankColSx}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        {getRankIcon(index) || (
                          <Avatar
                            sx={{
                              width: 22,
                              height: 22,
                              background: getRankColor(index),
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}
                          </Avatar>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="left" sx={patientColSx}>
                      <Typography
                        variant="body2"
                        noWrap
                        title={performer.patientName}
                        sx={{ fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.3 }}
                      >
                        {performer.patientName}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        title={performer.patientCode}
                        color="text.secondary"
                        sx={{ display: 'block', fontSize: '0.6875rem', lineHeight: 1.2 }}
                      >
                        {performer.patientCode}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={metricBodyColSx}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'primary.main' }}
                      >
                        {performer.completionRate != null
                          ? `${performer.completionRate.toFixed(0)}%`
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={metricBodyColSx}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip
                          label={
                            performer.focusScore != null ? `${performer.focusScore.toFixed(0)}%` : '-'
                          }
                          size="small"
                          color={(performer.focusScore ?? 0) >= 80 ? 'success' : 'warning'}
                          sx={compactChipSx}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={metricBodyColSx}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color:
                            (performer.improvementLines ?? 0) < 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {(performer.improvementLines ?? 0) >= 0 ? '+' : ''}
                        {(performer.improvementLines ?? 0).toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={metricBodyColSx}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip
                          label={
                            performer.recoveryPct != null
                              ? `${performer.recoveryPct.toFixed(0)}%`
                              : '-'
                          }
                          size="small"
                          sx={{
                            ...compactChipSx,
                            bgcolor:
                              (performer.recoveryPct ?? 0) >= 100
                                ? 'success.light'
                                : (performer.recoveryPct ?? 0) >= 50
                                  ? 'warning.light'
                                  : 'error.light',
                            color:
                              (performer.recoveryPct ?? 0) >= 100
                                ? 'success.dark'
                                : (performer.recoveryPct ?? 0) >= 50
                                  ? 'warning.dark'
                                  : 'error.dark',
                          }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TopPerformersLeaderboard;
