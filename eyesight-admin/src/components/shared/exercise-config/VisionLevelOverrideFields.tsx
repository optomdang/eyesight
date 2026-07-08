import React, { useMemo } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import { HelpTooltip } from 'src/components/shared/HelpTooltip';
import {
  contrastVisionLevels,
  farVisionLevels,
  nearVisionLevels,
  stereopsisLevels,
} from 'src/utils/constant';
import { shouldShowFieldError } from 'src/utils';

type VisionType = 'far' | 'near' | 'contrast' | 'stereopsis' | null | undefined;

interface VisionLevelOverrideFieldsProps {
  visionType: VisionType;
  levelOverride: boolean;
  visionLevel: number | null | undefined;
  onLevelOverrideChange: (checked: boolean) => void;
  onVisionLevelChange: (level: number | null) => void;
  errors?: { levelOverride?: { message?: string }; visionLevel?: { message?: string } };
  touched?: { levelOverride?: boolean; visionLevel?: boolean };
  isSubmitted?: boolean;
  readOnly?: boolean;
  /** Section title override */
  title?: string;
  /** When true, omit outer margin (for side-by-side layout) */
  embedded?: boolean;
}

export const VisionLevelOverrideFields: React.FC<VisionLevelOverrideFieldsProps> = ({
  visionType,
  levelOverride,
  visionLevel,
  onLevelOverrideChange,
  onVisionLevelChange,
  errors,
  touched,
  isSubmitted = false,
  readOnly = false,
  title,
  embedded = false,
}) => {
  const { t } = useTranslation();

  const visionOptions = useMemo(() => {
    switch (visionType) {
      case 'far':
        return farVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'near':
        return nearVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'contrast':
        return contrastVisionLevels.map((v) => ({ value: v.level, label: v.score }));
      case 'stereopsis':
        return stereopsisLevels.map((v) => ({ value: v.level, label: v.score }));
      default:
        return [];
    }
  }, [visionType]);

  if (!visionType || visionOptions.length === 0) {
    return null;
  }

  return (
    <Box sx={embedded ? undefined : { mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {title ?? t('config.startingVisionLevel', 'Mức thị lực bắt đầu')}
        </Typography>
        <HelpTooltip
          title={t(
            'config.startingVisionLevelHelp',
            'Mức thị lực khởi đầu khi xem trước hoặc gán bệnh nhân (nếu không chọn riêng)'
          )}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={levelOverride === true}
              onChange={(e) => onLevelOverrideChange(e.target.checked)}
              disabled={readOnly}
              size="small"
            />
          }
          label={t('config.specifyStartingLevel', 'Chỉ định mức bắt đầu')}
        />
        {levelOverride && (
          <TextField
            select
            size="small"
            label={t('config.visionLevel', 'Cấp độ thị lực')}
            value={visionLevel ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onVisionLevelChange(val === '' ? null : Number(val));
            }}
            disabled={readOnly}
            error={shouldShowFieldError(errors?.visionLevel, touched?.visionLevel, isSubmitted)}
            helperText={
              shouldShowFieldError(errors?.visionLevel, touched?.visionLevel, isSubmitted)
                ? (errors?.visionLevel?.message as string)
                : ''
            }
            sx={{ minWidth: 200 }}
          >
            {visionOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
    </Box>
  );
};
