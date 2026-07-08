import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { ExamResult, ExamRawData, ExamRawDataItem } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { formatVisionLevel } from 'src/utils/visionUtils';

interface ExamResultDetailProps {
  result: ExamResult;
}



// Component/table function để tái sử dụng cho từng loại mắt
const RawDataTable: React.FC<{
  label: string;
  rawData?: ExamRawDataItem[][];
  examType: string;
}> = ({ label, rawData, examType }) => {
  if (!Array.isArray(rawData) || rawData.length === 0) return null;

  const normalizeDisplayValue = (value: unknown) => {
    if (value === null || value === undefined) return '-';
    return String(value).trim().toUpperCase();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
          {label}
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 80 }}>Thị lực</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Kết quả (Hiển thị → Trả lời)</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 90, textAlign: 'right' }}>Tỉ lệ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rawData.map((round, roundIdx) => {
              if (!Array.isArray(round)) return null;
              const items = round.filter(
                (item) => item.result !== undefined && item.result !== null
              );
              if (items.length === 0) return null;
              const correct = items.filter((i) => i.result === true).length;
              const visionScore = formatVisionLevel(examType, roundIdx + 1);
              return (
                <TableRow key={roundIdx}>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ color: 'primary.main', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {visionScore}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {items.map((item, idx) => {
                        const answer = normalizeDisplayValue(item.answer);
                        const display = normalizeDisplayValue(item.display);
                        const isCorrect = item.result === true;
                        return (
                          <Box
                            key={idx}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              border: '1px solid',
                              borderColor: isCorrect ? 'success.main' : 'error.main',
                              borderRadius: 1,
                              px: 0.75,
                              py: 0.25,
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              lineHeight: 1.4,
                              minWidth: 28,
                              justifyContent: 'center',
                            }}
                          >
                            {isCorrect ? (
                              <Box component="span" sx={{ color: 'success.main' }}>
                                {answer}
                              </Box>
                            ) : (
                              <>
                                <Box component="span" sx={{ color: 'error.main' }}>
                                  {answer}
                                </Box>
                                <Box component="span" sx={{ color: 'text.disabled', mx: 0.25 }}>
                                  (
                                </Box>
                                <Box component="span" sx={{ color: 'success.main' }}>
                                  {display}
                                </Box>
                                <Box component="span" sx={{ color: 'text.disabled', ml: 0.25 }}>
                                  )
                                </Box>
                              </>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: correct === items.length ? 'success.main' : correct === 0 ? 'error.main' : 'warning.main',
                      }}
                    >
                      {correct}/{items.length}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const ExamResultDetail: React.FC<ExamResultDetailProps> = ({ result }) => {
  const { t } = useTranslation();
  if (!result) return null;
  const rawData: ExamRawData | undefined = result.rawData;
  const hasAny =
    rawData &&
    (Array.isArray(rawData.left) || Array.isArray(rawData.right) || Array.isArray(rawData.both));

  return (
    <Box>
      {!rawData ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          {t('exam.resultDetail.noRawData', 'Không có dữ liệu chi tiết cho kết quả này.')}
        </Typography>
      ) : hasAny ? (
        <Grid container spacing={2}>
          <Grid size={12}>
            <RawDataTable label="Mắt trái" rawData={rawData?.left} examType={result.examType} />
          </Grid>
          <Grid size={12}>
            <RawDataTable label="Mắt phải" rawData={rawData?.right} examType={result.examType} />
          </Grid>
          <Grid size={12}>
            <RawDataTable label="Hai mắt" rawData={rawData?.both} examType={result.examType} />
          </Grid>
        </Grid>
      ) : rawData ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {JSON.stringify(rawData, null, 2)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

export default ExamResultDetail;
