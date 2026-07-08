import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface SummaryCardProps {
  title: string;
  value: number;
  gradient: string;
  icon: React.ReactNode;
  shadowColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, gradient, icon, shadowColor }) => {
  return (
    <Card
      sx={{
        background: gradient,
        color: 'white',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: `0 4px 16px ${shadowColor}`,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -20,
          right: -20,
          width: '80px',
          height: '80px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
        },
      }}
    >
      <CardContent sx={{ p: 2, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 900, lineHeight: 1, mb: 0.25 }}>
              {value}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 500 }}>
              {title}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon as React.ReactElement, {
              sx: { fontSize: 28, color: 'white' },
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
