import React from 'react';
import {
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { WarrantyClinicalData } from 'src/types/core/warranty';
import {
  WARRANTY_EXAM_TYPES,
  type WarrantyExamTypeKey,
  formatWarrantyEyeLevel,
  getVisionLevelOptions,
  eyesForWarrantyExam,
  warrantyEyeLabel,
} from 'src/utils/warrantyVisionOptions';

type EyeKey = 'leftEye' | 'rightEye' | 'bothEye';
type ResultPeriod = 'initial' | 'current';

export interface ClinicalExamResultsTableProps {
  examResults?: WarrantyClinicalData['examResults'];
  readOnly?: boolean;
  onEyeChange?: (
    examType: WarrantyExamTypeKey,
    period: ResultPeriod,
    eye: EyeKey,
    level: number | null
  ) => void;
  compact?: boolean;
}

const ClinicalExamResultsTable: React.FC<ClinicalExamResultsTableProps> = ({
  examResults,
  readOnly = true,
  onEyeChange,
  compact = false,
}) => (
  <Grid container spacing={compact ? 1.5 : 2}>
    {WARRANTY_EXAM_TYPES.map(({ key, label }) => {
      const exam = examResults?.[key];
      const options = getVisionLevelOptions(key);

      return (
        <Grid key={key} size={{ xs: 12, md: compact ? 12 : 6 }}>
          <Paper variant="outlined" sx={{ p: compact ? 1.5 : 2 }}>
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
                {eyesForWarrantyExam(key).map((eye) => (
                  <TableRow key={eye}>
                    <TableCell>{warrantyEyeLabel(eye)}</TableCell>
                    {(['initial', 'current'] as const).map((period) => {
                      const rawLevel = exam?.[period]?.[eye];
                      const level =
                        rawLevel != null && rawLevel !== ''
                          ? typeof rawLevel === 'string'
                            ? Number(rawLevel)
                            : rawLevel
                          : null;
                      const selectValue =
                        level != null && Number.isFinite(level) ? level : '';

                      return (
                        <TableCell key={period}>
                          {readOnly ? (
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatWarrantyEyeLevel(key, level)}
                            </Typography>
                          ) : (
                            <TextField
                              select
                              size="small"
                              value={selectValue}
                              onChange={(e) => {
                                const v = e.target.value;
                                onEyeChange?.(
                                  key,
                                  period,
                                  eye,
                                  v === '' ? null : Number(v)
                                );
                              }}
                              sx={{ minWidth: 100 }}
                            >
                              <MenuItem value="">—</MenuItem>
                              {options.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      );
    })}
  </Grid>
);

export default ClinicalExamResultsTable;
