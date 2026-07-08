import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakAndAchievements from '../StreakAndAchievements';

describe('StreakAndAchievements', () => {
  const renderAchievements = (props: Partial<React.ComponentProps<typeof StreakAndAchievements>> = {}) =>
    render(
      <StreakAndAchievements
        streak={4}
        longestStreak={4}
        totalSessions={10}
        averageFocusScore={90}
        {...props}
      />
    );

  it('unlocks Xuất Sắc when average focus score is above 95%', () => {
    const { rerender } = renderAchievements({ averageFocusScore: 95 });
    expect(screen.getByText('Tập trung > 95%').closest('div')).toHaveStyle({ opacity: '0.4' });

    rerender(
      <StreakAndAchievements
        streak={4}
        longestStreak={4}
        totalSessions={10}
        averageFocusScore={96}
      />
    );
    expect(screen.getByText('Tập trung > 95%').closest('div')).toHaveStyle({ opacity: '1' });
  });

  it('unlocks Huyền Thoại when streak reaches 100 consecutive days', () => {
    const { rerender } = renderAchievements({ streak: 99 });
    expect(screen.getByText('100 ngày liên tục').closest('div')).toHaveStyle({ opacity: '0.4' });

    rerender(
      <StreakAndAchievements
        streak={100}
        longestStreak={100}
        totalSessions={10}
        averageFocusScore={90}
      />
    );
    expect(screen.getByText('100 ngày liên tục').closest('div')).toHaveStyle({ opacity: '1' });
  });
});
