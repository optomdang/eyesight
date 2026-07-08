/**
 * Leaderboard (#7) metric helpers — pure functions, unit-testable.
 *
 * HOÀN THÀNH (#8): TB % hoàn thành trên mọi đơn vị giao (test + lượt tập).
 *   - Tính theo CHU KỲ giao (ngày/tuần/…) từ lúc giao → hôm nay; chu kỳ không làm = 0%.
 *   - Test: mỗi session/chu kỳ = 1 đơn vị; % = slot mắt đã đo ÷ slot yêu cầu.
 *   - Tập: mỗi lượt giao (executionCount/buổi) = 1 đơn vị; % = thời gian thực ÷ thời gian giao.
 *
 * TẬP TRUNG (#9 BXH): TB focusScore mọi lượt đã kết thúc (toàn thời gian).
 */

const moment = require('moment');
const { getCurrentCycleDateRange } = require('../../utils/common');

/** Ngưỡng thời gian coi lượt tập là "hoàn thành" (dùng cho session stats, không ép cột BXH = 100). */
const COMPLETION_TIME_THRESHOLD_PCT = 80;

const examSlotsForType = (examType) =>
  examType === 'stereopsis' ? ['bothEyeLevel'] : ['leftEyeLevel', 'rightEyeLevel'];

/**
 * Liệt kê các chu kỳ lịch (daily/weekly/…) từ ngày bắt đầu đến hôm nay.
 * @param {string} frequency
 * @param {Date|string} fromDate
 * @param {Date} [toDate]
 * @returns {{ start: Date, end: Date }[]}
 */
const getCycleRanges = (frequency, fromDate, toDate = new Date()) => {
  if (!fromDate || !frequency) return [];

  const ranges = [];
  const seen = new Set();
  let probe = moment(fromDate).toDate();
  const limit = moment(toDate).endOf('day');

  while (moment(probe).isSameOrBefore(limit)) {
    const { start, end } = getCurrentCycleDateRange(frequency, probe);
    const key = start.toISOString();
    if (!seen.has(key) && moment(start).isSameOrBefore(limit)) {
      seen.add(key);
      ranges.push({ start, end });
    }
    probe = moment(end).add(1, 'millisecond').toDate();
    if (ranges.length > 400) break;
  }

  return ranges;
};

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isInCycle = (dateValue, cycleStart, cycleEnd) => {
  const d = toDate(dateValue);
  if (!d) return false;
  return d >= cycleStart && d <= cycleEnd;
};

/**
 * % hoàn thành một session test theo số mắt/slot đã có kết quả.
 */
const examSessionCompletionPct = (examResult, examType) => {
  if (!examResult) return 0;
  const slots = examSlotsForType(examType);
  let filled = 0;
  slots.forEach((field) => {
    const v = examResult[field];
    if (v != null && v !== '') filled += 1;
  });
  return (filled / slots.length) * 100;
};

/**
 * % hoàn thành một lượt tập theo thời gian.
 */
const exerciseSlotCompletionPct = (durationSec, assignedDurationMin) => {
  const assignedSec = (assignedDurationMin || 0) * 60;
  if (assignedSec <= 0) return durationSec > 0 ? 100 : 0;
  const pct = (Math.max(0, durationSec || 0) / assignedSec) * 100;
  return Math.min(100, pct);
};

/** Lượt tập đã kết thúc (completed hoặc incomplete có duration lưu tại pause/auto-close). */
const isExerciseSlotEnded = (result) => {
  if (!result) return false;
  if (result.status === 'completed') return true;
  return result.status === 'incomplete' && (result.duration ?? 0) > 0;
};

const exerciseSessionSlotPcts = (session, exerciseResultsBySessionId) => {
  const assigned = Math.max(0, parseInt(session?.executionCount, 10) || 0);
  if (assigned === 0) return [];

  const durationMin = parseFloat(session?.executionDuration) || 0;
  const results = exerciseResultsBySessionId[session.id] || [];
  const pcts = [];

  for (let i = 0; i < assigned; i += 1) {
    const r = results[i];
    if (!isExerciseSlotEnded(r)) pcts.push(0);
    else pcts.push(exerciseSlotCompletionPct(r.duration, durationMin));
  }
  return pcts;
};

const findExerciseSessionInCycle = (exerciseSessions, assignmentId, cycleStart, cycleEnd) =>
  exerciseSessions.find(
    (s) =>
      s.exerciseAssignmentId === assignmentId &&
      isInCycle(s.startedAt, cycleStart, cycleEnd)
  );

const findExamSessionInCycle = (examSessions, patientId, examType, cycleStart, cycleEnd) =>
  examSessions.find(
    (s) =>
      s.patientId === patientId &&
      s.examType === examType &&
      isInCycle(s.scheduledDate, cycleStart, cycleEnd)
  );

/**
 * Chu kỳ giao trong khoảng lọc dashboard [windowStart, windowEnd].
 */
const getCycleRangesInWindow = (frequency, fromDate, windowStart, windowEnd) => {
  if (!fromDate || !frequency || !windowStart || !windowEnd) return [];

  const effectiveStart = moment.max(moment(fromDate), moment(windowStart)).toDate();
  const effectiveEnd = moment.min(moment(windowEnd), moment()).endOf('day').toDate();

  if (moment(effectiveStart).isAfter(effectiveEnd)) return [];

  return getCycleRanges(frequency, effectiveStart, effectiveEnd);
};

/**
 * Tab Bài tập (#21–#23, #26): giao theo chu kỳ frequency; ngày/chu kỳ không tập = 0.
 */
const computeCenterExerciseStats = ({
  exerciseAssignments = [],
  exerciseSessions = [],
  exerciseResultsBySessionId = {},
  windowStart,
  windowEnd,
}) => {
  let totalAssignedSeconds = 0;
  let totalActualSeconds = 0;
  let totalAssignedSlots = 0;
  let totalCompletedSlots = 0;
  const byType = {};
  const byPatient = {};

  exerciseAssignments.forEach((assignment) => {
    const frequency = assignment.frequency || 'daily';
    const cycles = getCycleRangesInWindow(
      frequency,
      assignment.assignedAt,
      windowStart,
      windowEnd
    );
    const execCount = Math.max(
      0,
      parseInt(assignment.executionCount ?? assignment.exerciseConfig?.executionCount, 10) || 0
    );
    const durationMin =
      parseFloat(assignment.executionDuration ?? assignment.exerciseConfig?.duration) || 0;
    const type = assignment.exerciseType || 'unknown';
    const pid = assignment.patientId;

    if (!byType[type]) {
      byType[type] = { assigned: 0, completed: 0, actualSeconds: 0, assignedSeconds: 0 };
    }
    if (!byPatient[pid]) {
      byPatient[pid] = { assigned: 0, completed: 0 };
    }

    const assignmentSessions = exerciseSessions.filter(
      (s) => s.exerciseAssignmentId === assignment.id
    );

    cycles.forEach(({ start, end }) => {
      const session = findExerciseSessionInCycle(assignmentSessions, assignment.id, start, end);
      const cycleExecCount = session
        ? Math.max(0, parseInt(session.executionCount, 10) || execCount)
        : execCount;
      const cycleDurationMin = session
        ? parseFloat(session.executionDuration) || durationMin
        : durationMin;
      const cycleSlotSec = cycleDurationMin * 60;

      totalAssignedSlots += cycleExecCount;
      totalAssignedSeconds += cycleExecCount * cycleSlotSec;
      byType[type].assigned += cycleExecCount;
      byType[type].assignedSeconds += cycleExecCount * cycleSlotSec;
      byPatient[pid].assigned += cycleExecCount;

      if (!session) return;

      const results = exerciseResultsBySessionId[session.id] || [];
      for (let i = 0; i < cycleExecCount; i += 1) {
        const r = results[i];
        if (r?.status === 'completed') {
          totalCompletedSlots += 1;
          byType[type].completed += 1;
          byPatient[pid].completed += 1;
          const dur = r.duration || 0;
          totalActualSeconds += dur;
          byType[type].actualSeconds += dur;
        }
      }
    });
  });

  const excellentPatientsCount = Object.values(byPatient).filter(
    (p) => p.assigned > 0 && p.completed / p.assigned > 0.8
  ).length;

  const complianceByType = Object.entries(byType).map(([exerciseType, agg]) => ({
    exerciseType,
    assigned: agg.assigned,
    completed: agg.completed,
    complianceRate:
      agg.assigned > 0 ? Math.round((agg.completed / agg.assigned) * 10000) / 100 : 0,
  }));

  complianceByType.sort((a, b) => b.assigned - a.assigned);

  return {
    timeCompletionRate:
      totalAssignedSeconds > 0
        ? Math.round((totalActualSeconds / totalAssignedSeconds) * 10000) / 100
        : 0,
    countComplianceRate:
      totalAssignedSlots > 0
        ? Math.round((totalCompletedSlots / totalAssignedSlots) * 10000) / 100
        : 0,
    excellentPatientsCount,
    complianceByType,
    totalAssignedSeconds,
    totalActualSeconds,
    totalAssignedSlots,
    totalCompletedSlots,
  };
};

/**
 * Tab Kiểm tra (#11): phiên test hoàn thành / phiên kỳ vọng theo chu kỳ ExamAssignment.
 */
const computeCenterExamComplianceRate = ({
  examAssignments = [],
  examSessions = [],
  windowStart,
  windowEnd,
}) => {
  let expected = 0;
  let completed = 0;

  examAssignments.forEach((config) => {
    const frequency = config.frequency || 'daily';
    const cycles = getCycleRangesInWindow(
      frequency,
      config.createdAt || config.assignedAt,
      windowStart,
      windowEnd
    );
    const patientSessions = examSessions.filter((s) => s.patientId === config.patientId);

    cycles.forEach(({ start, end }) => {
      expected += 1;
      const session = findExamSessionInCycle(
        patientSessions,
        config.patientId,
        config.examType,
        start,
        end
      );
      if (session?.status === 'completed') completed += 1;
    });
  });

  if (expected === 0) return { testComplianceRate: 0, totalSessions: 0, completedSessions: 0 };
  return {
    testComplianceRate: Math.round((completed / expected) * 10000) / 100,
    totalSessions: expected,
    completedSessions: completed,
  };
};

/**
 * KPI Hoàn thành tổng (getCompletionStats): TB % hoàn thành test + tập theo chu kỳ giao.
 */
const computeCenterCombinedCompletionRate = ({
  examAssignments = [],
  examSessions = [],
  examResultBySessionId = {},
  exerciseAssignments = [],
  exerciseSessions = [],
  exerciseResultsBySessionId = {},
  windowStart,
  windowEnd,
}) => {
  const examUnits = [];
  examAssignments.forEach((config) => {
    const frequency = config.frequency || 'daily';
    const cycles = getCycleRangesInWindow(
      frequency,
      config.createdAt || config.assignedAt,
      windowStart,
      windowEnd
    );
    const patientSessions = examSessions.filter((s) => s.patientId === config.patientId);

    cycles.forEach(({ start, end }) => {
      const session = findExamSessionInCycle(
        patientSessions,
        config.patientId,
        config.examType,
        start,
        end
      );
      if (!session) {
        examUnits.push(0);
        return;
      }
      const result = examResultBySessionId[session.id] || null;
      examUnits.push(examSessionCompletionPct(result, config.examType));
    });
  });

  const exerciseUnits = [];
  exerciseAssignments.forEach((assignment) => {
    const frequency = assignment.frequency || 'daily';
    const cycles = getCycleRangesInWindow(
      frequency,
      assignment.assignedAt,
      windowStart,
      windowEnd
    );
    const execCount = Math.max(
      0,
      parseInt(assignment.executionCount ?? assignment.exerciseConfig?.executionCount, 10) || 0
    );
    const assignmentSessions = exerciseSessions.filter(
      (s) => s.exerciseAssignmentId === assignment.id
    );

    cycles.forEach(({ start, end }) => {
      const session = findExerciseSessionInCycle(assignmentSessions, assignment.id, start, end);
      const cycleExecCount = session
        ? Math.max(0, parseInt(session.executionCount, 10) || execCount)
        : execCount;

      if (!session) {
        for (let i = 0; i < cycleExecCount; i += 1) exerciseUnits.push(0);
        return;
      }
      const slotPcts = exerciseSessionSlotPcts(session, exerciseResultsBySessionId);
      if (slotPcts.length === 0) {
        for (let i = 0; i < cycleExecCount; i += 1) exerciseUnits.push(0);
      } else {
        exerciseUnits.push(...slotPcts);
      }
    });
  });

  const examAvg =
    examUnits.length > 0 ? examUnits.reduce((a, b) => a + b, 0) / examUnits.length : 0;
  const exerciseAvg =
    exerciseUnits.length > 0
      ? exerciseUnits.reduce((a, b) => a + b, 0) / exerciseUnits.length
      : 0;

  const hasExam = examUnits.length > 0;
  const hasExercise = exerciseUnits.length > 0;

  let completionRate = 0;
  if (hasExam && hasExercise) completionRate = (examAvg + exerciseAvg) / 2;
  else if (hasExam) completionRate = examAvg;
  else if (hasExercise) completionRate = exerciseAvg;

  return {
    completionRate: Math.round(completionRate * 100) / 100,
    test: {
      completed: examUnits.filter((u) => u >= 100).length,
      total: examUnits.length,
      pct: Math.round(examAvg * 100) / 100,
    },
    exercise: {
      completed: exerciseUnits.filter((u) => u >= 100).length,
      total: exerciseUnits.length,
      pct: Math.round(exerciseAvg * 100) / 100,
    },
  };
};

const findExamSessionInCycleLegacy = (examSessions, examType, cycleStart, cycleEnd) =>
  examSessions.find(
    (s) => s.examType === examType && isInCycle(s.scheduledDate, cycleStart, cycleEnd)
  );

/** Legacy: chỉ các session/lượt đã có trong DB (không tính chu kỳ bỏ lỡ). */
const computePatientCompletionPctLegacy = ({
  examSessions,
  examResultBySessionId,
  exerciseSessions,
  exerciseResultsBySessionId,
}) => {
  const unitPcts = [];

  examSessions.forEach((session) => {
    const result = examResultBySessionId[session.id] || null;
    unitPcts.push(examSessionCompletionPct(result, session.examType));
  });

  exerciseSessions.forEach((session) => {
    unitPcts.push(...exerciseSessionSlotPcts(session, exerciseResultsBySessionId));
  });

  if (unitPcts.length === 0) return 0;
  return unitPcts.reduce((a, b) => a + b, 0) / unitPcts.length;
};

/**
 * TB % hoàn thành (#8) — gồm chu kỳ không làm (0%).
 */
const computePatientCompletionPct = ({
  examAssignments = [],
  examSessions = [],
  examResultBySessionId = {},
  exerciseAssignments = [],
  exerciseSessions = [],
  exerciseResultsBySessionId = {},
  now = new Date(),
}) => {
  const useCycleModel = exerciseAssignments.length > 0 || examAssignments.length > 0;

  if (!useCycleModel) {
    return computePatientCompletionPctLegacy({
      examSessions,
      examResultBySessionId,
      exerciseSessions,
      exerciseResultsBySessionId,
    });
  }

  const unitPcts = [];

  examAssignments.forEach((config) => {
    const frequency = config.frequency || 'daily';
    const fromDate = config.createdAt || config.assignedAt;
    const cycles = getCycleRanges(frequency, fromDate, now);
    const typeSessions = examSessions.filter((s) => s.examType === config.examType);

    cycles.forEach(({ start, end }) => {
      const session = findExamSessionInCycleLegacy(typeSessions, config.examType, start, end);
      if (!session) {
        unitPcts.push(0);
        return;
      }
      const result = examResultBySessionId[session.id] || null;
      unitPcts.push(examSessionCompletionPct(result, config.examType));
    });
  });

  exerciseAssignments.forEach((assignment) => {
    const frequency = assignment.frequency || assignment.exerciseConfig?.frequency || 'daily';
    const fromDate = assignment.assignedAt;
    const defaultExecutionCount = Math.max(
      0,
      parseInt(assignment.executionCount ?? assignment.exerciseConfig?.executionCount, 10) || 0
    );
    const cycles = getCycleRanges(frequency, fromDate, now);
    const assignmentSessions = exerciseSessions.filter(
      (s) => s.exerciseAssignmentId === assignment.id
    );

    cycles.forEach(({ start, end }) => {
      const session = findExerciseSessionInCycle(assignmentSessions, assignment.id, start, end);
      if (!session) {
        for (let i = 0; i < defaultExecutionCount; i += 1) unitPcts.push(0);
        return;
      }
      const slotPcts = exerciseSessionSlotPcts(session, exerciseResultsBySessionId);
      if (slotPcts.length === 0) {
        for (let i = 0; i < defaultExecutionCount; i += 1) unitPcts.push(0);
      } else {
        unitPcts.push(...slotPcts);
      }
    });
  });

  if (unitPcts.length === 0) return 0;
  return unitPcts.reduce((a, b) => a + b, 0) / unitPcts.length;
};

/**
 * focusScore chuẩn — 30s idle = −1%, mỗi pause = −1%.
 */
const focusScoreFromResult = (result) => {
  if (!result || !isExerciseSlotEnded(result)) return null;
  const inactivityCount = resolveInactivityCountOnComplete(result, {
    movesCount: result.movesCount,
    durationSec: result.duration ?? 0,
  });
  return focusScoreFromCounts(result.pauseCount ?? 0, inactivityCount);
};

/**
 * TB TẬP TRUNG (#9) — chỉ các lượt tập đã kết thúc.
 */
const computePatientFocusPct = (exerciseResults) => {
  const scores = exerciseResults.map(focusScoreFromResult).filter((s) => s !== null);
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
};

/**
 * Mức tập trung buổi (chart Chỉ số 3): TB % tập trung từng lượt đã kết thúc trong ngày.
 */
const computeSessionFocusScore = (endedResults) => {
  const list = Array.isArray(endedResults) ? endedResults : [];
  const pauseCount = list.reduce((sum, r) => sum + (r.pauseCount ?? 0), 0);
  const inactivityCount = list.reduce((sum, r) => sum + (r.inactivityCount ?? 0), 0);

  const slotScores = list.map((r) => {
    if (isExerciseSlotEnded(r)) {
      return focusScoreFromResult(r);
    }
    return focusScoreFromCounts(r.pauseCount ?? 0, r.inactivityCount ?? 0);
  });

  let focusScore = 100;
  if (slotScores.length > 0) {
    const sum = slotScores.reduce((a, b) => a + b, 0);
    focusScore = Math.round(sum / slotScores.length);
  }

  return { pauseCount, inactivityCount, focusScore };
};

const resolveInactivityCountOnComplete = (result, { movesCount, durationSec = 0 } = {}) => {
  const thresholdSec = Number(result?.exerciseConfig?.inactivityThreshold) || 30;
  const inactivityCount = result?.inactivityCount ?? 0;

  if (movesCount !== 0 || durationSec <= 0 || thresholdSec <= 0) {
    return inactivityCount;
  }

  const minimumIdleEvents = Math.floor(durationSec / thresholdSec);
  return Math.max(inactivityCount, minimumIdleEvents);
};

const focusScoreFromCounts = (pauseCount, inactivityCount) =>
  Math.max(0, 100 - (pauseCount ?? 0) - (inactivityCount ?? 0));

const isExerciseSlotFullyComplete = (durationSec, assignedDurationMin) =>
  exerciseSlotCompletionPct(durationSec, assignedDurationMin) >= COMPLETION_TIME_THRESHOLD_PCT;

module.exports = {
  COMPLETION_TIME_THRESHOLD_PCT,
  examSlotsForType,
  getCycleRanges,
  getCycleRangesInWindow,
  examSessionCompletionPct,
  exerciseSlotCompletionPct,
  isExerciseSlotEnded,
  isExerciseSlotFullyComplete,
  computePatientCompletionPct,
  computeCenterExerciseStats,
  computeCenterExamComplianceRate,
  computeCenterCombinedCompletionRate,
  focusScoreFromResult,
  computePatientFocusPct,
  computeSessionFocusScore,
  resolveInactivityCountOnComplete,
  focusScoreFromCounts,
};
