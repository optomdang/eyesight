import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import {
  IconTarget,
  IconTrophy,
  IconChartBar,
  IconChecklist,
  IconMedal,
} from '@tabler/icons-react';
import type { ExerciseKPIData } from 'src/types/admin/dashboard';

interface ExerciseKPICardsProps {
  data: ExerciseKPIData | null;
  loading?: boolean;
}

const FOOTNOTE_MIN_HEIGHT = 36;

const formatPercent = (value: number) =>
  `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

const ExerciseKPICards: React.FC<ExerciseKPICardsProps> = ({ data, loading }) => {
  const cards = [
    {
      // #19 ĐANG SỬ DỤNG = (Exercise distinct đã giao) / (tổng Exercise hệ thống)
      title: 'ĐANG SỬ DỤNG',
      value: formatPercent(data?.inUsePct || 0),
      subtitle: `${data?.inUseExercises || 0}/${data?.totalExercises || 0} bài tập được giao`,
      icon: IconTarget,
      color: '#5D87FF',
      bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      // #20 SỐ PHÁC ĐỒ TẬP = count(ExerciseConfig)
      title: 'SỐ PHÁC ĐỒ TẬP',
      value: (data?.totalConfigs || 0).toLocaleString('vi-VN'),
      subtitle: 'Phác đồ tập đã cấu hình',
      icon: IconChartBar,
      color: '#49BEFF',
      bgColor: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
    },
    {
      // #21 % HOÀN THÀNH = % thời gian (Σ thời gian thực / Σ thời gian giao)
      title: '% HOÀN THÀNH',
      value: formatPercent(data?.timeCompletionRate || 0),
      subtitle: 'Theo thời gian tập (kể cả ngày không tập)',
      icon: IconChecklist,
      color: '#13DEB9',
      bgColor: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    },
    {
      // #22 TUÂN THỦ = % số lần (lượt completed / lượt giao)
      title: 'TUÂN THỦ',
      value: formatPercent(data?.countComplianceRate || 0),
      subtitle: 'Theo số lần tập (kể cả ngày không tập)',
      icon: IconTrophy,
      color: '#FFAE1F',
      bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      // #23 BN XUẤT SẮC = count BN có Tuân thủ > 80%
      title: 'BN XUẤT SẮC',
      value: (data?.excellentPatientsCount || 0).toLocaleString('vi-VN'),
      subtitle: 'Đạt >80% tuân thủ',
      icon: IconMedal,
      color: '#FA896B',
      bgColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
  ];

  if (loading) {
    return (
      <Grid container spacing={2}>
        {cards.map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" sx={{ mt: 1.5 }} />
                <Skeleton variant="text" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                  transition: 'all 0.3s ease-in-out',
                },
              }}
            >
              <CardContent
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  p: 0,
                  '&:last-child': { pb: 0 },
                }}
              >
                <Box sx={{ flex: 1, px: 2, pt: 2, pb: 1.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        title={card.title}
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 700,
                          fontSize: '0.6875rem',
                          letterSpacing: '0.04em',
                          mb: 0.75,
                        }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '2rem', sm: '2.25rem' },
                          lineHeight: 1.1,
                          color: card.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        background: card.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={22} color="white" />
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: 'auto',
                    borderTop: 1,
                    borderColor: 'divider',
                    px: 2,
                    pt: 1,
                    pb: 1.25,
                    minHeight: FOOTNOTE_MIN_HEIGHT,
                  }}
                >
                  <Typography
                    variant="caption"
                    title={card.subtitle}
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.6875rem',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {card.subtitle}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ExerciseKPICards;
