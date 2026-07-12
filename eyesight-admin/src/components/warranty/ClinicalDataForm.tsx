import React from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import type { WarrantyClinicalData } from 'src/types/core/warranty';
import { formatVisionLevel } from 'src/utils/visionUtils';

const EXAM_TYPES = [
  { key: 'far', label: 'Thị lực xa' },
  { key: 'near', label: 'Thị lực gần' },
  { key: 'contrast', label: 'Độ tương phản' },
  { key: 'stereopsis', label: 'Thị giác lập thể' },
] as const;

export interface ClinicalDataFormProps {
  value: WarrantyClinicalData;
  onChange: (data: WarrantyClinicalData) => void;
  readOnly?: boolean;
  showReexamOverride?: boolean;
}

const ClinicalDataForm: React.FC<ClinicalDataFormProps> = ({
  value,
  onChange,
  readOnly = false,
  showReexamOverride = false,
}) => {
  const updateField = <K extends keyof WarrantyClinicalData>(
    key: K,
    fieldValue: WarrantyClinicalData[K]
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Dữ liệu lâm sàng
      </Typography>

      <Grid container spacing={2}>
        {EXAM_TYPES.map(({ key, label }) => {
          const exam = value.examResults?.[key];
          const compliance = value.compliance?.[key];
          return (
            <Grid key={key} size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {label}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Mắt</TableCell>
                      <TableCell>Ban đầu</TableCell>
                      <TableCell>Hiện tại</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(['leftEye', 'rightEye', 'bothEye'] as const).map((eye) => (
                      <TableRow key={eye}>
                        <TableCell>
                          {eye === 'leftEye' ? 'Trái' : eye === 'rightEye' ? 'Phải' : 'Hai mắt'}
                        </TableCell>
                        <TableCell>
                          {exam?.initial?.[eye] != null
                            ? formatVisionLevel(key, exam.initial[eye] as number)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {exam?.current?.[eye] != null
                            ? formatVisionLevel(key, exam.current[eye] as number)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {compliance && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Tuân thủ: {compliance.performanceRate}% ({compliance.completedExams}/
                    {compliance.requiredExams} buổi)
                  </Typography>
                )}
                {exam?.lastExamDate && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Kiểm tra gần nhất: {new Date(exam.lastExamDate).toLocaleDateString('vi-VN')}
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label={
              <LabelWithHelp help="Ghi chú lâm sàng bổ sung cho biên bản cam kết bảo hành.">
                Ghi chú lâm sàng
              </LabelWithHelp>
            }
            value={value.clinicalNotes || ''}
            onChange={(e) => updateField('clinicalNotes', e.target.value)}
            disabled={readOnly}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value.improvementObserved)}
                onChange={(e) => updateField('improvementObserved', e.target.checked)}
                disabled={readOnly}
              />
            }
            label={
              <LabelWithHelp help="Bác sĩ xác nhận có ghi nhận cải thiện có ý nghĩa ở các chỉ số theo dõi.">
                Có cải thiện có ý nghĩa
              </LabelWithHelp>
            }
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            label={
              <LabelWithHelp help="Xác nhận chuyên môn của bác sĩ về tuân thủ và kết quả điều trị.">
                Xác nhận của bác sĩ
              </LabelWithHelp>
            }
            value={value.doctorConfirmation || ''}
            onChange={(e) => updateField('doctorConfirmation', e.target.value)}
            disabled={readOnly}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        {showReexamOverride && (
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              required
              label={
                <LabelWithHelp
                  variant="help"
                  help="Tái khám sớm hơn 6 tháng so với lần đánh giá trước. Cần ghi rõ lý do chuyên môn."
                >
                  Lý do tái khám sớm (&lt; 6 tháng)
                </LabelWithHelp>
              }
              value={value.reexamEarlyOverrideReason || ''}
              onChange={(e) => updateField('reexamEarlyOverrideReason', e.target.value)}
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ClinicalDataForm;
