import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import { IconCircleCheck, IconCircle, IconPlayerPlay } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { TodaySession } from 'src/types/core';

interface TodaySessionsListProps {
  sessions: TodaySession[];
  loading?: boolean;
}

const TodaySessionsList: React.FC<TodaySessionsListProps> = ({ sessions }) => {
  const navigate = useNavigate();

  const handleStartExercise = (assignmentId: number, sessionId?: number | null) => {
    if (sessionId) {
      navigate(`/portal/exercise/assignments/${assignmentId}/sessions/${sessionId}`);
    }
  };
  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            Buổi Tập Hôm Nay
          </Typography>
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Không có buổi tập nào được lên lịch hôm nay
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const completedCount = sessions.filter((s) => s.isCompleted).length;
  const totalCount = sessions.length;

  // Bài chưa làm đủ lên trên, bài đã xong tự xuống dưới (đỡ phải cuộn tìm).
  const sortedSessions = [...sessions].sort(
    (a, b) => Number(a.isCompleted) - Number(b.isCompleted)
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Buổi Tập Hôm Nay
          </Typography>
          <Chip
            label={`${completedCount}/${totalCount}`}
            color={completedCount === totalCount ? 'success' : 'primary'}
            size="small"
          />
        </Box>

        {/* Cuộn khi nhiều bài tập — giữ card gọn, không kéo dài trang */}
        <List sx={{ p: 0, maxHeight: 320, overflowY: 'auto' }}>
          {sortedSessions.map((session, index) => {
            const canStartSession = !session.isCompleted && !!session.currentSessionId;

            return (
              <React.Fragment key={session.assignmentId}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    px: 0,
                    py: 1.5,
                    '&:hover': {
                      bgcolor: canStartSession ? 'action.hover' : 'transparent',
                      cursor: canStartSession ? 'pointer' : 'default',
                    },
                  }}
                  secondaryAction={
                    <Button
                      size="small"
                      variant={session.isCompleted ? 'outlined' : 'contained'}
                      disabled={!canStartSession}
                      startIcon={
                        session.isCompleted ? (
                          <IconCircleCheck size={18} />
                        ) : (
                          <IconPlayerPlay size={18} />
                        )
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartExercise(session.assignmentId, session.currentSessionId);
                      }}
                    >
                      {session.isCompleted ? 'Đã xong' : 'Bắt đầu'}
                    </Button>
                  }
                  onClick={() =>
                    canStartSession &&
                    handleStartExercise(session.assignmentId, session.currentSessionId)
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {session.isCompleted ? (
                      <IconCircleCheck size={24} color="green" />
                    ) : (
                      <IconCircle size={24} color="gray" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {session.exerciseName}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {session.todayCompleted}/{session.todayRequired} buổi • {session.frequency}
                      </Typography>
                    }
                  />
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};

export default TodaySessionsList;
