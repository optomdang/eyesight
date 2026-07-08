/**
 * VT Quest — Full sandbox test page (admin).
 * Plays the complete portal game without saving results or requiring patient assignment.
 */

import React, { useMemo } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import VtQuestExercise from 'src/components/exercises/vt/portal/VtQuestExercise';
import { getPreferredScreenInfo } from 'src/services/screenCalibration.service';
import { buildVtQuestSandboxAssignment } from 'src/components/exercises/vt/core/vtQuestSandbox';

const VtQuestTestPage: React.FC = () => {
  const navigate = useNavigate();

  const screenParams = useMemo(
    () => getPreferredScreenInfo(),
    []
  );

  const sandboxAssignment = useMemo(
    () =>
      buildVtQuestSandboxAssignment({
        visionType: 'far',
        visionLevel: 10,
        distance: 3,
        eye: 'both',
      }),
    []
  );

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#0a0520',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          bgcolor: 'rgba(0,0,0,0.45)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate(-1)}
          sx={{ color: 'rgba(255,255,255,0.85)' }}
          aria-label="Quay lại"
        >
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
            Test VT Quest — chơi đầy đủ
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
            Không lưu kết quả · Khoảng cách 3m · 20/50 · Mở khóa mọi hành tinh
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <VtQuestExercise
          assignmentId={0}
          sessionId={0}
          screenParams={screenParams}
          assignment={sandboxAssignment}
          sandboxMode
          unlockAllWorlds
          onSandboxExit={() => navigate(-1)}
        />
      </Box>
    </Box>
  );
};

export default VtQuestTestPage;
