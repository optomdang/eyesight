import React from 'react';
import { Box, Grid, TextField, Typography, FormControlLabel, Switch } from '@mui/material';
import { LabelWithHelp } from 'src/components/shared/HelpTooltip';
import type { WarrantyClinicalData } from 'src/types/core/warranty';
import {
  WARRANTY_EXAM_TYPES,
  type WarrantyExamTypeKey,
} from 'src/utils/warrantyVisionOptions';
import ClinicalExamResultsTable from './ClinicalExamResultsTable';

export interface ClinicalDataFormProps {
  value: WarrantyClinicalData;
  onChange: (data: WarrantyClinicalData) => void;
  /** Lock entire form (exam + remarks). Overridden by readOnlyExamResults / readOnlyDoctorRemarks. */
  readOnly?: boolean;
  readOnlyExamResults?: boolean;
  readOnlyDoctorRemarks?: boolean;
  showReexamOverride?: boolean;
}

const ClinicalDataForm: React.FC<ClinicalDataFormProps> = ({
  value,
  onChange,
  readOnly = false,
  readOnlyExamResults,
  readOnlyDoctorRemarks,
  showReexamOverride = false,
}) => {
  const examLocked = readOnlyExamResults ?? readOnly;
  const remarksLocked = readOnlyDoctorRemarks ?? readOnly;
  const updateField = <K extends keyof WarrantyClinicalData>(
    key: K,
    fieldValue: WarrantyClinicalData[K]
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const handleEyeChange = (
    examType: WarrantyExamTypeKey,
    period: 'initial' | 'current',
    eye: 'leftEye' | 'rightEye' | 'bothEye',
    level: number | null
  ) => {
    const prevExam = value.examResults?.[examType] || {};
    const prevPeriod = prevExam[period] || { leftEye: null, rightEye: null, bothEye: null };

    const examResults = { ...value.examResults };
    examResults[examType] = {
      ...prevExam,
      [period]: {
        ...prevPeriod,
        [eye]: level,
      },
    };

    onChange({ ...value, examResults });
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Dữ liệu lâm sàng
      </Typography>
      {!examLocked && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Chọn kết quả khám ban đầu ở cột <strong>Ban đầu</strong> (sau khi bệnh nhân test trên
          hệ thống, có thể dùng nút &quot;Lấy từ kết quả test&quot; để điền nhanh).
        </Typography>
      )}

      <ClinicalExamResultsTable
        examResults={value.examResults}
        readOnly={examLocked}
        onEyeChange={examLocked ? undefined : handleEyeChange}
      />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        {WARRANTY_EXAM_TYPES.map(({ key }) => {
          const exam = value.examResults?.[key];
          const compliance = value.compliance?.[key];
          if (!compliance && !exam?.lastExamDate) return null;
          return (
            <Grid key={key} size={{ xs: 12, md: 6 }}>
              {compliance && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {WARRANTY_EXAM_TYPES.find((t) => t.key === key)?.label} — Tuân thủ:{' '}
                  {compliance.performanceRate}% ({compliance.completedExams}/{compliance.requiredExams}{' '}
                  buổi)
                </Typography>
              )}
              {exam?.lastExamDate && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Kiểm tra gần nhất: {new Date(exam.lastExamDate).toLocaleDateString('vi-VN')}
                </Typography>
              )}
            </Grid>
          );
        })}
      </Grid>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
        <LabelWithHelp help="Nội dung này hiển thị trên link ký cho phụ huynh xem trước khi ký.">
          Nhận xét của bác sĩ
        </LabelWithHelp>
      </Typography>
      {!remarksLocked && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Nhập ghi chú và xác nhận chuyên môn trước khi tạo link ký cho phụ huynh.
        </Typography>
      )}

      <Grid container spacing={2}>
        <Grid size={12}>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
            <LabelWithHelp help="Ghi chú lâm sàng bổ sung cho biên bản cam kết bảo hành.">
              Ghi chú lâm sàng
            </LabelWithHelp>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder="Nhập ghi chú lâm sàng..."
            value={value.clinicalNotes || ''}
            onChange={(e) => updateField('clinicalNotes', e.target.value)}
            disabled={remarksLocked}
            slotProps={{ input: { 'aria-label': 'Ghi chú lâm sàng' } }}
          />
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value.improvementObserved)}
                onChange={(e) => updateField('improvementObserved', e.target.checked)}
                disabled={remarksLocked}
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
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
            <LabelWithHelp help="Xác nhận chuyên môn của bác sĩ về tuân thủ và kết quả điều trị.">
              Xác nhận của bác sĩ
            </LabelWithHelp>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            placeholder="Nhập xác nhận của bác sĩ..."
            value={value.doctorConfirmation || ''}
            onChange={(e) => updateField('doctorConfirmation', e.target.value)}
            disabled={remarksLocked}
            slotProps={{ input: { 'aria-label': 'Xác nhận của bác sĩ' } }}
          />
        </Grid>
        {showReexamOverride && (
          <Grid size={12}>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              <LabelWithHelp
                variant="help"
                help="Tái khám sớm hơn 6 tháng so với lần đánh giá trước. Cần ghi rõ lý do chuyên môn."
              >
                Lý do tái khám sớm (&lt; 6 tháng)
              </LabelWithHelp>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              required
              placeholder="Nhập lý do tái khám sớm..."
              value={value.reexamEarlyOverrideReason || ''}
              onChange={(e) => updateField('reexamEarlyOverrideReason', e.target.value)}
              disabled={examLocked}
              slotProps={{ input: { 'aria-label': 'Lý do tái khám sớm' } }}
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ClinicalDataForm;
