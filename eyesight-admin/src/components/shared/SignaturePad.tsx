import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const MAX_WIDTH = 560;
const HEIGHT_RATIO = 0.35;
const MIN_HEIGHT = 140;
const MAX_HEIGHT = 220;
const STROKE_WIDTH = 2.5;

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string | null;
}

export interface SignaturePadProps {
  disabled?: boolean;
  onChange?: (isEmpty: boolean) => void;
}

function getPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

const SignaturePad = React.forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { disabled = false, onChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [, setHasStroke] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.min(container.clientWidth, MAX_WIDTH);
    const height = Math.max(MIN_HEIGHT, Math.min(width * HEIGHT_RATIO, MAX_HEIGHT));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = STROKE_WIDTH;
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    setHasStroke(false);
    onChange?.(true);
  }, [onChange]);

  useImperativeHandle(
    ref,
    () => ({
      clear: clearCanvas,
      isEmpty: () => !hasStrokeRef.current,
      toDataUrl: () => {
        if (!hasStrokeRef.current || !canvasRef.current) return null;
        return canvasRef.current.toDataURL('image/png');
      },
    }),
    [clearCanvas]
  );

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const startDraw = (x: number, y: number) => {
      if (disabledRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (x: number, y: number) => {
      if (!drawingRef.current || disabledRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasStrokeRef.current) {
        hasStrokeRef.current = true;
        setHasStroke(true);
        onChange?.(false);
      }
    };

    const endDraw = () => {
      drawingRef.current = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Some browsers throw if the pointer is no longer active; safe to ignore.
      }
      const { x, y } = getPoint(canvas, e.clientX, e.clientY);
      startDraw(x, y);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const { x, y } = getPoint(canvas, e.clientX, e.clientY);
      draw(x, y);
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      endDraw();
    };

    // Native listeners with passive:false so preventDefault() stops the page
    // from scrolling/zooming while signing on touch devices.
    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false });
    canvas.addEventListener('pointerleave', endDraw);
    canvas.addEventListener('pointercancel', handlePointerUp, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', endDraw);
      canvas.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onChange]);

  return (
    <Box>
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          maxWidth: MAX_WIDTH,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Vùng ký tên"
          role="img"
          style={{
            display: 'block',
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            cursor: disabled ? 'not-allowed' : 'crosshair',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Ký bằng chuột hoặc cảm ứng trong khung trên
        </Typography>
        <Button
          size="small"
          variant="text"
          startIcon={<DeleteOutlineIcon />}
          onClick={clearCanvas}
          disabled={disabled}
        >
          Xóa chữ ký
        </Button>
      </Box>
    </Box>
  );
});

export default SignaturePad;
