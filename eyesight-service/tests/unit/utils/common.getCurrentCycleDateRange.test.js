const { getCurrentCycleDateRange } = require('../../../src/utils/common');

describe('getCurrentCycleDateRange (Vietnam day boundary)', () => {
  test('daily cycle uses VN midnight even when server would still be previous UTC day', () => {
    // 06:00 VN on Aug 11 = 23:00 UTC on Aug 10
    const now = new Date('2026-08-10T23:00:00.000Z');
    const { start, end } = getCurrentCycleDateRange('daily', now);

    expect(start.toISOString()).toBe('2026-08-10T17:00:00.000Z'); // 00:00 VN Aug 11
    expect(end.toISOString()).toBe('2026-08-11T16:59:59.999Z'); // 23:59:59.999 VN Aug 11
  });

  test('daily cycle before VN midnight still belongs to previous VN day', () => {
    // 23:30 VN on Aug 10 = 16:30 UTC on Aug 10
    const now = new Date('2026-08-10T16:30:00.000Z');
    const { start, end } = getCurrentCycleDateRange('daily', now);

    expect(start.toISOString()).toBe('2026-08-09T17:00:00.000Z'); // 00:00 VN Aug 10
    expect(end.toISOString()).toBe('2026-08-10T16:59:59.999Z');
  });

  test('monthly cycle anchors to 1st of month VN', () => {
    const now = new Date('2026-08-11T01:00:00.000Z'); // 08:00 VN Aug 11
    const { start, end } = getCurrentCycleDateRange('monthly', now);

    expect(start.toISOString()).toBe('2026-07-31T17:00:00.000Z'); // 00:00 VN Aug 1
    expect(end.toISOString()).toBe('2026-08-31T16:59:59.999Z'); // end of Aug VN
  });

  test('vnDateKey uses Vietnam calendar, not UTC', () => {
    const { vnDateKey } = require('../../../src/utils/common');
    // 06:09 VN Aug 19 = 23:09 UTC Aug 18
    expect(vnDateKey(new Date('2026-08-18T23:09:00.000Z'))).toBe('2026-08-19');
    expect(new Date('2026-08-18T23:09:00.000Z').toISOString().split('T')[0]).toBe('2026-08-18');
  });

  test('sqlVnDate converts timestamptz without a UTC double-shift', () => {
    const { sqlVnDate } = require('../../../src/utils/common');
    expect(sqlVnDate('er."createdAt"')).toBe(`DATE((er."createdAt") AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
  });
});
