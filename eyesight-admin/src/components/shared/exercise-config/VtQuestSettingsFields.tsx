import React from 'react';
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Typography,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { normalizeExerciseType } from 'src/components/exercises/registry';
import { isVtQuestFamily } from 'src/components/exercises/vt/core/vtExerciseTypes';
import {
  ALL_GABOR_TASK_MODES,
  GABOR_TASK_MODE_LABELS,
  getGaborModeRotation,
} from 'src/components/exercises/vt/core/gaborTaskModes';
import {
  ALL_VERNIER_TASK_MODES,
  VERNIER_TASK_MODE_LABELS,
  getVernierModeRotation,
} from 'src/components/exercises/vt/core/vernierTaskModes';
import {
  ALL_CROWDING_TASK_MODES,
  CROWDING_TASK_MODE_LABELS,
  getCrowdingModeRotation,
} from 'src/components/exercises/vt/core/crowdingTaskModes';
import {
  ALL_STEREOPSIS_TASK_MODES,
  STEREOPSIS_TASK_MODE_LABELS,
  getStereopsisModeRotation,
} from 'src/components/exercises/vt/core/stereopsisTaskModes';
import {
  DEFAULT_VT_SETTINGS,
  type VtCrowdingTaskMode,
  type VtGaborTaskMode,
  type VtSettings,
  type VtStereopsisTaskMode,
  type VtVernierTaskMode,
} from 'src/types/core/vtQuest';

const DEFAULT_GABOR_STIMULUS = DEFAULT_VT_SETTINGS.stimulus.gabor!;
const DEFAULT_VERNIER_STIMULUS = DEFAULT_VT_SETTINGS.stimulus.vernier ?? {};
const DEFAULT_CROWDING_STIMULUS = DEFAULT_VT_SETTINGS.stimulus.crowding ?? {};
const DEFAULT_STEREOPSIS_STIMULUS = DEFAULT_VT_SETTINGS.stimulus.stereopsis ?? {};

export function mergeVtSettingsFormValue(
  prev: Partial<VtSettings> | undefined,
  patch: Partial<VtSettings>
): Partial<VtSettings> {
  return {
    ...DEFAULT_VT_SETTINGS,
    ...(prev ?? {}),
    ...patch,
    stimulus: {
      ...DEFAULT_VT_SETTINGS.stimulus,
      ...(prev?.stimulus ?? {}),
      ...(patch.stimulus ?? {}),
      gabor: {
        ...DEFAULT_GABOR_STIMULUS,
        ...(prev?.stimulus?.gabor ?? {}),
        ...(patch.stimulus?.gabor ?? {}),
      },
      vernier: {
        ...DEFAULT_VERNIER_STIMULUS,
        ...(prev?.stimulus?.vernier ?? {}),
        ...(patch.stimulus?.vernier ?? {}),
      },
      crowding: {
        ...DEFAULT_CROWDING_STIMULUS,
        ...(prev?.stimulus?.crowding ?? {}),
        ...(patch.stimulus?.crowding ?? {}),
      },
      stereopsis: {
        ...DEFAULT_STEREOPSIS_STIMULUS,
        ...(prev?.stimulus?.stereopsis ?? {}),
        ...(patch.stimulus?.stereopsis ?? {}),
      },
    },
    staircase: {
      ...DEFAULT_VT_SETTINGS.staircase,
      ...(prev?.staircase ?? {}),
      ...(patch.staircase ?? {}),
    },
    gamification: {
      ...DEFAULT_VT_SETTINGS.gamification,
      ...(prev?.gamification ?? {}),
      ...(patch.gamification ?? {}),
    },
  };
}

export interface VtQuestSettingsFieldsProps {
  exerciseType?: string | null;
  vtSettings?: Partial<VtSettings> | null;
  onChange: (vtSettings: Partial<VtSettings>) => void;
  readOnly?: boolean;
  /** Show section title + divider (default true) */
  showHeader?: boolean;
}

export const VtQuestSettingsFields: React.FC<VtQuestSettingsFieldsProps> = ({
  exerciseType,
  vtSettings,
  onChange,
  readOnly = false,
  showHeader = true,
}) => {
  const normalizedType = exerciseType ? normalizeExerciseType(exerciseType) : '';
  if (!isVtQuestFamily(normalizedType)) return null;

  const vt = mergeVtSettingsFormValue(vtSettings ?? undefined, {});
  const showGaborModes = normalizedType === 'vt-gabor' || normalizedType === 'vt-quest';
  const showVernierModes = normalizedType === 'vt-vernier' || normalizedType === 'vt-quest';
  const showCrowdingModes = normalizedType === 'vt-crowding' || normalizedType === 'vt-quest';
  const showStereopsisModes = normalizedType === 'vt-stereopsis' || normalizedType === 'vt-quest';
  const selectedGaborModes = getGaborModeRotation(vt.stimulus?.gabor);
  const selectedVernierModes = getVernierModeRotation(vt.stimulus?.vernier);
  const selectedCrowdingModes = getCrowdingModeRotation(vt.stimulus?.crowding);
  const selectedStereopsisModes = getStereopsisModeRotation(vt.stimulus?.stereopsis);
  const singleGaborMode = selectedGaborModes.length === 1;
  const singleVernierMode = selectedVernierModes.length === 1;
  const singleCrowdingMode = selectedCrowdingModes.length === 1;
  const singleStereopsisMode = selectedStereopsisModes.length === 1;
  const singleModeUnlimited =
    (showGaborModes && singleGaborMode && !showVernierModes && !showCrowdingModes && !showStereopsisModes) ||
    (showVernierModes && singleVernierMode && !showGaborModes && !showCrowdingModes && !showStereopsisModes) ||
    (showCrowdingModes && singleCrowdingMode && !showGaborModes && !showVernierModes && !showStereopsisModes) ||
    (showStereopsisModes && singleStereopsisMode && !showGaborModes && !showVernierModes && !showCrowdingModes);

  const patchVt = (patch: Partial<VtSettings>) => {
    onChange(mergeVtSettingsFormValue(vtSettings ?? undefined, patch));
  };

  const patchGabor = (gaborPatch: Partial<NonNullable<VtSettings['stimulus']['gabor']>>) => {
    patchVt({
      stimulus: {
        gabor: {
          ...DEFAULT_GABOR_STIMULUS,
          ...(vt.stimulus?.gabor ?? {}),
          ...gaborPatch,
        },
      },
    });
  };

  const patchVernier = (vernierPatch: Partial<NonNullable<VtSettings['stimulus']['vernier']>>) => {
    patchVt({
      stimulus: {
        vernier: {
          ...DEFAULT_VERNIER_STIMULUS,
          ...(vt.stimulus?.vernier ?? {}),
          ...vernierPatch,
        },
      },
    });
  };

  const patchCrowding = (crowdingPatch: Partial<NonNullable<VtSettings['stimulus']['crowding']>>) => {
    patchVt({
      stimulus: {
        crowding: {
          ...DEFAULT_CROWDING_STIMULUS,
          ...(vt.stimulus?.crowding ?? {}),
          ...crowdingPatch,
        },
      },
    });
  };

  const patchStereopsis = (
    stereopsisPatch: Partial<NonNullable<VtSettings['stimulus']['stereopsis']>>
  ) => {
    patchVt({
      stimulus: {
        stereopsis: {
          ...DEFAULT_STEREOPSIS_STIMULUS,
          ...(vt.stimulus?.stereopsis ?? {}),
          ...stereopsisPatch,
        },
      },
    });
  };

  const toggleGaborMode = (mode: VtGaborTaskMode, checked: boolean) => {
    const current = new Set(selectedGaborModes);
    if (checked) {
      current.add(mode);
    } else {
      if (current.size <= 1) return;
      current.delete(mode);
    }
    const ordered = ALL_GABOR_TASK_MODES.filter((m) => current.has(m));
    patchGabor({
      taskMode: ordered[0],
      taskModesPerSession: ordered.length > 1 ? ordered : undefined,
    });
  };

  const toggleVernierMode = (mode: VtVernierTaskMode, checked: boolean) => {
    const current = new Set(selectedVernierModes);
    if (checked) {
      current.add(mode);
    } else {
      if (current.size <= 1) return;
      current.delete(mode);
    }
    const ordered = ALL_VERNIER_TASK_MODES.filter((m) => current.has(m));
    patchVernier({
      taskMode: ordered[0],
      taskModesPerSession: ordered.length > 1 ? ordered : undefined,
    });
  };

  const toggleCrowdingMode = (mode: VtCrowdingTaskMode, checked: boolean) => {
    const current = new Set(selectedCrowdingModes);
    if (checked) {
      current.add(mode);
    } else {
      if (current.size <= 1) return;
      current.delete(mode);
    }
    const ordered = ALL_CROWDING_TASK_MODES.filter((m) => current.has(m));
    patchCrowding({
      taskMode: ordered[0],
      taskModesPerSession: ordered.length > 1 ? ordered : undefined,
    });
  };

  const toggleStereopsisMode = (mode: VtStereopsisTaskMode, checked: boolean) => {
    const current = new Set(selectedStereopsisModes);
    if (checked) {
      current.add(mode);
    } else {
      if (current.size <= 1) return;
      current.delete(mode);
    }
    const ordered = ALL_STEREOPSIS_TASK_MODES.filter((m) => current.has(m));
    patchStereopsis({
      taskMode: ordered[0],
      taskModesPerSession: ordered.length > 1 ? ordered : undefined,
    });
  };

  return (
    <>
      {showHeader && <Divider sx={{ my: 2 }} />}
      <Box sx={{ mb: 2 }}>
        {showHeader && (
          <>
            <Typography variant="h6" sx={{ mb: 1 }}>
              🚀 Cài đặt Phi hành gia thị giác
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Số lượt hiển thị trong một nhiệm vụ và tần suất gặp boss. Buổi tập kết thúc khi hết
              thời gian đã cấu hình.
            </Typography>
          </>
        )}
        {readOnly && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Đang xem cấu hình gốc — bật &quot;Tạo cấu hình tùy chỉnh&quot; để chỉnh các mục dưới.
          </Typography>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              type="number"
              label="Số lượt hiển thị / nhiệm vụ"
              size="small"
              value={singleModeUnlimited ? '' : (vt.trialsPerStage ?? DEFAULT_VT_SETTINGS.trialsPerStage)}
              placeholder={singleModeUnlimited ? 'Không giới hạn' : undefined}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                patchVt({
                  trialsPerStage: parseInt(e.target.value, 10) || DEFAULT_VT_SETTINGS.trialsPerStage,
                })
              }
              disabled={readOnly || singleModeUnlimited}
              inputProps={{ min: 6, max: 99 }}
              helperText={
                singleModeUnlimited
                  ? 'Một chế độ: tập liên tục đến hết thời gian buổi tập'
                  : 'Áp dụng cho mỗi chế độ khi luân phiên nhiều chế độ'
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              type="number"
              label="Gặp boss sau (nhiệm vụ)"
              size="small"
              value={vt.stagesPerSession ?? DEFAULT_VT_SETTINGS.stagesPerSession}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                patchVt({
                  stagesPerSession:
                    parseInt(e.target.value, 10) || DEFAULT_VT_SETTINGS.stagesPerSession,
                })
              }
              disabled={readOnly}
              inputProps={{ min: 2, max: 10 }}
            />
          </Grid>
        </Grid>

        {showGaborModes && (
          <Box sx={{ mt: 2.5 }}>
            <FormControl component="fieldset" variant="standard" fullWidth disabled={readOnly}>
              <Typography component="legend" variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Chế độ bài Gabor
              </Typography>
              <FormGroup>
                {ALL_GABOR_TASK_MODES.map((mode) => (
                  <FormControlLabel
                    key={mode}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedGaborModes.includes(mode)}
                        onChange={(e) => toggleGaborMode(mode, e.target.checked)}
                      />
                    }
                    label={GABOR_TASK_MODE_LABELS[mode]}
                    sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
                  />
                ))}
              </FormGroup>
              <FormHelperText sx={{ mt: 0.5 }}>
                Chọn nhiều chế độ để luân phiên theo từng nhiệm vụ; hết một vòng các chế độ sẽ quay
                lại chế độ đầu nếu còn thời gian. Giai đoạn boss chọn ngẫu nhiên trong danh sách.
              </FormHelperText>
            </FormControl>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Số hướng lựa chọn</InputLabel>
                  <CustomSelect
                    label="Số hướng lựa chọn"
                    value={vt.stimulus?.gabor?.orientationCount ?? 4}
                    onChange={(e: { target: { value: unknown } }) =>
                      patchGabor({ orientationCount: Number(e.target.value) as 2 | 4 })
                    }
                    disabled={readOnly}
                    size="small"
                  >
                    <MenuItem value={2}>2 hướng (dọc / ngang)</MenuItem>
                    <MenuItem value={4}>4 hướng (dọc / ngang / chéo)</MenuItem>
                  </CustomSelect>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Số thẻ (chế độ thẻ)</InputLabel>
                  <CustomSelect
                    label="Số thẻ (chế độ thẻ)"
                    value={vt.stimulus?.gabor?.cardGridSize ?? 4}
                    onChange={(e: { target: { value: unknown } }) =>
                      patchGabor({ cardGridSize: Number(e.target.value) as 4 | 6 })
                    }
                    disabled={readOnly}
                    size="small"
                  >
                    <MenuItem value={4}>4 thẻ (2×2)</MenuItem>
                    <MenuItem value={6}>6 thẻ (2×3)</MenuItem>
                  </CustomSelect>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {showVernierModes && (
          <Box sx={{ mt: 2.5 }}>
            <FormControl component="fieldset" variant="standard" fullWidth disabled={readOnly}>
              <Typography component="legend" variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Chế độ bài Vernier
              </Typography>
              <FormGroup>
                {ALL_VERNIER_TASK_MODES.map((mode) => (
                  <FormControlLabel
                    key={mode}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedVernierModes.includes(mode)}
                        onChange={(e) => toggleVernierMode(mode, e.target.checked)}
                      />
                    }
                    label={VERNIER_TASK_MODE_LABELS[mode]}
                    sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
                  />
                ))}
              </FormGroup>
              <FormHelperText sx={{ mt: 0.5 }}>
                Chọn nhiều chế độ để luân phiên theo từng nhiệm vụ; hết một vòng các chế độ sẽ quay
                lại chế độ đầu nếu còn thời gian. Giai đoạn boss chọn ngẫu nhiên trong danh sách.
              </FormHelperText>
            </FormControl>
          </Box>
        )}

        {showCrowdingModes && (
          <Box sx={{ mt: 2.5 }}>
            <FormControl component="fieldset" variant="standard" fullWidth disabled={readOnly}>
              <Typography component="legend" variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Chế độ bài Crowding
              </Typography>
              <FormGroup>
                {ALL_CROWDING_TASK_MODES.map((mode) => (
                  <FormControlLabel
                    key={mode}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedCrowdingModes.includes(mode)}
                        onChange={(e) => toggleCrowdingMode(mode, e.target.checked)}
                      />
                    }
                    label={CROWDING_TASK_MODE_LABELS[mode]}
                    sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
                  />
                ))}
              </FormGroup>
              <FormHelperText sx={{ mt: 0.5 }}>
                Chọn nhiều chế độ để luân phiên theo từng nhiệm vụ; hết một vòng các chế độ sẽ quay
                lại chế độ đầu nếu còn thời gian. Giai đoạn boss chọn ngẫu nhiên trong danh sách.
              </FormHelperText>
            </FormControl>
          </Box>
        )}

        {showStereopsisModes && (
          <Box sx={{ mt: 2.5 }}>
            <FormControl component="fieldset" variant="standard" fullWidth disabled={readOnly}>
              <Typography component="legend" variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Chế độ bài Stereopsis (RDS)
              </Typography>
              <FormGroup>
                {ALL_STEREOPSIS_TASK_MODES.map((mode) => (
                  <FormControlLabel
                    key={mode}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedStereopsisModes.includes(mode)}
                        onChange={(e) => toggleStereopsisMode(mode, e.target.checked)}
                      />
                    }
                    label={STEREOPSIS_TASK_MODE_LABELS[mode]}
                    sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
                  />
                ))}
              </FormGroup>
              <FormHelperText sx={{ mt: 0.5 }}>
                Cần kính anaglyph đỏ/xanh. Luân phiên nhiều chế độ giống các hành tinh khác.
              </FormHelperText>
            </FormControl>
          </Box>
        )}
      </Box>
    </>
  );
};
