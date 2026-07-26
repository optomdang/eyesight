const {
  computeDayStatus,
  EXERCISE_COMPLETE_THRESHOLD,
} = require('../../../src/services/clinic/diligenceCalendar.service');

describe('diligenceCalendar.computeDayStatus', () => {
  test('none when no duty, activity, or login', () => {
    expect(
      computeDayStatus({
        assignedSec: 0,
        actualSec: 0,
        dailyExamRequired: 0,
        dailyExamCompleted: 0,
        hasLogin: false,
        overriddenComplete: false,
      })
    ).toBe('none');
  });

  test('partial when login only', () => {
    expect(
      computeDayStatus({
        assignedSec: 0,
        actualSec: 0,
        dailyExamRequired: 0,
        dailyExamCompleted: 0,
        hasLogin: true,
        overriddenComplete: false,
      })
    ).toBe('partial');
  });

  test('complete when exercise >= 80% and no daily exams', () => {
    const assigned = 600;
    const actual = Math.ceil(assigned * EXERCISE_COMPLETE_THRESHOLD);
    expect(
      computeDayStatus({
        assignedSec: assigned,
        actualSec: actual,
        dailyExamRequired: 0,
        dailyExamCompleted: 0,
        hasLogin: true,
        overriddenComplete: false,
      })
    ).toBe('complete');
  });

  test('partial when exercise < 80%', () => {
    expect(
      computeDayStatus({
        assignedSec: 600,
        actualSec: 400,
        dailyExamRequired: 0,
        dailyExamCompleted: 0,
        hasLogin: true,
        overriddenComplete: false,
      })
    ).toBe('partial');
  });

  test('partial when exercise ok but daily exam incomplete', () => {
    expect(
      computeDayStatus({
        assignedSec: 600,
        actualSec: 600,
        dailyExamRequired: 1,
        dailyExamCompleted: 0,
        hasLogin: true,
        overriddenComplete: false,
      })
    ).toBe('partial');
  });

  test('complete when exercise ok and daily exams done', () => {
    expect(
      computeDayStatus({
        assignedSec: 600,
        actualSec: 600,
        dailyExamRequired: 2,
        dailyExamCompleted: 2,
        hasLogin: false,
        overriddenComplete: false,
      })
    ).toBe('complete');
  });

  test('none when duty assigned but no login/activity', () => {
    expect(
      computeDayStatus({
        assignedSec: 600,
        actualSec: 0,
        dailyExamRequired: 2,
        dailyExamCompleted: 0,
        hasLogin: false,
        overriddenComplete: false,
      })
    ).toBe('none');
  });

  test('override forces complete', () => {
    expect(
      computeDayStatus({
        assignedSec: 600,
        actualSec: 0,
        dailyExamRequired: 2,
        dailyExamCompleted: 0,
        hasLogin: false,
        overriddenComplete: true,
      })
    ).toBe('complete');
  });
});
