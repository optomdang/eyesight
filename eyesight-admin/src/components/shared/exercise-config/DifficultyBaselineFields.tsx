import React from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
} from '@mui/material';
import { HelpTooltip } from 'src/components/shared/HelpTooltip';
import type { DifficultyBaselineSource } from 'src/utils/exerciseDifficultyBaseline';

interface DifficultyBaselineFieldsProps {
  value?: DifficultyBaselineSource | null;
  onChange: (value: DifficultyBaselineSource) => void;
  readOnly?: boolean;
  /** Hide the control for vision types that don't support level scaling (e.g. stereopsis). */
  hidden?: boolean;
}

/**
 * Radio-button pair for choosing how exercise starting difficulty is determined:
 *   • Mức độ thị lực hiện tại  → 'current_exam'
 *   • Cấp độ gần nhất đạt được → 'latest_achieved'
 */
const DifficultyBaselineFields: React.FC<DifficultyBaselineFieldsProps> = ({
  value,
  onChange,
  readOnly = false,
  hidden = false,
}) => {
  if (hidden) return null;

  const effective: DifficultyBaselineSource = value ?? 'current_exam';

  return (
    <Box>
      <FormControl component="fieldset" disabled={readOnly}>
        <FormLabel component="legend" sx={{ fontWeight: 600, mb: 0.5 }}>
          Thay đổi độ khó dựa vào
        </FormLabel>
        <RadioGroup
          value={effective}
          onChange={(_, v) => onChange(v as DifficultyBaselineSource)}
        >
          <FormControlLabel
            value="current_exam"
            control={<Radio size="small" />}
            label={
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Typography component="span" variant="body2" fontWeight={500}>
                  Mức độ thị lực hiện tại
                </Typography>
                <HelpTooltip title="Mỗi lượt tập lấy kết quả khám mới nhất theo loại thị lực và mắt tập." />
              </Box>
            }
            sx={{ alignItems: 'center', mb: 0.5, mr: 0 }}
          />
          <FormControlLabel
            value="latest_achieved"
            control={<Radio size="small" />}
            label={
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Typography component="span" variant="body2" fontWeight={500}>
                  Cấp độ gần nhất đạt được
                </Typography>
                <HelpTooltip title="Lượt đầu tiên theo thị lực khám; các lượt sau giữ mức cao nhất đã đạt trong bài tập này." />
              </Box>
            }
            sx={{ alignItems: 'center', mr: 0 }}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );
};

export default DifficultyBaselineFields;
