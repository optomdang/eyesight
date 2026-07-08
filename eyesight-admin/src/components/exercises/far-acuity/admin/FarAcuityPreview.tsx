/**
 * Far Acuity Exercise — static admin preview.
 * Shows 5 mock optotype letters at 100% contrast.
 */

import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ExercisePreviewProps } from 'src/components/exercises/registry';
import { FONT_MAP } from 'src/utils/constant';

const PREVIEW_CHARS = ['H', 'V', 'E', 'C', 'S'];
const PREVIEW_FONT_SIZE = 36;

const FarAcuityPreview: React.FC<ExercisePreviewProps> = () => {
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        py: 3,
        bgcolor: 'white',
      }}
    >
      {/* Mock optotype row */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {PREVIEW_CHARS.map((c, i) => (
          <Box
            key={i}
            sx={{
              fontSize: PREVIEW_FONT_SIZE,
              fontFamily: FONT_MAP['A'],
              color: 'black',
              lineHeight: 1,
              width: PREVIEW_FONT_SIZE,
              textAlign: 'center',
            }}
          >
            {c}
          </Box>
        ))}
      </Box>

      {/* Labels */}
      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
        <Chip label="Thị lực xa" size="small" color="primary" />
        <Chip label="Độ tương phản" size="small" color="secondary" />
        <Chip label="Adaptive" size="small" />
      </Stack>

      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: 280 }}>
        Luyện nhận biết chữ theo mức thị lực xa + độ tương phản thích ứng
      </Typography>
    </Box>
  );
};

export default FarAcuityPreview;
