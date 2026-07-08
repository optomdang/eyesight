/**
 * VT Quest — Admin preview component (Phase 2).
 * Shows all 3 stimulus types (Gabor / Vernier / Crowding) in a tab switcher
 * so clinicians can verify each before assigning the exercise.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Chip, Stack, Tabs, Tab, MenuItem, TextField } from '@mui/material';
import { drawGabor2AFC, computePixelsPerDeg } from '../stimuli/gaborRenderer';
import { drawVernier2AFC, arcsecOffsetToPx, lineHeightDegToPx } from '../stimuli/vernierRenderer';
import { drawCrowding2AFC, drawCrowdingLetterMatch } from '../stimuli/crowdingRenderer';
import {
  ALL_GABOR_TASK_MODES,
  GABOR_TASK_MODE_LABELS,
  buildGaborTaskTrialMeta,
} from '../core/gaborTaskModes';
import {
  ALL_VERNIER_TASK_MODES,
  VERNIER_TASK_MODE_LABELS,
  buildVernierTaskTrialMeta,
} from '../core/vernierTaskModes';
import {
  ALL_CROWDING_TASK_MODES,
  CROWDING_TASK_MODE_LABELS,
  buildCrowdingTaskTrialMeta,
} from '../core/crowdingTaskModes';
import {
  ALL_STEREOPSIS_TASK_MODES,
  STEREOPSIS_TASK_MODE_LABELS,
  buildStereopsisTaskTrialMeta,
} from '../core/stereopsisTaskModes';
import GaborTaskStimulus from '../portal/components/GaborTaskStimulus';
import VernierTaskStimulus from '../portal/components/VernierTaskStimulus';
import CrowdingTaskStimulus from '../portal/components/CrowdingTaskStimulus';
import StereopsisTaskStimulus from '../portal/components/StereopsisTaskStimulus';
import type { ExercisePreviewProps } from 'src/components/exercises/registry';
import type {
  VtCrowdingTaskMode,
  VtGaborTaskMode,
  VtStereopsisTaskMode,
  VtVernierTaskMode,
  VtWorld,
} from 'src/types/core/vtQuest';
import type { GeoShapeType, IntroShapeType } from 'src/utils/stereopsis/stereopsisEngine';

const FALLBACK_PPI = 96;
const DISTANCE_M = 0.5;

const WORLD_TABS: { id: VtWorld; label: string; color: string }[] = [
  { id: 'gabor', label: 'Gabor', color: '#FFD93D' },
  { id: 'vernier', label: 'Vernier', color: '#4ECDC4' },
  { id: 'crowding', label: 'Crowding', color: '#a29bfe' },
  { id: 'stereopsis', label: 'Stereopsis', color: '#E17055' },
];

const VtQuestPreview: React.FC<ExercisePreviewProps> = ({ visualSettings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeWorld, setActiveWorld] = useState<VtWorld>('gabor');
  const [gaborMode, setGaborMode] = useState<VtGaborTaskMode>('location_2afc');
  const [vernierMode, setVernierMode] = useState<VtVernierTaskMode>('alignment_2afc');
  const [crowdingMode, setCrowdingMode] = useState<VtCrowdingTaskMode>('location_2afc');
  const [stereopsisMode, setStereopsisMode] = useState<VtStereopsisTaskMode>('shape_id');

  const pixelsPerDeg = computePixelsPerDeg(FALLBACK_PPI, DISTANCE_M);
  const contrast = visualSettings?.contrast != null ? visualSettings.contrast / 100 : 0.3;
  const isCustomGaborMode = activeWorld === 'gabor' && gaborMode !== 'location_2afc';
  const isCustomVernierMode =
    activeWorld === 'vernier' &&
    vernierMode !== 'alignment_2afc' &&
    vernierMode !== 'greater_offset_2afc';
  const isCustomCrowdingMode =
    activeWorld === 'crowding' &&
    crowdingMode !== 'location_2afc' &&
    crowdingMode !== 'letter_match_2afc';
  const isStereopsisPreview = activeWorld === 'stereopsis';

  // Fresh sample meta each time the mode changes (orientations, target cards…)
  const gaborPreviewMeta = useMemo(
    () =>
      buildGaborTaskTrialMeta(gaborMode, {
        sfCpD: 3,
        orientation: 'vertical',
        sigmaDeg: 0.5,
      }),
    [gaborMode]
  );

  const vernierPreviewMeta = useMemo(
    () => buildVernierTaskTrialMeta(vernierMode, {}),
    [vernierMode]
  );

  const crowdingPreviewStage = useMemo(
    () => ({ targetLetter: 'E', flankerLetters: ['B', 'H'] as [string, string] }),
    []
  );

  const crowdingPreviewMeta = useMemo(
    () => buildCrowdingTaskTrialMeta(crowdingMode, {}, crowdingPreviewStage),
    [crowdingMode, crowdingPreviewStage]
  );

  const stereopsisPreviewMeta = useMemo(
    () => buildStereopsisTaskTrialMeta(stereopsisMode, {}),
    [stereopsisMode]
  );

  const vernierLineMetrics = useMemo(() => {
    const lineHeightPx = Math.max(lineHeightDegToPx(1.2, pixelsPerDeg), 30);
    const gapPx = Math.max(lineHeightDegToPx(0.3, pixelsPerDeg), 8);
    const lineWidthPx = Math.max(lineHeightDegToPx(2 / 60, pixelsPerDeg), 1.5);
    const offsetPx = Math.max(arcsecOffsetToPx(60, pixelsPerDeg), 2);
    return { lineHeightPx, gapPx, lineWidthPx, offsetPx };
  }, [pixelsPerDeg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isCustomGaborMode || isCustomVernierMode || isCustomCrowdingMode || isStereopsisPreview) return;

    if (activeWorld === 'gabor') {
      drawGabor2AFC({
        canvas,
        signalSide: 'left',
        contrast,
        config: { sfCpD: 3, orientation: 'vertical', sigmaDeg: 0.5 },
        distanceM: DISTANCE_M,
        pixelsPerDeg,
      });
      return;
    }

    if (activeWorld === 'vernier') {
      const offsetPx = arcsecOffsetToPx(60, pixelsPerDeg);
      const lineHeightPx = lineHeightDegToPx(1.2, pixelsPerDeg);
      const gapPx = lineHeightDegToPx(0.3, pixelsPerDeg);
      const lineWidthPx = lineHeightDegToPx(2 / 60, pixelsPerDeg);
      drawVernier2AFC({
        canvas,
        signalSide: 'left',
        offsetPx: Math.max(offsetPx, 2),
        lineHeightPx: Math.max(lineHeightPx, 30),
        gapPx: Math.max(gapPx, 8),
        lineWidthPx: Math.max(lineWidthPx, 1.5),
        backgroundLuminance: 200,
      });
      return;
    }

    // crowding
    const letterHeightPx = Math.max(lineHeightDegToPx(0.6, pixelsPerDeg), 18);
    if (crowdingMode === 'letter_match_2afc') {
      drawCrowdingLetterMatch({
        canvas,
        signalSide: 'left',
        spacingRatio: 1.2,
        letterHeightPx,
        referenceLetter:
          typeof crowdingPreviewMeta.referenceLetter === 'string'
            ? crowdingPreviewMeta.referenceLetter
            : 'E',
        leftTargetLetter:
          typeof crowdingPreviewMeta.leftTargetLetter === 'string'
            ? crowdingPreviewMeta.leftTargetLetter
            : 'E',
        rightTargetLetter:
          typeof crowdingPreviewMeta.rightTargetLetter === 'string'
            ? crowdingPreviewMeta.rightTargetLetter
            : 'B',
        flankerLetters: crowdingPreviewStage.flankerLetters,
        backgroundLuminance: 220,
      });
      return;
    }
    drawCrowding2AFC({
      canvas,
      signalSide: 'left',
      spacingRatio: 1.2,
      letterHeightPx,
      targetLetter: 'E',
      flankerLetters: ['B', 'H'],
      backgroundLuminance: 220,
    });
  }, [activeWorld, visualSettings, pixelsPerDeg, contrast, isCustomGaborMode, isCustomVernierMode, isCustomCrowdingMode, crowdingMode]);

  const activeWorldInfo = WORLD_TABS.find((w) => w.id === activeWorld)!;
  const bgLum = activeWorld === 'gabor' ? 128 : activeWorld === 'vernier' ? 200 : 220;
  const canvasH = activeWorld === 'crowding' ? 200 : 240;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 4,
        gap: 2.5,
        background: '#0a0520',
        borderRadius: 2,
        minHeight: 400,
        color: 'white',
      }}
    >
      <Typography variant="h6" sx={{ color: '#6C5CE7', fontWeight: 700, letterSpacing: 0.5 }}>
        🚀 Phi hành gia thị giác — Preview
      </Typography>

      {/* Stimulus tabs */}
      <Tabs
        value={activeWorld}
        onChange={(_, v: VtWorld) => setActiveWorld(v)}
        sx={{
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13 },
          '& .Mui-selected': { color: activeWorldInfo.color },
          '& .MuiTabs-indicator': { bgcolor: activeWorldInfo.color },
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          width: '100%',
        }}
      >
        {WORLD_TABS.map((w) => (
          <Tab key={w.id} value={w.id} label={w.label} />
        ))}
      </Tabs>

      {/* Gabor task-mode selector */}
      {activeWorld === 'gabor' && (
        <TextField
          select
          size="small"
          label="Chế độ bài Gabor"
          value={gaborMode}
          onChange={(e) => setGaborMode(e.target.value as VtGaborTaskMode)}
          sx={{
            minWidth: 260,
            '& .MuiInputBase-root': { color: 'white' },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
          }}
        >
          {ALL_GABOR_TASK_MODES.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {GABOR_TASK_MODE_LABELS[mode]}
            </MenuItem>
          ))}
        </TextField>
      )}

      {activeWorld === 'vernier' && (
        <TextField
          select
          size="small"
          label="Chế độ bài Vernier"
          value={vernierMode}
          onChange={(e) => setVernierMode(e.target.value as VtVernierTaskMode)}
          sx={{
            minWidth: 260,
            '& .MuiInputBase-root': { color: 'white' },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
          }}
        >
          {ALL_VERNIER_TASK_MODES.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {VERNIER_TASK_MODE_LABELS[mode]}
            </MenuItem>
          ))}
        </TextField>
      )}

      {activeWorld === 'crowding' && (
        <TextField
          select
          size="small"
          label="Chế độ bài Crowding"
          value={crowdingMode}
          onChange={(e) => setCrowdingMode(e.target.value as VtCrowdingTaskMode)}
          sx={{
            minWidth: 260,
            '& .MuiInputBase-root': { color: 'white' },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
          }}
        >
          {ALL_CROWDING_TASK_MODES.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {CROWDING_TASK_MODE_LABELS[mode]}
            </MenuItem>
          ))}
        </TextField>
      )}

      {activeWorld === 'stereopsis' && (
        <TextField
          select
          size="small"
          label="Chế độ bài Stereopsis"
          value={stereopsisMode}
          onChange={(e) => setStereopsisMode(e.target.value as VtStereopsisTaskMode)}
          sx={{
            minWidth: 260,
            '& .MuiInputBase-root': { color: 'white' },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
            '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
          }}
        >
          {ALL_STEREOPSIS_TASK_MODES.map((mode) => (
            <MenuItem key={mode} value={mode}>
              {STEREOPSIS_TASK_MODE_LABELS[mode]}
            </MenuItem>
          ))}
        </TextField>
      )}

      {/* Description */}
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
        {activeWorld === 'gabor' &&
          (gaborMode === 'location_2afc'
            ? 'Trẻ chọn bên nào có Gabor patch (2AFC contrast sensitivity)'
            : gaborMode === 'orientation_id'
              ? 'Trẻ xác định hướng sọc của hình lớn (MCQ hướng)'
              : gaborMode === 'orientation_match'
                ? 'Trẻ chọn 2 thẻ có sọc cùng hướng'
                : gaborMode === 'odd_one_out'
                  ? 'Trẻ chạm thẻ có hướng sọc khác biệt'
                  : gaborMode === 'sf_discrimination'
                    ? 'Trẻ chọn bên có sọc to (dày) hơn'
                    : 'Trẻ ghi nhớ hướng sọc rồi chọn lại sau khi hình ẩn')}
        {activeWorld === 'vernier' &&
          (vernierMode === 'alignment_2afc'
            ? 'Trẻ chọn bên nào có đường thẳng bị lệch (2AFC vernier acuity)'
            : vernierMode === 'offset_direction_mcq'
              ? 'Trẻ xác định hướng lệch của cặp đoạn thẳng (MCQ trái/phải)'
              : vernierMode === 'greater_offset_2afc'
                ? 'Trẻ chọn bên lệch nhiều hơn (cả hai bên đều lệch)'
                : vernierMode === 'odd_line_out'
                  ? 'Trẻ chạm cặp có hướng lệch khác biệt'
                  : 'Trẻ ghi nhớ hướng lệch rồi chọn lại sau khi hình ẩn')}
        {activeWorld === 'crowding' &&
          (crowdingMode === 'location_2afc'
            ? 'Trẻ chọn bên nào có chữ ẩn giữa flankers (2AFC crowding)'
            : crowdingMode === 'central_letter_id'
              ? 'Trẻ nhận diện chữ ở giữa cụm crowding (MCQ)'
              : crowdingMode === 'letter_match_2afc'
                ? 'Trẻ chọn bên có chữ giữa khớp chữ mẫu phía trên'
                : crowdingMode === 'odd_letter_out'
                  ? 'Trẻ chạm cụm có chữ giữa khác biệt'
                  : crowdingMode === 'delayed_letter'
                    ? 'Trẻ ghi nhớ chữ giữa rồi chọn lại sau khi hình ẩn'
                    : 'Trẻ phán đoán chữ giữa có giống flankers hay không')}
        {activeWorld === 'stereopsis' &&
          (stereopsisMode === 'shape_id'
            ? 'Trẻ nhận hình nổi trong RDS (cần kính anaglyph đỏ/xanh)'
            : stereopsisMode === 'float_position'
              ? 'Trẻ chọn ô có hình nổi trong hàng 5 panel RDS'
              : 'Trẻ nhận chữ số nổi trong RDS digit panel')}
      </Typography>

      {/* Canvas */}
      {isStereopsisPreview ? (
        <StereopsisTaskStimulus
          mode={stereopsisMode}
          arcsec={400}
          rngSeed={
            typeof stereopsisPreviewMeta.rngSeed === 'number' ? stereopsisPreviewMeta.rngSeed : 42
          }
          shapeType={
            typeof stereopsisPreviewMeta.shapeType === 'string'
              ? (stereopsisPreviewMeta.shapeType as IntroShapeType)
              : 'star'
          }
          floatShape={
            stereopsisPreviewMeta.floatShape === 'circle' ||
            stereopsisPreviewMeta.floatShape === 'square'
              ? (stereopsisPreviewMeta.floatShape as GeoShapeType)
              : 'square'
          }
          floatAt={typeof stereopsisPreviewMeta.floatAt === 'number' ? stereopsisPreviewMeta.floatAt : 0}
          positionCount={
            typeof stereopsisPreviewMeta.positionCount === 'number'
              ? stereopsisPreviewMeta.positionCount
              : 5
          }
          digit={typeof stereopsisPreviewMeta.digit === 'number' ? stereopsisPreviewMeta.digit : 3}
        />
      ) : isCustomGaborMode ? (
        <GaborTaskStimulus
          mode={gaborMode as Exclude<VtGaborTaskMode, 'location_2afc'>}
          contrast={contrast}
          patchSizePx={120}
          pixelsPerDeg={pixelsPerDeg}
          sfCpD={3}
          backgroundLum={128}
          targetOrientationDeg={
            typeof gaborPreviewMeta.targetOrientationDeg === 'number'
              ? gaborPreviewMeta.targetOrientationDeg
              : 45
          }
          cardOrientations={
            Array.isArray(gaborPreviewMeta.cardOrientations)
              ? (gaborPreviewMeta.cardOrientations as number[])
              : []
          }
          thickSide="left"
          sfOrientationDeg={
            typeof gaborPreviewMeta.orientationDeg === 'number'
              ? gaborPreviewMeta.orientationDeg
              : 0
          }
        />
      ) : isCustomVernierMode ? (
        <VernierTaskStimulus
          mode={vernierMode as Exclude<VtVernierTaskMode, 'alignment_2afc' | 'greater_offset_2afc'>}
          offsetPx={vernierLineMetrics.offsetPx}
          lineHeightPx={vernierLineMetrics.lineHeightPx}
          gapPx={vernierLineMetrics.gapPx}
          lineWidthPx={vernierLineMetrics.lineWidthPx}
          backgroundLum={200}
          offsetSign={
            vernierPreviewMeta.offsetSign === -1 || vernierPreviewMeta.offsetSign === 1
              ? (vernierPreviewMeta.offsetSign as 1 | -1)
              : 1
          }
          cardOffsetSigns={
            Array.isArray(vernierPreviewMeta.cardOffsetSigns)
              ? (vernierPreviewMeta.cardOffsetSigns as (1 | -1)[])
              : []
          }
        />
      ) : isCustomCrowdingMode ? (
        <CrowdingTaskStimulus
          mode={
            crowdingMode as Exclude<VtCrowdingTaskMode, 'location_2afc' | 'letter_match_2afc'>
          }
          spacingRatio={1.2}
          letterHeightPx={Math.max(lineHeightDegToPx(0.6, pixelsPerDeg), 18)}
          targetLetter={
            typeof crowdingPreviewMeta.targetLetter === 'string'
              ? crowdingPreviewMeta.targetLetter
              : 'E'
          }
          flankerLetters={crowdingPreviewStage.flankerLetters}
          backgroundLum={220}
          cardTargets={
            Array.isArray(crowdingPreviewMeta.cardTargets)
              ? (crowdingPreviewMeta.cardTargets as string[])
              : []
          }
        />
      ) : (
        <Box
          sx={{
            border: `2px solid ${activeWorldInfo.color}55`,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: `0 0 30px ${activeWorldInfo.color}33`,
            transition: 'box-shadow 0.3s',
          }}
        >
          <canvas
            ref={canvasRef}
            width={480}
            height={canvasH}
            style={{
              display: 'block',
              background: `rgb(${bgLum},${bgLum},${bgLum})`,
            }}
          />
        </Box>
      )}

      {/* Visual settings chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
        {visualSettings?.contrast != null && (
          <Chip
            label={`Contrast: ${visualSettings.contrast}%`}
            size="small"
            sx={{ bgcolor: '#6C5CE7', color: 'white' }}
          />
        )}
        {visualSettings?.visionType && (
          <Chip
            label={visualSettings.visionType === 'far' ? 'Nhìn xa' : 'Nhìn gần'}
            size="small"
            sx={{ bgcolor: '#4ECDC4', color: 'white' }}
          />
        )}
        <Chip
          label={
            activeWorld === 'gabor'
              ? GABOR_TASK_MODE_LABELS[gaborMode]
              : activeWorld === 'vernier'
                ? VERNIER_TASK_MODE_LABELS[vernierMode]
                : activeWorld === 'stereopsis'
                  ? STEREOPSIS_TASK_MODE_LABELS[stereopsisMode]
                  : CROWDING_TASK_MODE_LABELS[crowdingMode]
          }
          size="small"
          sx={{
            bgcolor: activeWorldInfo.color + '33',
            color: activeWorldInfo.color,
            border: `1px solid ${activeWorldInfo.color}66`,
          }}
        />
      </Stack>
    </Box>
  );
};

export default VtQuestPreview;
