const {
  computeDayStatus,
  averageDailyCompletionPct,
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

describe('diligenceCalendar.averageDailyCompletionPct', () => {
  test('keeps 86% in the average — does not promote ≥80% days to 100%', () => {
    const pct = averageDailyCompletionPct(
      [
        { date: '2026-08-09', completionPct: 100, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-10', completionPct: 100, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-11', completionPct: 100, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-12', completionPct: 100, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-13', completionPct: 86, assignedSec: 6000, dailyExamRequired: 0 },
      ],
      '2026-08-13'
    );
    // (100*4 + 86) / 5 = 97.2
    expect(pct).toBe(97.2);
  });

  test('counts 0% for duty days with no work', () => {
    const pct = averageDailyCompletionPct(
      [
        { date: '2026-08-12', completionPct: 100, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-13', completionPct: 0, assignedSec: 6000, dailyExamRequired: 0 },
      ],
      '2026-08-13'
    );
    expect(pct).toBe(50);
  });

  test('ignores future days and days without duty', () => {
    const pct = averageDailyCompletionPct(
      [
        { date: '2026-08-12', completionPct: 80, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-14', completionPct: 0, assignedSec: 6000, dailyExamRequired: 0 },
        { date: '2026-08-12', completionPct: 100, assignedSec: 0, dailyExamRequired: 0, overridden: false },
      ],
      '2026-08-13'
    );
    // Only 2026-08-12 with assignedSec counts (80%). Future 14 ignored. No-duty row ignored.
    expect(pct).toBe(80);
  });
});
