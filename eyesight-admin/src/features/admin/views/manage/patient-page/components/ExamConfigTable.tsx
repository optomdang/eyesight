import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import { useTranslation } from 'src/hooks/useTranslation';
import type { ExamAssignment, PatientWithCompliance } from 'src/types/core';
import { formatVisionLevel } from 'src/utils/visionUtils';

interface ExamConfigTableProps {
  examConfigs: ExamAssignment[];
  patient: PatientWithCompliance;
  loading?: boolean;
}

const ExamConfigTable: React.FC<ExamConfigTableProps> = ({
  examConfigs,
  patient,
  loading = false,
}) => {
  const { t } = useTranslation();

  const getPerformanceChip = (rate: number) => {
    let color: 'success' | 'warning' | 'error' | 'default' = 'default';
    const label = `${rate}%`;

    if (rate >= 90) {
      color = 'success';
    } else if (rate >= 75) {
      color = 'success';
    } else if (rate >= 50) {
      color = 'warning';
    } else {
      color = 'error';
    }

    return <Chip label={label} color={color} size="small" sx={{ fontWeight: 600 }} />;
  };

  const getExamTypeName = (examType: string): string => {
    return t(`exam.${examType}`, examType);
  };

  const getFrequencyLabel = (frequency: string) => {
    return t(`exercise.frequencies.${frequency}`, frequency);
  };

  // Get compliance data from patient
  const getComplianceData = (examType: string) => {
    return (
      patient.compliance?.[examType as keyof typeof patient.compliance] || {
        performanceRate: 0,
        status: 'poor',
        completedExams: 0,
        requiredExams: 0,
        lastCalculatedAt: null,
      }
    );
  };

  // Get exam results from patient
  const getExamResults = (examType: string) => {
    return (
      patient.examResults?.[examType as keyof typeof patient.examResults] || {
        initialResult: { leftEye: null, rightEye: null, bothEye: null },
        currentResult: { leftEye: null, rightEye: null, bothEye: null },
        lastExamDate: null,
      }
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('patient.examConfig.title', 'CHẾ ĐỘ KIỂM TRA')}
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                {/* First header row with merged cells */}
                <TableRow>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                    {t('common.stt', 'STT')}
                  </TableCell>
                  <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.examType', 'BÀI KIỂM TRA')}
                  </TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.frequency', 'TẦN SUẤT')}
                  </TableCell>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.initialResult', 'KẾT QUẢ BAN ĐẦU')}
                  </TableCell>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.currentResult', 'KẾT QUẢ HIỆN TẠI')}
                  </TableCell>
                  <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.compliance', 'MỨC ĐỘ TUÂN THỦ')}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.rightEye', 'MP')}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.leftEye', 'MT')}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.rightEye', 'MP')}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {t('patient.examConfig.table.leftEye', 'MT')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3].map((index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                    <TableCell>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  }

  // Chỉ hiển thị empty state nếu không có config nào enabled
  const enabledConfigs = Array.isArray(examConfigs)
    ? examConfigs.filter((config) => config.isEnabled)
    : [];

  if (enabledConfigs.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('patient.examConfig.title', 'CHẾ ĐỘ KIỂM TRA')}
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {t('patient.examConfig.noData', 'Chưa có cấu hình kiểm tra nào')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('patient.examConfig.title', 'CHẾ ĐỘ KIỂM TRA')}
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              {/* First header row with merged cells */}
              <TableRow>
                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                  {t('common.stt', 'STT')}
                </TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.examType', 'BÀI KIỂM TRA')}
                </TableCell>
                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.frequency', 'TẦN SUẤT')}
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.initialResult', 'KẾT QUẢ BAN ĐẦU')}
                </TableCell>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.currentResult', 'KẾT QUẢ HIỆN TẠI')}
                </TableCell>
                <TableCell rowSpan={2} align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.compliance', 'MỨC ĐỘ TUÂN THỦ')}
                </TableCell>
              </TableRow>
              {/* Second header row with sub-headers. MP = Mắt phải (right eye), MT = Mắt trái (left eye). */}
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.rightEye', 'MP')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.leftEye', 'MT')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.rightEye', 'MP')}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {t('patient.examConfig.table.leftEye', 'MT')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enabledConfigs.map((config, index) => {
                const compliance = getComplianceData(config.examType);
                const examResults = getExamResults(config.examType);
                // Stereopsis (thị giác lập thể) là phép đo HAI MẮT → kết quả nằm ở bothEye,
                // không có MP/MT riêng. Hiển thị giá trị bothEye gộp cả 2 cột để không bị "-".
                const isBinocular = config.examType === 'stereopsis';
                return (
                  <TableRow
                    key={config.id}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                    }}
                  >
                    <TableCell align="center" sx={{ py: 2 }}>
                      {index + 1}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getExamTypeName(config.examType)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 2 }}>
                      <Typography variant="body2">{getFrequencyLabel(config.frequency)}</Typography>
                    </TableCell>
                    {isBinocular ? (
                      <>
                        {/* Stereopsis: kết quả hai mắt (bothEye) gộp 2 cột */}
                        <TableCell align="center" colSpan={2} sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {formatVisionLevel(config.examType, examResults.initialResult?.bothEye)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" colSpan={2} sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {formatVisionLevel(config.examType, examResults.currentResult?.bothEye)}
                          </Typography>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {/* Initial Result - Right Eye (MP = Mắt phải) */}
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {formatVisionLevel(
                              config.examType,
                              examResults.initialResult?.rightEye
                            )}
                          </Typography>
                        </TableCell>
                        {/* Initial Result - Left Eye (MT = Mắt trái) */}
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {formatVisionLevel(config.examType, examResults.initialResult?.leftEye)}
                          </Typography>
                        </TableCell>
                        {/* Current Result - Right Eye (MP = Mắt phải) */}
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {formatVisionLevel(
                              config.examType,
                              examResults.currentResult?.rightEye
                            )}
                          </Typography>
                        </TableCell>
                        {/* Current Result - Left Eye (MT = Mắt trái) */}
                        <TableCell align="center" sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {formatVisionLevel(config.examType, examResults.currentResult?.leftEye)}
                          </Typography>
                        </TableCell>
                      </>
                    )}
                    <TableCell align="center" sx={{ py: 2 }}>
                      {/* Có bài ĐƯỢC GIAO (requiredExams > 0) thì luôn hiện %, kể cả 0% —
                          bệnh nhân bỏ bài phải thấy vi phạm tuân thủ, không được che
                          bằng "Chưa có kết quả" (chỉ dành cho loại chưa tới lịch). */}
                      {compliance.requiredExams > 0 ? (
                        getPerformanceChip(compliance.performanceRate)
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('patient.examConfig.noResults', 'Chưa có kết quả')}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {enabledConfigs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {t('patient.examConfig.noData', 'Chưa có cấu hình kiểm tra nào được bật')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default ExamConfigTable;
