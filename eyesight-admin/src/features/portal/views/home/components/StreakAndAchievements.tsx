import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import {
  IconFlame,
  IconTarget,
  IconStar,
  IconMedal,
  IconAward,
} from '@tabler/icons-react';

interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  color: string;
}

interface StreakAndAchievementsProps {
  streak: number;
  longestStreak: number;
  totalSessions: number;
  /** TB % tập trung các lượt đã hoàn thành (0–100). */
  averageFocusScore: number;
}

const StreakAndAchievements: React.FC<StreakAndAchievementsProps> = ({
  streak,
  longestStreak,
  totalSessions,
  averageFocusScore,
}) => {
  // Define achievements based on stats
  const achievements: AchievementBadge[] = [
    {
      id: 'streak_7',
      title: 'Kiên Trì',
      description: '7 ngày liên tục',
      icon: IconFlame,
      unlocked: streak >= 7,
      color: '#FF6B6B',
    },
    {
      id: 'sessions_30',
      title: 'Chăm Chỉ',
      description: '30 buổi tập',
      icon: IconTarget,
      unlocked: totalSessions >= 30,
      color: '#4ECDC4',
    },
    {
      id: 'focus_95',
      title: 'Xuất Sắc',
      description: 'Tập trung > 95%',
      icon: IconStar,
      unlocked: averageFocusScore > 95,
      color: '#FFD93D',
    },
    {
      id: 'streak_30',
      title: 'Siêu Sao',
      description: '30 ngày liên tục',
      icon: IconMedal,
      unlocked: streak >= 30,
      color: '#6C5CE7',
    },
    {
      id: 'streak_100',
      title: 'Huyền Thoại',
      description: '100 ngày liên tục',
      icon: IconAward,
      unlocked: streak >= 100,
      color: '#A29BFE',
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card>
      <CardContent>
        {/* Streak Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Chuỗi Ngày Liên Tục
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              bgcolor: 'warning.lighter',
              borderRadius: 2,
            }}
          >
            <IconFlame size={32} color="#FF6B6B" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.dark', lineHeight: 1.1 }}>
                {streak} ngày
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kỷ lục: {longestStreak} ngày
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Achievements Section */}
        <Box>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Thành Tích
            </Typography>
            <Chip label={`${unlockedCount}/${achievements.length}`} size="small" color="primary" />
          </Box>

          <Grid container spacing={1}>
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <Grid size={{ xs: 4, sm: 4 }} key={achievement.id}>
                  <Box
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      borderRadius: 1.5,
                      border: '1.5px solid',
                      borderColor: achievement.unlocked ? achievement.color : 'divider',
                      bgcolor: achievement.unlocked ? `${achievement.color}15` : 'background.paper',
                      opacity: achievement.unlocked ? 1 : 0.4,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: achievement.unlocked ? 'translateY(-2px)' : 'none',
                        boxShadow: achievement.unlocked ? 2 : 0,
                      },
                    }}
                  >
                    <Icon size={22} color={achievement.unlocked ? achievement.color : 'gray'} />
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        mt: 0.5,
                        fontSize: '0.7rem',
                        color: achievement.unlocked ? 'text.primary' : 'text.disabled',
                      }}
                    >
                      {achievement.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontSize: '0.6rem',
                        lineHeight: 1.2,
                        color: achievement.unlocked ? 'text.secondary' : 'text.disabled',
                      }}
                    >
                      {achievement.description}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StreakAndAchievements;
