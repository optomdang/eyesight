import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTranslation } from 'src/hooks/useTranslation';
import type { Exercise, VisualSettings } from 'src/types/core';
import { getExerciseEntry, normalizeExerciseType } from 'src/components/exercises/registry';
import { isVtQuestFamily } from 'src/components/exercises/vt/core/vtExerciseTypes';
import {
  ALL_GABOR_TASK_MODES,
  GABOR_TASK_MODE_LABELS,
} from 'src/components/exercises/vt/core/gaborTaskModes';
import {
  ALL_VERNIER_TASK_MODES,
  VERNIER_TASK_MODE_LABELS,
} from 'src/components/exercises/vt/core/vernierTaskModes';
import {
  ALL_CROWDING_TASK_MODES,
  CROWDING_TASK_MODE_LABELS,
} from 'src/components/exercises/vt/core/crowdingTaskModes';
import {
  ALL_STEREOPSIS_TASK_MODES,
  STEREOPSIS_TASK_MODE_LABELS,
} from 'src/components/exercises/vt/core/stereopsisTaskModes';
import type {
  VtCrowdingTaskMode,
  VtGaborTaskMode,
  VtSettings,
  VtStereopsisTaskMode,
  VtVernierTaskMode,
} from 'src/types/core/vtQuest';
import VtQuestExercise from 'src/components/exercises/vt/portal/VtQuestExercise';
import { buildVtQuestSandboxAssignment } from 'src/components/exercises/vt/core/vtQuestSandbox';
import FarAcuityExercise from 'src/components/exercises/far-acuity/portal/FarAcuityExercise';
import { buildFarAcuitySandboxAssignment } from 'src/components/exercises/far-acuity/core/farAcuitySandbox';
import { getPreferredScreenInfo } from 'src/services/screenCalibration.service';
import { useExerciseFullscreen } from 'src/hooks/useExerciseFullscreen';

interface BaseGameTestDialogProps {
  open: boolean;
  exercise: Exercise | null;
  onClose: () => void;
}

/** Cài đặt mặc định để chơi thử game gốc (không cần chế độ tập). */
const DEFAULT_TEST_VISUAL_SETTINGS: VisualSettings = {
  fontSize: 55,
  contrast: 100,
  scaleFactor: 1,
  visionType: 'far',
};

/** Preset for Gabor sub-mode when playing base vt-gabor / vt-quest from admin. */
type GaborTestPreset = VtGaborTaskMode | 'rotate_all';

const GABOR_TEST_PRESETS: { value: GaborTestPreset; label: string }[] = [
  ...ALL_GABOR_TASK_MODES.map((mode) => ({
    value: mode,
    label: GABOR_TASK_MODE_LABELS[mode],
  })),
  { value: 'rotate_all', label: 'Luân phiên tất cả chế độ' },
];

function buildGaborTestVtSettings(preset: GaborTestPreset) {
  const baseGabor = { sfCpD: 3, orientation: 'vertical' as const, sigmaDeg: 0.5 };
  if (preset === 'rotate_all') {
    return { stimulus: { gabor: { ...baseGabor, taskModesPerSession: ALL_GABOR_TASK_MODES } } };
  }
  return { stimulus: { gabor: { ...baseGabor, taskMode: preset } } };
}

/** Preset for Vernier sub-mode when playing base vt-vernier / vt-quest from admin. */
type VernierTestPreset = VtVernierTaskMode | 'rotate_all';

const VERNIER_TEST_PRESETS: { value: VernierTestPreset; label: string }[] = [
  ...ALL_VERNIER_TASK_MODES.map((mode) => ({
    value: mode,
    label: VERNIER_TASK_MODE_LABELS[mode],
  })),
  { value: 'rotate_all', label: 'Luân phiên tất cả chế độ' },
];

function buildVernierTestVtSettings(preset: VernierTestPreset) {
  if (preset === 'rotate_all') {
    return { stimulus: { vernier: { taskModesPerSession: ALL_VERNIER_TASK_MODES } } };
  }
  return { stimulus: { vernier: { taskMode: preset } } };
}

/** Preset for Crowding sub-mode when playing base vt-crowding / vt-quest from admin. */
type CrowdingTestPreset = VtCrowdingTaskMode | 'rotate_all';

const CROWDING_TEST_PRESETS: { value: CrowdingTestPreset; label: string }[] = [
  ...ALL_CROWDING_TASK_MODES.map((mode) => ({
    value: mode,
    label: CROWDING_TASK_MODE_LABELS[mode],
  })),
  { value: 'rotate_all', label: 'Luân phiên tất cả chế độ' },
];

function buildCrowdingTestVtSettings(preset: CrowdingTestPreset) {
  if (preset === 'rotate_all') {
    return { stimulus: { crowding: { taskModesPerSession: ALL_CROWDING_TASK_MODES } } };
  }
  return { stimulus: { crowding: { taskMode: preset } } };
}

/** Preset for Stereopsis sub-mode when playing base vt-stereopsis / vt-quest from admin. */
type StereopsisTestPreset = VtStereopsisTaskMode | 'rotate_all';

const STEREOPSIS_TEST_PRESETS: { value: StereopsisTestPreset; label: string }[] = [
  ...ALL_STEREOPSIS_TASK_MODES.map((mode) => ({
    value: mode,
    label: STEREOPSIS_TASK_MODE_LABELS[mode],
  })),
  { value: 'rotate_all', label: 'Luân phiên tất cả chế độ' },
];

function buildStereopsisTestVtSettings(preset: StereopsisTestPreset) {
  if (preset === 'rotate_all') {
    return { stimulus: { stereopsis: { taskModesPerSession: ALL_STEREOPSIS_TASK_MODES } } };
  }
  return { stimulus: { stereopsis: { taskMode: preset } } };
}

function buildTestVtSettings(
  isGaborCapable: boolean,
  gaborPreset: GaborTestPreset,
  isVernierCapable: boolean,
  vernierPreset: VernierTestPreset,
  isCrowdingCapable: boolean,
  crowdingPreset: CrowdingTestPreset,
  isStereopsisCapable: boolean,
  stereopsisPreset: StereopsisTestPreset
): Partial<VtSettings> | undefined {
  const stimulus: Partial<VtSettings['stimulus']> = {};
  if (isGaborCapable) {
    Object.assign(stimulus, buildGaborTestVtSettings(gaborPreset).stimulus);
  }
  if (isVernierCapable) {
    Object.assign(stimulus, buildVernierTestVtSettings(vernierPreset).stimulus);
  }
  if (isCrowdingCapable) {
    Object.assign(stimulus, buildCrowdingTestVtSettings(crowdingPreset).stimulus);
  }
  if (isStereopsisCapable) {
    Object.assign(stimulus, buildStereopsisTestVtSettings(stereopsisPreset).stimulus);
  }
  return Object.keys(stimulus).length > 0 ? { stimulus } : undefined;
}

function getVtTestHint(
  isGaborCapable: boolean,
  isVernierCapable: boolean,
  isCrowdingCapable: boolean,
  isStereopsisCapable: boolean
): string {
  if (isGaborCapable && isVernierCapable) {
    return 'Chọn chế độ Gabor / Vernier bên phải — áp dụng khi chơi hành tinh tương ứng';
  }
  if (isGaborCapable) {
    return 'Chọn chế độ Gabor bên phải — mặc định cũ là Tìm ánh sáng (trái/phải)';
  }
  if (isVernierCapable) {
    return 'Chọn chế độ Vernier bên phải — mặc định cũ là Tìm bên lệch (trái/phải)';
  }
  if (isCrowdingCapable) {
    return 'Chọn chế độ Crowding bên phải — mặc định cũ là Tìm chữ ẩn (trái/phải)';
  }
  if (isStereopsisCapable) {
    return 'Chọn chế độ Stereopsis bên phải — cần kính anaglyph đỏ/xanh';
  }
  return 'Chơi đầy đủ staircase — không lưu kết quả';
}

const VT_TEST_SELECT_SX = {
  color: 'white',
  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.35)' },
  '.MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
} as const;

const BaseGameTestDialog: React.FC<BaseGameTestDialogProps> = ({ open, exercise, onClose }) => {
  const { t } = useTranslation();
  const [gaborTestPreset, setGaborTestPreset] = useState<GaborTestPreset>('orientation_id');
  const [vernierTestPreset, setVernierTestPreset] =
    useState<VernierTestPreset>('offset_direction_mcq');
  const [crowdingTestPreset, setCrowdingTestPreset] =
    useState<CrowdingTestPreset>('central_letter_id');
  const [stereopsisTestPreset, setStereopsisTestPreset] =
    useState<StereopsisTestPreset>('shape_id');

  const normalizedType = normalizeExerciseType(exercise?.exerciseType ?? exercise?.code ?? '');
  const isGaborCapable = normalizedType === 'vt-gabor' || normalizedType === 'vt-quest';
  const isVernierCapable = normalizedType === 'vt-vernier' || normalizedType === 'vt-quest';
  const isCrowdingCapable = normalizedType === 'vt-crowding' || normalizedType === 'vt-quest';
  const isStereopsisCapable = normalizedType === 'vt-stereopsis' || normalizedType === 'vt-quest';

  useEffect(() => {
    if (open && isGaborCapable) {
      // Default to a new mode so "Chơi thử" immediately shows submodes (not legacy 2AFC only).
      setGaborTestPreset('orientation_id');
    }
  }, [open, exercise?.id, isGaborCapable]);

  useEffect(() => {
    if (open && isVernierCapable) {
      setVernierTestPreset('offset_direction_mcq');
    }
  }, [open, exercise?.id, isVernierCapable]);

  useEffect(() => {
    if (open && isCrowdingCapable) {
      setCrowdingTestPreset('central_letter_id');
    }
  }, [open, exercise?.id, isCrowdingCapable]);

  useEffect(() => {
    if (open && isStereopsisCapable) {
      setStereopsisTestPreset('shape_id');
    }
  }, [open, exercise?.id, isStereopsisCapable]);

  const registryEntry = useMemo(
    () => (exercise ? getExerciseEntry(exercise.exerciseType, exercise.code) : undefined),
    [exercise]
  );

  const isVtQuest = isVtQuestFamily(exercise?.exerciseType);
  const isFarAcuity =
    exercise != null && normalizeExerciseType(exercise.exerciseType ?? exercise.code ?? '') === 'far-acuity';

  const sandboxAssignment = useMemo(
    () =>
      isVtQuest && exercise
        ? buildVtQuestSandboxAssignment({
            visionType: 'far',
            visionLevel: 10,
            distance: 3,
            eye: 'both',
            exerciseName: exercise.name,
            exerciseType: exercise.exerciseType,
            vtSettings: buildTestVtSettings(
              isGaborCapable,
              gaborTestPreset,
              isVernierCapable,
              vernierTestPreset,
              isCrowdingCapable,
              crowdingTestPreset,
              isStereopsisCapable,
              stereopsisTestPreset
            ),
          })
        : null,
    [
      isVtQuest,
      exercise,
      isGaborCapable,
      gaborTestPreset,
      isVernierCapable,
      vernierTestPreset,
      isCrowdingCapable,
      crowdingTestPreset,
      isStereopsisCapable,
      stereopsisTestPreset,
    ]
  );

  const farAcuitySandboxAssignment = useMemo(
    () =>
      isFarAcuity && exercise
        ? buildFarAcuitySandboxAssignment({
            visionLevel: 10,
            distance: 3,
            eye: 'both',
            exerciseName: exercise.name,
          })
        : null,
    [isFarAcuity, exercise]
  );

  const screenParams = useMemo(
    () => getPreferredScreenInfo(),
    []
  );

  const PreviewComponent = registryEntry?.PreviewComponent;
  const usesPlayableSandbox = Boolean(
    exercise && ((isVtQuest && sandboxAssignment) || (isFarAcuity && farAcuitySandboxAssignment))
  );
  const previewFullscreenRef = useRef<HTMLDivElement>(null);
  useExerciseFullscreen(
    previewFullscreenRef,
    open && Boolean(exercise) && Boolean(PreviewComponent) && !usesPlayableSandbox
  );

  if (!exercise) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      PaperProps={{ sx: { bgcolor: isVtQuest ? '#0a0520' : 'background.default' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: isVtQuest ? 'rgba(255,255,255,0.1)' : 'divider',
          py: 1.5,
          px: 2,
          flexShrink: 0,
          bgcolor: isVtQuest ? 'rgba(0,0,0,0.45)' : undefined,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="span" sx={{ color: isVtQuest ? 'white' : undefined }}>
            {t('exercise.baseGame.testTitle', 'Chơi thử')}: {exercise.name}
          </Typography>
          <Typography
            variant="caption"
            display="block"
            sx={{ color: isVtQuest ? 'rgba(255,255,255,0.55)' : 'text.secondary' }}
          >
            {isVtQuest
              ? getVtTestHint(
                  isGaborCapable,
                  isVernierCapable,
                  isCrowdingCapable,
                  isStereopsisCapable
                )
              : isFarAcuity
                ? 'Đọc 5 chữ và điền đáp án — không lưu kết quả'
                : t(
                    'exercise.baseGame.testHint',
                    'Dùng phím mũi tên để chơi. Đây là bản test game gốc, không lưu kết quả.'
                  )}
          </Typography>
        </Box>
        {isVtQuest &&
          (isGaborCapable ||
            isVernierCapable ||
            isCrowdingCapable ||
            isStereopsisCapable) && (
          <Box sx={{ display: 'flex', gap: 1, mr: 1, flexShrink: 0 }}>
            {isGaborCapable && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="gabor-test-mode-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Chế độ Gabor
                </InputLabel>
                <Select
                  labelId="gabor-test-mode-label"
                  label="Chế độ Gabor"
                  value={gaborTestPreset}
                  onChange={(e) => setGaborTestPreset(e.target.value as GaborTestPreset)}
                  sx={VT_TEST_SELECT_SX}
                >
                  {GABOR_TEST_PRESETS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {isVernierCapable && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="vernier-test-mode-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Chế độ Vernier
                </InputLabel>
                <Select
                  labelId="vernier-test-mode-label"
                  label="Chế độ Vernier"
                  value={vernierTestPreset}
                  onChange={(e) => setVernierTestPreset(e.target.value as VernierTestPreset)}
                  sx={VT_TEST_SELECT_SX}
                >
                  {VERNIER_TEST_PRESETS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {isCrowdingCapable && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="crowding-test-mode-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Chế độ Crowding
                </InputLabel>
                <Select
                  labelId="crowding-test-mode-label"
                  label="Chế độ Crowding"
                  value={crowdingTestPreset}
                  onChange={(e) => setCrowdingTestPreset(e.target.value as CrowdingTestPreset)}
                  sx={VT_TEST_SELECT_SX}
                >
                  {CROWDING_TEST_PRESETS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {isStereopsisCapable && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="stereopsis-test-mode-label" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Chế độ Stereopsis
                </InputLabel>
                <Select
                  labelId="stereopsis-test-mode-label"
                  label="Chế độ Stereopsis"
                  value={stereopsisTestPreset}
                  onChange={(e) => setStereopsisTestPreset(e.target.value as StereopsisTestPreset)}
                  sx={VT_TEST_SELECT_SX}
                >
                  {STEREOPSIS_TEST_PRESETS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}
        <IconButton onClick={onClose} aria-label={t('common.close', 'Đóng')} sx={{ color: isVtQuest ? 'white' : undefined }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {isVtQuest && sandboxAssignment ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <VtQuestExercise
              key={`${exercise.id}-${gaborTestPreset}-${vernierTestPreset}-${crowdingTestPreset}-${stereopsisTestPreset}`}
              assignmentId={0}
              sessionId={0}
              screenParams={screenParams}
              assignment={sandboxAssignment}
              sandboxMode
              unlockAllWorlds
              onSandboxExit={onClose}
            />
          </Box>
        ) : isFarAcuity && farAcuitySandboxAssignment ? (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FarAcuityExercise
              assignmentId={0}
              sessionId={0}
              screenParams={screenParams}
              assignment={farAcuitySandboxAssignment}
              sandboxMode
              onSandboxExit={onClose}
            />
          </Box>
        ) : !PreviewComponent ? (
          <Alert severity="warning" sx={{ m: 3, maxWidth: 560 }}>
            {t(
              'exercise.baseGame.testNotSupported',
              'Game này chưa có component chơi thử trong hệ thống (registry).'
            )}
          </Alert>
        ) : (
          <Box
            ref={previewFullscreenRef}
            sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}
          >
            <PreviewComponent visualSettings={DEFAULT_TEST_VISUAL_SETTINGS} />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BaseGameTestDialog;
