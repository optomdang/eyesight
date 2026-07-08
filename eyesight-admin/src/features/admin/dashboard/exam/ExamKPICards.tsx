import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { IconChecklist, IconEye, IconClock, IconChartLine } from '@tabler/icons-react';

/**
 * Tab 2 (Thống Kê Bài Kiểm Tra) KPI cards — aligned to BU spec:
 *   #11 TỈ LỆ TUÂN THỦ (test, session-level)  — from exam-stats kpi.testComplianceRate
 *   #12-15 THỊ LỰC XA/GẦN/TƯƠNG PHẢN/LẬP THỂ  — % everTreated cải thiện loại đó
 *           (from patient-stats improvementByType)
 */
interface ImprovementByType {
  far?: number;
  near?: number;
  contrast?: number;
  stereopsis?: number;
}

interface ExamKPICardsProps {
  testComplianceRate?: number;
  improvementByType?: ImprovementByType | null;
  loading?: boolean;
}

const FOOTNOTE_MIN_HEIGHT = 36;

const formatPercent = (value: number) =>
  `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

const ExamKPICards: React.FC<ExamKPICardsProps> = ({
  testComplianceRate,
  improvementByType,
  loading,
}) => {
  const imp = improvementByType || {};
  const cards = [
    {
      title: 'TỈ LỆ TUÂN THỦ',
      value: formatPercent(testComplianceRate || 0),
      subtitle: 'Test hoàn thành / chu kỳ giao (kể cả ngày bỏ)',
      icon: IconChecklist,
      color: '#5D87FF',
      bgColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'THỊ LỰC XA',
      value: formatPercent(imp.far || 0),
      subtitle: '% bệnh nhân cải thiện',
      icon: IconEye,
      color: '#13DEB9',
      bgColor: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
    },
    {
      title: 'THỊ LỰC GẦN',
      value: formatPercent(imp.near || 0),
      subtitle: '% bệnh nhân cải thiện',
      icon: IconEye,
      color: '#49BEFF',
      bgColor: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    },
    {
      title: 'THỊ LỰC TƯƠNG PHẢN',
      value: formatPercent(imp.contrast || 0),
      subtitle: '% bệnh nhân cải thiện',
      icon: IconClock,
      color: '#FFAE1F',
      bgColor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      title: 'THỊ GIÁC LẬP THỂ',
      value: formatPercent(imp.stereopsis || 0),
      subtitle: '% bệnh nhân cải thiện',
      icon: IconChartLine,
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

export default ExamKPICards;
