/**
 * PatientExerciseDetail Component - Patient Portal
 * Uses /my/* APIs from Swagger v1.7.0
 * Synchronized with admin format - colorScheme + 0-1 contrast
 * Integrated with Level Management System
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  Paper,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import { VisualSettings } from 'src/types/core';
import { SubmitExerciseResultRequest, ExerciseProps } from '../types';
import { getColorsFromScheme } from 'src/services/patient.service';
import { useMyAssignmentDetail, useMyExerciseResults } from '../hooks/usePatientPortal';

export const Exercise: React.FC<ExerciseProps> = ({ exerciseId, onComplete }) => {
  // Patient Portal hooks
  const {
    assignment,
    loading: exerciseLoading,
    error: exerciseError,
  } = useMyAssignmentDetail(Number(exerciseId));
  const { submitResult } = useMyExerciseResults();

  // State management
  const [currentLevel, setCurrentLevel] = useState(1);

  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    fontSize: 16,
    colorScheme: 'standard',
    contrast: 1,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseStartTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [levelCompleteData, setLevelCompleteData] = useState<any>(null);

  // Level-management placeholders (component currently runs in single-level mode)
  const progression: {
    totalLevels: number;
    maxUnlockedLevel: number;
    patientProgress: { completedLevels: number[] };
  } | null = null;
  const levelConfig: {
    difficulty: 'easy' | 'medium' | 'hard';
    unlockCriteria: { minAccuracy: number; minScore: number };
  } | null = null;
  const levelUnlocked = true;

  const handleLevelChange = (level: number) => {
    setCurrentLevel(level);
  };

  const handleVisualSettingChange = (setting: keyof VisualSettings, value: number | string) => {
    setVisualSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleSubmitResult = async () => {
    if (!assignment) return;

    try {
      setSubmitting(true);
      setError(null);

      // Calculate completion time in seconds
      const completionTime = Math.round((Date.now() - exerciseStartTime) / 1000);

      // Submit exercise result
      const exerciseResult: SubmitExerciseResultRequest = {
        level: currentLevel,
        score,
        accuracy,
        duration: completionTime,
        completed: true,
        visualSettings,
        metadata: {
          submittedAt: new Date().toISOString(),
          deviceType: 'web',
        },
      };

      await submitResult(exerciseResult);

      // Show level complete dialog
      setLevelCompleteData({
        score,
        accuracy,
        completionTime,
      });
      setShowLevelComplete(true);

      if (onComplete) {
        onComplete(exerciseResult);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể gửi kết quả bài tập');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLevelCompleteClose = () => {
    setShowLevelComplete(false);
  };

  // Get colors from color scheme
  const colors = getColorsFromScheme(visualSettings.colorScheme);
  const loading = exerciseLoading;

  return (
    <LoadingBoundary loading={loading} height="400px">
      {exerciseError || !assignment ? (
        <Alert severity="error">{exerciseError || 'Không thể tải thông tin bài tập'}</Alert>
      ) : (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                Exercise {assignment.exerciseConfigId}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Chip
                  label={assignment.status}
                  color={assignment.status === 'completed' ? 'success' : 'primary'}
                />
                <Chip
                  label={`Level ${currentLevel}/${progression?.totalLevels || '?'}`}
                  variant="outlined"
                  color={levelUnlocked ? 'primary' : 'default'}
                />
                <Chip
                  label={levelConfig?.difficulty || 'Unknown'}
                  color={
                    levelConfig?.difficulty === 'easy'
                      ? 'success'
                      : levelConfig?.difficulty === 'medium'
                        ? 'warning'
                        : levelConfig?.difficulty === 'hard'
                          ? 'error'
                          : 'default'
                  }
                />
              </Box>

              {/* Progress Bar */}
              {progression && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Tiến độ: {progression.patientProgress.completedLevels.length}/
                    {progression.totalLevels} levels hoàn thành
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={
                      (progression.patientProgress.completedLevels.length /
                        progression.totalLevels) *
                      100
                    }
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {!levelUnlocked && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Level {currentLevel} chưa được mở khóa. Hoàn thành level trước đó để tiếp tục.
                </Alert>
              )}

              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3 }}
              >
                {/* Level & Visual Settings Panel */}
                <Box>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Chọn Level
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {Array.from(
                        { length: progression?.maxUnlockedLevel || 1 },
                        (_, i) => i + 1
                      ).map((level) => (
                        <Button
                          key={level}
                          variant={level === currentLevel ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleLevelChange(level)}
                          disabled={progression ? level > progression.maxUnlockedLevel : false}
                        >
                          {level}
                        </Button>
                      ))}
                    </Box>

                    {levelConfig && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Yêu cầu: {levelConfig.unlockCriteria.minAccuracy}% độ chính xác,
                          {levelConfig.unlockCriteria.minScore} điểm
                        </Typography>
                      </Box>
                    )}
                  </Paper>

                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Cài đặt hiển thị
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      <Typography gutterBottom>Cỡ chữ: {visualSettings.fontSize}px</Typography>
                      <Slider
                        value={visualSettings.fontSize}
                        onChange={(_, value) =>
                          handleVisualSettingChange('fontSize', value as number)
                        }
                        min={12}
                        max={32}
                        step={2}
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel>Bảng màu</InputLabel>
                        <Select
                          value={visualSettings.colorScheme}
                          onChange={(e) => handleVisualSettingChange('colorScheme', e.target.value)}
                        >
                          <MenuItem value="standard">Chuẩn (Đen/Trắng)</MenuItem>
                          <MenuItem value="redgreen">Đỏ/Xanh lá</MenuItem>
                          <MenuItem value="bluewhite">Xanh dương/Trắng</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography gutterBottom>
                        Độ tương phản: {Math.round(visualSettings.contrast * 100)}%
                      </Typography>
                      <Slider
                        value={visualSettings.contrast}
                        onChange={(_, value) =>
                          handleVisualSettingChange('contrast', value as number)
                        }
                        min={0.1}
                        max={1}
                        step={0.1}
                      />
                    </Box>
                  </Paper>
                </Box>

                {/* Exercise Content */}
                <Box>
                  <Paper
                    sx={{
                      p: 3,
                      minHeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.backgroundColor,
                      color: colors.textColor,
                      filter: `contrast(${visualSettings.contrast}%)`,
                      fontSize: visualSettings.fontSize,
                    }}
                  >
                    <Box textAlign="center">
                      <Typography
                        variant="h2"
                        sx={{ fontSize: `${visualSettings.fontSize * 2}px`, mb: 2 }}
                      >
                        Level {currentLevel} Exercise Content
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: `${visualSettings.fontSize}px` }}>
                        {levelConfig?.difficulty && `Difficulty: ${levelConfig.difficulty}`}
                      </Typography>

                      {/* Mock exercise controls */}
                      <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" gutterBottom>
                          Score: {score}
                        </Typography>
                        <Typography variant="h6" gutterBottom>
                          Accuracy: {accuracy}%
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setScore(score + 10);
                            setAccuracy(Math.min(100, accuracy + 5));
                          }}
                          sx={{ mr: 2 }}
                        >
                          Correct Answer (+10 points)
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setScore(Math.max(0, score - 5));
                            setAccuracy(Math.max(0, accuracy - 2));
                          }}
                        >
                          Wrong Answer (-5 points)
                        </Button>
                      </Box>
                    </Box>
                  </Paper>

                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => handleLevelChange(Math.max(1, currentLevel - 1))}
                      disabled={currentLevel <= 1}
                    >
                      Level Trước
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleLevelChange(currentLevel + 1)}
                      disabled={!progression || currentLevel >= progression.maxUnlockedLevel}
                    >
                      Level Tiếp
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmitResult}
                      disabled={submitting || !levelUnlocked}
                      sx={{ ml: 'auto' }}
                    >
                      {submitting ? 'Đang gửi...' : 'Hoàn thành Level'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Level Complete Dialog */}
          <Dialog open={showLevelComplete} onClose={handleLevelCompleteClose}>
            <DialogTitle>
              {levelCompleteData?.levelPassed ? '🎉 Hoàn thành Level!' : '😔 Chưa đạt yêu cầu'}
            </DialogTitle>
            <DialogContent>
              {levelCompleteData && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Kết quả Level {currentLevel}:
                  </Typography>
                  <Typography>• Điểm số: {levelCompleteData.score}</Typography>
                  <Typography>• Độ chính xác: {levelCompleteData.accuracy}%</Typography>
                  <Typography>• Thời gian: {levelCompleteData.completionTime}s</Typography>

                  {levelCompleteData.levelPassed && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Chúc mừng! Bạn đã hoàn thành level này.
                    </Alert>
                  )}

                  {levelCompleteData.newLevelUnlocked && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Level {levelCompleteData.nextLevel} đã được mở khóa!
                    </Alert>
                  )}

                  {levelCompleteData.achievements && levelCompleteData.achievements.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Thành tựu:</Typography>
                      {levelCompleteData.achievements.map((achievement: string, index: number) => (
                        <Chip
                          key={index}
                          label={achievement}
                          color="primary"
                          sx={{ mr: 1, mt: 1 }}
                        />
                      ))}
                    </Box>
                  )}

                  {levelCompleteData.recommendations &&
                    levelCompleteData.recommendations.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1">Gợi ý:</Typography>
                        {levelCompleteData.recommendations.map((rec: string, index: number) => (
                          <Typography key={index} variant="body2" sx={{ mt: 1 }}>
                            • {rec}
                          </Typography>
                        ))}
                      </Box>
                    )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleLevelCompleteClose} variant="contained">
                {levelCompleteData?.newLevelUnlocked ? 'Tiếp tục Level tiếp theo' : 'Đóng'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </LoadingBoundary>
  );
};

export default Exercise;
