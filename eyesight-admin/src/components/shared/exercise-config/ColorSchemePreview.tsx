/**
 * Anaglyph lens simulation + preview for exercise color scheme configuration.
 * Shared across admin config and future games.
 */

import React, { useMemo } from 'react';
import { Box, Typography, Grid } from '@mui/material';
import type { ColorScheme } from 'src/types/core/visual-settings';
import {
  isAnaglyphExerciseColorScheme,
  alternatingLetterColors,
} from 'src/components/exercises/vt/core/vtStimulusColors';

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Approximate what one anaglyph lens passes (channel isolation on black). */
export function simulateAnaglyphLens(hex: string, lens: 'red' | 'blue' | 'green'): string {
  const [r, g, b] = parseHex(hex);
  if (lens === 'red') return `rgb(${r}, 0, 0)`;
  if (lens === 'blue') return `rgb(0, 0, ${b})`;
  return `rgb(0, ${g}, 0)`;
}

/** Perceived luminance on black through a lens (0–255). */
export function lensLuminance(hex: string, lens: 'red' | 'blue' | 'green'): number {
  const [r, g, b] = parseHex(hex);
  if (lens === 'red') return r;
  if (lens === 'blue') return b;
  return g;
}

const SAMPLE_LETTERS = ['A', 'B'] as const;

interface LensPreviewPanelProps {
  title: string;
  lens: 'red' | 'blue' | 'green';
  channel1Hex: string;
  channel2Hex: string;
  channel1Label: string;
  channel2Label: string;
}

const LensPreviewPanel: React.FC<LensPreviewPanelProps> = ({
  title,
  lens,
  channel1Hex,
  channel2Hex,
  channel1Label,
  channel2Label,
}) => {
  const letters = useMemo(
    () =>
      [channel1Hex, channel2Hex].map((hex, i) => ({
        hex,
        color: simulateAnaglyphLens(hex, lens),
        lum: lensLuminance(hex, lens),
        label: i === 0 ? channel1Label : channel2Label,
        char: SAMPLE_LETTERS[i],
      })),
    [channel1Hex, channel2Hex, channel1Label, channel2Label, lens]
  );

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          px: 1,
          py: 0.5,
          bgcolor: 'action.hover',
          fontWeight: 700,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          bgcolor: '#000000',
          py: 2,
          px: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          minHeight: 72,
          alignItems: 'center',
        }}
      >
        {letters.map((l) => (
          <Box key={l.char} sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: 36,
                fontWeight: 900,
                fontFamily: 'monospace',
                color: l.color,
                lineHeight: 1,
                opacity: l.lum < 8 ? 0.15 : 1,
              }}
            >
              {l.char}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500', fontSize: 9 }}>
              {l.hex}
              {l.lum < 8 ? ' · ẩn' : ''}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

interface ColorSchemePreviewProps {
  colorScheme?: ColorScheme | null;
}

export const ColorSchemePreview: React.FC<ColorSchemePreviewProps> = ({ colorScheme }) => {
  if (!colorScheme) return null;

  const isAnaglyph = isAnaglyphExerciseColorScheme(colorScheme);
  const textHex = (colorScheme.textColor || '#000000').toUpperCase();
  const bgHex = (colorScheme.backgroundColor || '#FFFFFF').toUpperCase();

  if (!isAnaglyph) {
    return (
      <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Xem trước — {colorScheme.preset === 'whiteBlack' ? 'Trắng đen' : 'Bảng màu'}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: bgHex,
            py: 2,
            borderRadius: 1,
          }}
        >
          <Typography sx={{ fontSize: 32, fontWeight: 900, color: textHex }}>A</Typography>
          <Typography variant="caption" sx={{ color: textHex, opacity: 0.7 }}>
            {textHex} trên {bgHex}
          </Typography>
        </Box>
      </Box>
    );
  }

  const isRedGreen = colorScheme.preset === 'redGreen';
  const lens2: 'blue' | 'green' = isRedGreen ? 'green' : 'blue';
  const lens2Label = isRedGreen ? 'Mắt xanh lá (kính)' : 'Mắt xanh dương (kính)';
  const ch1Label = 'Kênh đỏ';
  const ch2Label = isRedGreen ? 'Kênh xanh lá' : 'Kênh xanh dương';

  const leakRedOnBlue = lensLuminance(bgHex, 'red');
  const leakBlueOnRed = lensLuminance(textHex, lens2);

  const gameColors = alternatingLetterColors(2, textHex, bgHex, 100, true);
  const gameColorA = gameColors[0];
  const gameColorB = gameColors[1];

  return (
    <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700 }}>
        Xem trước kính lọc màu (nền đen như game Vernier/Crowding)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Hàng &quot;Trong game&quot; dùng đúng công thức vẽ canvas — phải khớp khi chơi thử.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Chữ kênh đối diện phải gần như biến mất qua kính. Nếu vẫn thấy mờ — chỉnh hex rồi bấm{' '}
        <strong>Lưu màu</strong>.
      </Typography>

      <Box
        sx={{
          mb: 1.5,
          py: 1.5,
          px: 1,
          bgcolor: '#000',
          borderRadius: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 3,
          position: 'relative',
        }}
      >
        <Typography variant="caption" sx={{ color: 'grey.500', position: 'absolute', left: 8 }}>
          Trong game
        </Typography>
        <Typography sx={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color: gameColorA }}>
          A
        </Typography>
        <Typography sx={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color: gameColorB }}>
          B
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          Kênh 1: <strong>{textHex}</strong>
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
          Kênh 2: <strong>{bgHex}</strong>
        </Typography>
      </Box>

      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <LensPreviewPanel
            title="Mắt đỏ (kính)"
            lens="red"
            channel1Hex={textHex}
            channel2Hex={bgHex}
            channel1Label={ch1Label}
            channel2Label={ch2Label}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <LensPreviewPanel
            title={lens2Label}
            lens={lens2}
            channel1Hex={textHex}
            channel2Hex={bgHex}
            channel1Label={ch1Label}
            channel2Label={ch2Label}
          />
        </Grid>
      </Grid>

      {(leakRedOnBlue >= 8 || leakBlueOnRed >= 8) && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
          ⚠ Rò màu:{' '}
          {leakRedOnBlue >= 8 &&
            `kênh 2 (${bgHex}) vẫn lộ qua kính đỏ (độ sáng ${leakRedOnBlue}). `}
          {leakBlueOnRed >= 8 &&
            `kênh 1 (${textHex}) vẫn lộ qua ${lens2Label.toLowerCase()} (độ sáng ${leakBlueOnRed}).`}
        </Typography>
      )}
    </Box>
  );
};

export default ColorSchemePreview;
