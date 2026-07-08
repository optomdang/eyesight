import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { formatExerciseDuration } from 'src/utils/exerciseDuration';

interface ExerciseInfoProps {
  exerciseConfig: any;
  gameStarted: boolean;
  onStartGame: () => void;
}

const ExerciseInfo: React.FC<ExerciseInfoProps> = ({
  exerciseConfig,
  gameStarted,
  onStartGame,
}) => {
  return (
    <Box>
      {/* Chế độ luyện tập hiện tại - Simple Layout */}
      {exerciseConfig ? (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            Chế độ luyện tập: {exerciseConfig?.name || 'N/A'}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Loại
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {exerciseConfig.configType === 'admin' ? 'Hệ thống' : 'Bác sĩ tạo'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Mắt luyện tập
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {exerciseConfig.eye === 'right'
                  ? 'Mắt phải'
                  : exerciseConfig.eye === 'left'
                    ? 'Mắt trái'
                    : exerciseConfig.eye === 'both'
                      ? 'Cả hai mắt'
                      : 'Không xác định'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Khoảng cách
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {exerciseConfig.distance || 0}m
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Thời gian
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {formatExerciseDuration(exerciseConfig.duration)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Tần suất
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {exerciseConfig.frequency === 'daily'
                  ? 'Hàng ngày'
                  : exerciseConfig.frequency === 'weekly'
                    ? 'Hàng tuần'
                    : exerciseConfig.frequency === 'monthly'
                      ? 'Hàng tháng'
                      : exerciseConfig.frequency === 'quarterly'
                        ? 'Hàng quý'
                        : exerciseConfig.frequency === 'yearly'
                          ? 'Hàng năm'
                          : 'Không xác định'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Kích thước chữ
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {exerciseConfig.fontSize || 16}px
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Độ tương phản
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {Math.round(exerciseConfig.contrast || 1)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Màu sắc
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {typeof exerciseConfig.colorScheme === 'object' && exerciseConfig.colorScheme
                  ? 'Tùy chỉnh'
                  : exerciseConfig.colorScheme === 'standard'
                    ? 'Chuẩn'
                    : exerciseConfig.colorScheme === 'high-contrast'
                      ? 'Tương phản cao'
                      : exerciseConfig.colorScheme === 'redgreen'
                        ? 'Đỏ xanh'
                        : exerciseConfig.colorScheme === 'bluewhite'
                          ? 'Xanh trắng'
                          : exerciseConfig.colorScheme || 'Mặc định'}
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'warning.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'warning.main',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
            Chế độ luyện tập chưa được cấu hình
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bài tập này chưa có cấu hình luyện tập. Vui lòng liên hệ bác sĩ để được cấu hình.
          </Typography>
        </Box>
      )}

      {/* Start game button - chỉ hiện khi chưa bắt đầu */}
      {!gameStarted && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={onStartGame}
          >
            Bắt đầu luyện tập
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ExerciseInfo;
