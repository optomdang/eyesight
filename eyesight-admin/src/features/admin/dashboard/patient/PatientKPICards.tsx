import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { IconUsers, IconHeartRateMonitor, IconTrendingUp, IconChartLine, IconCalendarStats } from '@tabler/icons-react';
import type { PatientKPIData } from 'src/types/admin/dashboard';

interface PatientKPICardsProps {
  data: PatientKPIData | null;
  loading?: boolean;
  inactivePatientsCount?: number;
}

const FOOTNOTE_MIN_HEIGHT = 36;

const AgeValueLines: React.FC<{ data: PatientKPIData; color: string }> = ({ data, color }) => {
  const min = data.minAge ?? '—';
  const max = data.maxAge ?? '—';
  const avg = data.avgAge != null ? data.avgAge.toFixed(1) : '—';

  const lineSx = {
    fontWeight: 700,
    fontSize: '0.875rem',
    lineHeight: 1.35,
    color,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography sx={lineSx}>Min: {min}</Typography>
      <Typography sx={lineSx}>Max: {max}</Typography>
      <Typography sx={lineSx}>Avg: {avg}</Typography>
    </Box>
  );
};

const PatientKPICards: React.FC<PatientKPICardsProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }} key={i}>
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

  if (!data) return null;

  const cards = [
    {
      title: 'BỆNH NHÂN',
      value: (data.totalPatients ?? 0).toLocaleString(),
      subtitle: 'Tổng số bệnh nhân trong trung tâm',
      icon: IconUsers,
      color: '#5D87FF',
      bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'ĐANG ĐIỀU TRỊ',
      value: (data.activePatients ?? 0).toLocaleString(),
      subtitle: 'Bệnh nhân đang trong thời gian điều trị',
      icon: IconHeartRateMonitor,
      color: '#49BEFF',
      bgColor: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
    },
    {
      title: 'TỶ LỆ CẢI THIỆN',
      value: `${(data.improvementRate ?? 0).toFixed(0)}%`,
      subtitle:
        'BN cải thiện so với lúc ban đầu (≥1/4 loại thị lực; baseline = nhập ban đầu hoặc lần đo đầu)',
      icon: IconTrendingUp,
      color: '#FA896B',
      bgColor: 'linear-gradient(135deg, #FA896B 0%, #F2709C 100%)',
    },
    {
      title: 'MỨC ĐỘ CẢI THIỆN',
      value: `+${(data.avgImprovementLevel ?? 0).toFixed(1)}`,
      subtitle: 'Số dòng thị lực xa cải thiện trung bình (chỉ BN đã cải thiện)',
      icon: IconChartLine,
      color: '#13DEB9',
      bgColor: 'linear-gradient(135deg, #20E3B2 0%, #29FFC6 100%)',
    },
    {
      title: 'ĐỘ TUỔI',
      isAge: true as const,
      subtitle: 'Min / Max / Avg (tuổi) — chỉ BN đã cải thiện',
      icon: IconCalendarStats,
      color: '#FFAE1F',
      bgColor: 'linear-gradient(135deg, #FDEB71 0%, #F8D800 100%)',
    },
  ];

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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
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
                      {'isAge' in card && card.isAge ? (
                        <AgeValueLines data={data} color={card.color} />
                      ) : (
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: { xs: '2rem', sm: '2.25rem' },
                            lineHeight: 1.1,
                            color: card.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {'value' in card ? card.value : ''}
                        </Typography>
                      )}
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

export default PatientKPICards;
