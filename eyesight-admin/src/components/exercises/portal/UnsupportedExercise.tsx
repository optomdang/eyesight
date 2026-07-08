import React from 'react';
import { Box, Alert, AlertTitle, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAllRegisteredTypes } from 'src/components/exercises/registry';

interface UnsupportedExerciseProps {
  exerciseType?: string | null;
}

/**
 * Shown when an assignment's exerciseType is not in the exercise registry.
 * Displays a clear error and the list of currently supported types.
 */
const UnsupportedExercise: React.FC<UnsupportedExerciseProps> = ({ exerciseType }) => {
  const navigate = useNavigate();
  const supported = getAllRegisteredTypes();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        p: 3,
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={{ maxWidth: 480, width: '100%' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Bài tập chưa được hỗ trợ</AlertTitle>
          {exerciseType ? (
            <Typography variant="body2">
              Loại bài tập <strong>&quot;{exerciseType}&quot;</strong> chưa được tích hợp vào hệ
              thống. Vui lòng liên hệ quản trị viên.
            </Typography>
          ) : (
            <Typography variant="body2">
              Không xác định được loại bài tập. Vui lòng liên hệ quản trị viên.
            </Typography>
          )}
          {supported.length > 0 && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Các loại đang hỗ trợ: {supported.map((e) => e.displayName).join(', ')}
            </Typography>
          )}
        </Alert>

        <Button variant="outlined" onClick={() => navigate('/portal/exercises')} fullWidth>
          Quay lại danh sách bài tập
        </Button>
      </Box>
    </Box>
  );
};

export default UnsupportedExercise;
