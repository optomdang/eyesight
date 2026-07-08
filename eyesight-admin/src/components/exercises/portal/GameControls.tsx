/**
 * GameControls Component
 * Extracted from PortalExercise.tsx - handles game control buttons and actions
 */

import React from 'react';
import { Button, Box } from '@mui/material';

interface GameControlsProps {
  onEndExercise: () => void;
  disabled?: boolean;
  variant?: 'floating' | 'inline';
}

const GameControls: React.FC<GameControlsProps> = ({
  onEndExercise,
  disabled = false,
  variant = 'floating',
}) => {
  const buttonProps = {
    onClick: onEndExercise,
    variant: 'contained' as const,
    color: 'error' as const,
    size: 'small' as const,
    disabled,
  };

  if (variant === 'floating') {
    return (
      <Box sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
        <Button {...buttonProps}>Kết thúc</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      <Button {...buttonProps}>Kết thúc bài tập</Button>
    </Box>
  );
};

export default GameControls;
