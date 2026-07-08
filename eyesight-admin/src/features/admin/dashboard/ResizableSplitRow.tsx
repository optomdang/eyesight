import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';

interface ResizableSplitRowProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftRatio?: number;
  minLeftRatio?: number;
  maxLeftRatio?: number;
  storageKey?: string;
}

const HANDLE_WIDTH = 12;
const MIN_PANEL_PX = 240;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readStoredRatio = (storageKey: string | undefined, fallback: number) => {
  if (!storageKey || typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ResizableSplitRow: React.FC<ResizableSplitRowProps> = ({
  left,
  right,
  defaultLeftRatio = 0.5,
  minLeftRatio = 0.28,
  maxLeftRatio = 0.72,
  storageKey,
}) => {
  const theme = useTheme();
  const isSplitView = useMediaQuery(theme.breakpoints.up('lg'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftRatio, setLeftRatio] = useState(() =>
    readStoredRatio(storageKey, defaultLeftRatio),
  );
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, String(leftRatio));
  }, [leftRatio, storageKey]);

  const updateRatioFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const trackWidth = rect.width - HANDLE_WIDTH;
      if (trackWidth <= 0) return;

      const leftPx = clientX - rect.left - HANDLE_WIDTH / 2;
      const minRatioFromPx = MIN_PANEL_PX / trackWidth;
      const maxRatioFromPx = 1 - MIN_PANEL_PX / trackWidth;
      const minRatio = Math.max(minLeftRatio, minRatioFromPx);
      const maxRatio = Math.min(maxLeftRatio, maxRatioFromPx);

      setLeftRatio(clamp(leftPx / trackWidth, minRatio, maxRatio));
    },
    [maxLeftRatio, minLeftRatio],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setDragging(true);
      updateRatioFromClientX(event.clientX);

      const onMouseMove = (moveEvent: MouseEvent) => {
        updateRatioFromClientX(moveEvent.clientX);
      };

      const onMouseUp = () => {
        setDragging(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [updateRatioFromClientX],
  );

  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  if (!isSplitView) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ minWidth: 0 }}>{left}</Box>
        <Box sx={{ minWidth: 0 }}>{right}</Box>
      </Box>
    );
  }

  const leftWidth = `calc(${(leftRatio * 100).toFixed(4)}% - ${HANDLE_WIDTH / 2}px)`;

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
        minHeight: 0,
      }}
    >
      <Box sx={{ width: leftWidth, minWidth: MIN_PANEL_PX, flexShrink: 0 }}>{left}</Box>

      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để thay đổi tỉ lệ biểu đồ và bảng xếp hạng"
        onMouseDown={handleMouseDown}
        sx={{
          width: HANDLE_WIDTH,
          flexShrink: 0,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          '&:hover .split-handle, &.is-dragging .split-handle': {
            bgcolor: 'primary.main',
            opacity: 1,
          },
        }}
        className={dragging ? 'is-dragging' : undefined}
      >
        <Box
          className="split-handle"
          sx={{
            width: 3,
            height: 56,
            borderRadius: 1.5,
            bgcolor: 'divider',
            opacity: dragging ? 1 : 0.85,
            transition: dragging ? 'none' : 'background-color 0.2s ease',
          }}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: MIN_PANEL_PX, minHeight: 0 }}>{right}</Box>
    </Box>
  );
};

export default ResizableSplitRow;
