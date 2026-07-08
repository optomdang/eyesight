import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import { ExamResult } from 'src/types/core';
import { useTranslation } from 'src/hooks/useTranslation';
import { formatVisionLevel } from 'src/utils/visionUtils';

interface ExamResultTableProps {
  examResults: ExamResult[];
  getExamTypeName: (type: string) => string;
  onViewDetail?: (result: ExamResult) => void;
}

const ExamResultTable: React.FC<ExamResultTableProps> = ({
  examResults,
  getExamTypeName,
  onViewDetail,
}) => {
  const { t } = useTranslation();
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('exam.headers.type', 'Loại test')}</TableCell>
            <TableCell>{t('exam.result', 'Kết quả')}</TableCell>
            <TableCell>{t('exam.headers.startedAt', 'Thời gian bắt đầu')}</TableCell>
            <TableCell>{t('exam.headers.endedAt', 'Thời gian kết thúc')}</TableCell>
            <TableCell>{t('exam.headers.detail', 'Chi tiết')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {examResults
            .sort((a, b) => {
              const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
              const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
              return bTime - aTime;
            })
            .map((result) => {
              const isStereopsis = result.examType === 'stereopsis';
              const left = formatVisionLevel(result.examType, result.leftEyeLevel);
              const right = formatVisionLevel(result.examType, result.rightEyeLevel);
              const both = formatVisionLevel(result.examType, result.bothEyeLevel);
              const startedAt = result.startedAt
                ? new Date(result.startedAt).toLocaleString('vi-VN')
                : '-';
              const completedAt = result.completedAt
                ? new Date(result.completedAt).toLocaleString('vi-VN')
                : '-';
              return (
                <TableRow key={result.id} hover>
                  <TableCell>{getExamTypeName(result.examType)}</TableCell>
                  <TableCell>{isStereopsis ? both : `MT: ${left}, MP: ${right}`}</TableCell>
                  <TableCell>{startedAt}</TableCell>
                  <TableCell>{completedAt}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => onViewDetail && onViewDetail(result)}>
                      {t('common.view', 'Xem')}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ExamResultTable;
