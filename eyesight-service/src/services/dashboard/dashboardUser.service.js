const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { User, Patient, ExamSession, ExamResult, ExerciseSession, ExerciseResult, ExerciseAssignment, ExamAssignment, ExerciseConfig } = require('../../models');
const {
  buildInTreatmentWhereClause,
  buildCompletedWhereClause,
  buildEverTreatedWhereClause,
} = require('../../utils/treatmentUtils');
const { sanitizePagination, buildPagination } = require('../../utils/query');
const {
  patientImproved,
  farLineDelta,
  farLineDeltaBestEye,
  compareType,
  improvedInType,
  VISION_TYPES,
  toLevel,
  farRecoveryPct,
} = require('./visionImprovement');
const {
  computePatientCompletionPct,
  computePatientFocusPct,
  computeCenterCombinedCompletionRate,
} = require('./leaderboardMetrics');

// Far vision level → Snellen denominator lookup (mirrors frontend constant.ts)
const FAR_VISION_DENOMINATORS = {
  1: 400,
  2: 320,
  3: 250,
  4: 200,
  5: 160,
  6: 125,
  7: 100,
  8: 80,
  9: 63,
  10: 50,
  11: 40,
  12: 32,
  13: 25,
  14: 20,
  15: 16,
  16: 12.5,
  17: 10,
  18: 8,
  19: 6.3,
  20: 5,
};

const farLevelToRecoveryPct = (level) => {
  const denom = FAR_VISION_DENOMINATORS[level];
  if (!denom) return null;
  return parseFloat(((20 / denom) * 100).toFixed(2));
};

/**
 * Dashboard User Service
 *
 * ExerciseResult.status (post-D1) is a STRING enum: 'incomplete' | 'completed'.
 * Pass/fail was removed — all "done" queries use status = 'completed'.
 */

/**
 * METRIC 1: Get total patients count (all patients in center)
 * Returns total patients vs active patients
 * @param {number} centerId
 * @param {number} doctorId - Optional doctor filter
 * @returns {Promise<{totalPatients: number, activePatients: number, completedPatients: number}>}
 */
const getTotalPatientsStats = async (centerId, doctorId = null) => {
  const baseWhere = { centerId, deleted: false };
  if (doctorId) {
    baseWhere.doctorId = doctorId;
  }

  // Independent counts — run in parallel (3 round-trips → 1 wait).
  // Keeps treatmentUtils as the single source of truth for the treatment-window logic.
  const [totalPatients, activePatients, completedPatients] = await Promise.all([
    // Total patients in center (not deleted)
    Patient.count({ where: baseWhere }),
    // Active patients (currently in treatment)
    Patient.count({ where: { ...baseWhere, ...buildInTreatmentWhereClause() } }),
    // Completed patients
    Patient.count({ where: { ...baseWhere, ...buildCompletedWhereClause() } }),
  ]);

  return {
    totalPatients,
    activePatients,
    completedPatients,
  };
};

const round2 = (n) => parseFloat(n.toFixed(2));
const round1 = (n) => parseFloat(n.toFixed(1));

/** YYYY-MM-DD theo UTC — khớp DATE(col AT TIME ZONE 'UTC') trong SQL. */
const toUtcDateKey = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Khoảng [start, end] UTC đủ totalDays ngày, kết thúc hôm nay (UTC). */
const buildUtcTrendWindow = (totalDays) => {
  const now = new Date();
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (totalDays - 1), 0, 0, 0, 0)
  );
  return { startDate, endDate };
};

/**
 * METRICS #3, #4, #5 — đọc 1 lần, tính tất cả (loại bỏ load trùng).
 *  #3 TỶ LỆ CẢI THIỆN = improvedSet / everTreated × 100. everTreated = đã bắt đầu điều trị.
 *  #4 MỨC ĐỘ CẢI THIỆN = TB far line-delta (TB 2 mắt) trên improvedSet.
 *  #5 ĐỘ TUỔI = Min/Max/Avg tuổi trên improvedSet.
 * Thuật toán cải thiện dùng module visionImprovement (đúng per-type/per-eye, an toàn kiểu số).
 */
const getPatientImprovementStats = async (centerId, doctorId = null, causes = null) => {
  const now = new Date();
  // everTreated = đã bắt đầu điều trị (status active|paused|completed; loại not_started).
  const baseWhere = { centerId, deleted: false, ...buildEverTreatedWhereClause() };
  if (doctorId) baseWhere.doctorId = doctorId;
  if (causes && causes.length > 0) baseWhere.causes = { [Op.overlap]: causes };

  const treated = await Patient.findAll({
    where: baseWhere,
    attributes: ['id', 'examResults'],
    include: [{ model: User, as: 'user', attributes: ['dateOfBirth'] }],
  });

  const totalTreated = treated.length;
  const improvedList = treated.filter((p) => patientImproved(p.examResults));
  const improvedCount = improvedList.length;
  const improvementRate = totalTreated > 0 ? round2((improvedCount / totalTreated) * 100) : 0;

  // declined = không cải thiện nhưng có loại giảm; stable = phần còn lại
  const patientDeclined = (er) => !patientImproved(er) && VISION_TYPES.some((t) => compareType(t, er?.[t]).declined);
  const declinedCount = treated.filter((p) => patientDeclined(p.examResults)).length;
  const stableCount = totalTreated - improvedCount - declinedCount;

  // #4 — TB far line-delta trên improvedSet
  const farDeltas = improvedList.map((p) => farLineDelta(p.examResults)).filter((d) => d !== null);
  const avgImprovementLevel = farDeltas.length > 0 ? round2(farDeltas.reduce((a, b) => a + b, 0) / farDeltas.length) : 0;

  // #12-15 — % BN cải thiện theo TỪNG loại thị lực (trên everTreated)
  const improvementByType = {};
  VISION_TYPES.forEach((t) => {
    const n = treated.filter((p) => improvedInType(t, p.examResults)).length;
    improvementByType[t] = totalTreated > 0 ? round2((n / totalTreated) * 100) : 0;
  });

  // #5 — Min/Max/Avg tuổi trên improvedSet
  const ages = improvedList
    .map((p) => p.user?.dateOfBirth)
    .filter(Boolean)
    .map((dob) => Math.floor((now - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000)));
  const ageStats =
    ages.length > 0
      ? {
          minAge: Math.min(...ages),
          maxAge: Math.max(...ages),
          avgAge: round1(ages.reduce((a, b) => a + b, 0) / ages.length),
        }
      : { minAge: null, maxAge: null, avgAge: null };

  return {
    improvementRate,
    improvedCount,
    totalTreated,
    avgImprovementLevel,
    improved: improvedCount,
    declined: declinedCount,
    stable: stableCount,
    total: totalTreated,
    ageStats,
    improvementByType, // #12-15: { far, near, contrast, stereopsis } = % everTreated improved per type
  };
};

/**
 * METRIC 5: Get inactive patients list
 * Active patients who haven't logged in for X days
 * @param {number} centerId
 * @param {number} inactiveDays - Number of days (3, 7, 14, 30, 90)
 * @param {Object} options - Pagination options
 * @returns {Promise<{rows: Array, count: number}>}
 */
const getInactivePatients = async (centerId, inactiveDays = 7, options = {}) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const { doctorId = null } = options;
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

  const patientWhere = {
    centerId,
    deleted: false,
    ...buildInTreatmentWhereClause(),
  };
  if (doctorId) patientWhere.doctorId = doctorId;

  const { count, rows } = await Patient.findAndCountAll({
    where: patientWhere,
    include: [
      {
        model: User,
        as: 'user',
        where: {
          [Op.or]: [{ lastLoginAt: { [Op.lt]: thresholdDate } }, { lastLoginAt: null }],
        },
        attributes: ['id', 'name', 'email', 'phoneNumber', 'lastLoginAt'],
      },
    ],
    attributes: ['id', 'code', 'activeFrom', 'activeTo', 'severityLevel'],
    limit,
    offset,
    order: [['user', 'lastLoginAt', 'ASC NULLS FIRST']],
  });

  // Calculate days inactive for each patient
  const patientsWithInactiveDays = rows.map((patient) => {
    const lastLogin = patient.user?.lastLoginAt;
    const daysInactive = lastLogin ? Math.floor((now - new Date(lastLogin)) / (1000 * 60 * 60 * 24)) : null;

    return {
      ...patient.toJSON(),
      daysInactive,
    };
  });

  return {
    rows: patientsWithInactiveDays,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Xu hướng hoạt động (#6): mỗi ngày = số BN distinct đã vào bài tập hoặc bài test
 * (bắt đầu lượt — không cần hoàn thành).
 */
const getUserActivityTrend = async (centerId, days = 30, doctorId = null) => {
  const totalDays = Math.max(1, parseInt(days, 10) || 30);
  const { startDate, endDate } = buildUtcTrendWindow(totalDays);

  const doctorEx = doctorId ? 'AND er."patientId" IN (SELECT id FROM "Patients" WHERE "doctorId" = :doctorId)' : '';
  const doctorExam = doctorId ? 'AND ex."patientId" IN (SELECT id FROM "Patients" WHERE "doctorId" = :doctorId)' : '';

  const rows = await sequelize.query(
    `SELECT TO_CHAR(d, 'YYYY-MM-DD') AS date, COUNT(DISTINCT "patientId")::int AS count
       FROM (
         SELECT DATE(COALESCE(er."startedAt", er."createdAt") AT TIME ZONE 'UTC') AS d, er."patientId"
           FROM "ExerciseResults" er
          WHERE er."centerId" = :centerId AND er.deleted = false
            AND COALESCE(er."startedAt", er."createdAt") BETWEEN :startDate AND :endDate ${doctorEx}
         UNION ALL
         SELECT DATE(COALESCE(ex."startedAt", ex."createdAt") AT TIME ZONE 'UTC') AS d, ex."patientId"
           FROM "ExamResults" ex
          WHERE ex."centerId" = :centerId AND ex.deleted = false
            AND COALESCE(ex."startedAt", ex."createdAt") BETWEEN :startDate AND :endDate ${doctorExam}
       ) t
      WHERE d IS NOT NULL
      GROUP BY d`,
    {
      replacements: { centerId, startDate, endDate, ...(doctorId && { doctorId }) },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const byDate = {};
  rows.forEach((r) => {
    byDate[r.date] = r.count;
  });

  // Fill in missing dates with 0. Key `loginCount` giữ nguyên cho FE tương thích (P8 sẽ đổi tên thành activePatients).
  const trend = [];
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + i);
    const dateStr = toUtcDateKey(date);
    trend.push({
      date: dateStr,
      loginCount: byDate[dateStr] || 0,
    });
  }

  return trend;
};

/**
 * PHỤC HỒI: Average vision recovery % for in-treatment patients (far vision)
 * Formula: (20 / snellen_denominator) × 100% per patient, then average
 *
 * @param {number} centerId
 * @param {number} doctorId
 */
const getVisionRecoveryStats = async (centerId, doctorId = null) => {
  const whereClause = { centerId, deleted: false, ...buildInTreatmentWhereClause() };
  if (doctorId) whereClause.doctorId = doctorId;

  const patients = await Patient.findAll({
    where: whereClause,
    attributes: ['id', 'examResults'],
  });

  let recoverySum = 0;
  let recoveryCount = 0;

  patients.forEach((p) => {
    const cur = p.examResults?.far?.currentResult;
    if (!cur) return;
    // Far is measured per eye (left/right). Convert each present eye to recovery %,
    // then pick the representative eye per the BU rule (#10).
    const lLvl = toLevel(cur.leftEye);
    const rLvl = toLevel(cur.rightEye);
    const lPct = lLvl != null ? farLevelToRecoveryPct(lLvl) : null;
    const rPct = rLvl != null ? farLevelToRecoveryPct(rLvl) : null;
    const pct = farRecoveryPct(lPct, rPct);
    if (pct == null) return;
    recoverySum += pct;
    recoveryCount += 1;
  });

  return {
    avgRecoveryPct: recoveryCount > 0 ? parseFloat((recoverySum / recoveryCount).toFixed(2)) : 0,
    patientCount: recoveryCount,
  };
};

/**
 * HOÀN THÀNH: TB % test + tập theo chu kỳ giao (ngày/chu kỳ bỏ = 0%).
 */
const getCompletionStats = async (centerId, doctorId = null) => {
  const patientWhere = { centerId, deleted: false, ...buildInTreatmentWhereClause() };
  if (doctorId) patientWhere.doctorId = doctorId;

  const patients = await Patient.findAll({ where: patientWhere, attributes: ['id'], raw: true });
  const patientIds = patients.map((p) => p.id);

  if (patientIds.length === 0) {
    return {
      completionRate: 0,
      test: { completed: 0, total: 0, pct: 0 },
      exercise: { completed: 0, total: 0, pct: 0 },
    };
  }

  const now = new Date();
  const windowStart = new Date(0);
  const windowEnd = now;

  const [examAssignments, examSessions, examResults, exerciseAssignments, exerciseSessions, exerciseResults] =
    await Promise.all([
      ExamAssignment.findAll({
        where: { centerId, patientId: patientIds, isEnabled: true },
        attributes: ['id', 'patientId', 'examType', 'frequency', 'createdAt'],
        raw: true,
      }),
      ExamSession.findAll({
        where: { centerId, patientId: patientIds, deleted: false },
        attributes: ['id', 'patientId', 'examType', 'scheduledDate', 'status'],
        raw: true,
      }),
      ExamResult.findAll({
        where: { centerId, patientId: patientIds, deleted: false },
        attributes: [
          'id',
          'patientId',
          'examSessionId',
          'examType',
          'leftEyeLevel',
          'rightEyeLevel',
          'bothEyeLevel',
          'completedAt',
          'createdAt',
        ],
        order: [['completedAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
        raw: true,
      }),
      ExerciseAssignment.findAll({
        where: { centerId, status: 'active', patientId: patientIds },
        attributes: ['id', 'patientId', 'assignedAt', 'exerciseConfigId'],
        include: [
          {
            model: ExerciseConfig,
            as: 'exerciseConfig',
            attributes: ['frequency', 'executionCount', 'duration'],
          },
        ],
      }),
      ExerciseSession.findAll({
        where: { centerId, patientId: patientIds, deleted: false },
        attributes: ['id', 'patientId', 'exerciseAssignmentId', 'executionCount', 'executionDuration', 'startedAt'],
        raw: true,
      }),
      ExerciseResult.findAll({
        where: { centerId, patientId: patientIds, deleted: false },
        attributes: ['id', 'exerciseSessionId', 'status', 'duration', 'createdAt'],
        order: [['createdAt', 'ASC']],
        raw: true,
      }),
    ]);

  const examResultBySessionId = {};
  examResults.forEach((r) => {
    if (!r.examSessionId) return;
    if (!examResultBySessionId[r.examSessionId]) examResultBySessionId[r.examSessionId] = r;
  });

  const exerciseResultsBySessionId = {};
  exerciseResults.forEach((r) => {
    if (!r.exerciseSessionId) return;
    if (!exerciseResultsBySessionId[r.exerciseSessionId]) {
      exerciseResultsBySessionId[r.exerciseSessionId] = [];
    }
    exerciseResultsBySessionId[r.exerciseSessionId].push(r);
  });

  const assignmentRows = exerciseAssignments.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    assignedAt: a.assignedAt,
    frequency: a.exerciseConfig?.frequency,
    executionCount: a.exerciseConfig?.executionCount,
    executionDuration: a.exerciseConfig?.duration,
  }));

  return computeCenterCombinedCompletionRate({
    examAssignments,
    examSessions,
    examResultBySessionId,
    exerciseAssignments: assignmentRows,
    exerciseSessions,
    exerciseResultsBySessionId,
    windowStart,
    windowEnd,
  });
};

/**
 * #7 BẢNG XẾP HẠNG — Hoàn thành → Tập trung → Cải thiện (+ Phục hồi hiển thị).
 * HOÀN THÀNH = TB % trên mọi đơn vị giao (test theo mắt + lượt tập theo thời gian).
 * CẢI THIỆN = số dòng xa của mắt cải thiện nhiều nhất (farLineDeltaBestEye).
 */
const getLeaderboard = async (centerId, doctorId = null) => {
  const patientWhere = { centerId, deleted: false, ...buildInTreatmentWhereClause() };
  if (doctorId) patientWhere.doctorId = doctorId;

  const patients = await Patient.findAll({
    where: patientWhere,
    attributes: ['id', 'code', 'examResults'],
    include: [{ model: User, as: 'user', attributes: ['name'] }],
  });

  if (patients.length === 0) return [];

  const patientIds = patients.map((p) => p.id);
  const idFilter = { [Op.in]: patientIds };

  const [examSessions, examResults, exerciseSessions, exerciseResults, exerciseAssignments, examAssignments] = await Promise.all([
    ExamSession.findAll({
      where: { centerId, patientId: idFilter, deleted: false },
      attributes: ['id', 'patientId', 'examType', 'scheduledDate'],
      raw: true,
    }),
    ExamResult.findAll({
      where: { centerId, patientId: idFilter, deleted: false },
      attributes: [
        'id',
        'patientId',
        'examSessionId',
        'examType',
        'status',
        'leftEyeLevel',
        'rightEyeLevel',
        'bothEyeLevel',
        'completedAt',
        'createdAt',
      ],
      order: [['completedAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']],
      raw: true,
    }),
    ExerciseSession.findAll({
      where: { centerId, patientId: idFilter, deleted: false },
      attributes: ['id', 'patientId', 'exerciseAssignmentId', 'executionCount', 'executionDuration', 'startedAt'],
      raw: true,
    }),
    ExerciseResult.findAll({
      where: { centerId, patientId: idFilter, deleted: false },
      attributes: [
        'id',
        'patientId',
        'exerciseSessionId',
        'status',
        'duration',
        'movesCount',
        'pauseCount',
        'inactivityCount',
        'focusScore',
        'createdAt',
      ],
      order: [['createdAt', 'ASC']],
      raw: true,
    }),
    ExerciseAssignment.findAll({
      where: { patientId: idFilter, status: 'active' },
      attributes: ['id', 'patientId', 'assignedAt', 'exerciseConfigId'],
      include: [
        {
          model: ExerciseConfig,
          as: 'exerciseConfig',
          attributes: ['frequency', 'executionCount', 'duration'],
        },
      ],
    }),
    ExamAssignment.findAll({
      where: { patientId: idFilter, isEnabled: true },
      attributes: ['id', 'patientId', 'examType', 'frequency', 'createdAt'],
      raw: true,
    }),
  ]);

  const groupByPatient = (rows, key = 'patientId') => {
    const map = {};
    rows.forEach((row) => {
      const pid = row[key];
      if (!map[pid]) map[pid] = [];
      map[pid].push(row);
    });
    return map;
  };

  const examsByPatient = groupByPatient(examSessions);
  const examResultsByPatient = groupByPatient(examResults);
  const exSessionsByPatient = groupByPatient(exerciseSessions);
  const exResultsByPatient = groupByPatient(exerciseResults);
  const exAssignmentsByPatient = groupByPatient(
    exerciseAssignments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      assignedAt: a.assignedAt,
      frequency: a.exerciseConfig?.frequency,
      executionCount: a.exerciseConfig?.executionCount,
      exerciseConfig: a.exerciseConfig,
    }))
  );
  const examAssignmentsByPatient = groupByPatient(examAssignments);

  const board = patients.map((p) => {
    const pExamResults = examResultsByPatient[p.id] || [];
    const examResultBySessionId = {};
    pExamResults.forEach((r) => {
      if (!r.examSessionId) return;
      if (!examResultBySessionId[r.examSessionId]) {
        examResultBySessionId[r.examSessionId] = r;
      }
    });

    const exResultsBySessionId = {};
    (exResultsByPatient[p.id] || []).forEach((r) => {
      if (!r.exerciseSessionId) return;
      if (!exResultsBySessionId[r.exerciseSessionId]) exResultsBySessionId[r.exerciseSessionId] = [];
      exResultsBySessionId[r.exerciseSessionId].push(r);
    });

    const completionRate = round2(
      computePatientCompletionPct({
        examAssignments: examAssignmentsByPatient[p.id] || [],
        examSessions: examsByPatient[p.id] || [],
        examResultBySessionId,
        exerciseAssignments: exAssignmentsByPatient[p.id] || [],
        exerciseSessions: exSessionsByPatient[p.id] || [],
        exerciseResultsBySessionId: exResultsBySessionId,
      })
    );

    const focusScore = round2(computePatientFocusPct(exResultsByPatient[p.id] || []));

    const cur = p.examResults?.far?.currentResult;
    const lPct = cur && toLevel(cur.leftEye) != null ? farLevelToRecoveryPct(toLevel(cur.leftEye)) : null;
    const rPct = cur && toLevel(cur.rightEye) != null ? farLevelToRecoveryPct(toLevel(cur.rightEye)) : null;
    const phucHoi = farRecoveryPct(lPct, rPct);
    const delta = farLineDeltaBestEye(p.examResults);

    return {
      patientCode: p.code,
      patientName: p.user?.name || '',
      completionRate,
      focusScore,
      improvementLines: delta == null ? 0 : round2(delta),
      recoveryPct: phucHoi == null ? null : round2(phucHoi),
    };
  });

  board.sort(
    (a, b) =>
      b.completionRate - a.completionRate ||
      b.focusScore - a.focusScore ||
      b.improvementLines - a.improvementLines ||
      String(a.patientCode).localeCompare(String(b.patientCode))
  );
  return board.slice(0, 10);
};

/**
 * Get comprehensive patient statistics
 * Combines all metrics into one response
 * @param {Object} params
 * @param {number} params.centerId
 * @param {string} params.visionType
 * @param {number} params.inactiveDays
 * @param {number} params.trendDays
 * @param {number} params.doctorId - Optional doctor filter
 * @returns {Promise<Object>}
 */
const getPatientStatistics = async ({ centerId, trendDays = 30, doctorId = null, causes = null }) => {
  const [patientsStats, improvementStats, activityTrend, recoveryStats, completionStats, trainingStats, topPerformers] =
    await Promise.all([
      getTotalPatientsStats(centerId, doctorId),
      getPatientImprovementStats(centerId, doctorId, causes),
      getUserActivityTrend(centerId, trendDays, doctorId),
      getVisionRecoveryStats(centerId, doctorId),
      getCompletionStats(centerId, doctorId),

      // Training KPI — all-time totals for the center.
      // No date filter: "TỔNG THỜI GIAN" means cumulative total, not a rolling window.
      // training_days = distinct calendar days that had at least one exercise result.
      sequelize
        .query(
          `SELECT
        COUNT(DISTINCT DATE(er."createdAt")) AS training_days,
        ROUND(CAST(SUM(er.duration) AS NUMERIC) / 3600.0, 1) AS total_hours,
        COUNT(DISTINCT er.id) AS total_exercises
       FROM "ExerciseResults" er
       ${doctorId ? 'INNER JOIN "Patients" p ON er."patientId" = p.id' : ''}
       WHERE er."centerId" = :centerId
         AND er.deleted = false
         ${doctorId ? `AND p."doctorId" = :doctorId` : ''}
         AND er."status" = 'completed'`,
          {
            replacements: { centerId, ...(doctorId && { doctorId }) },
            type: sequelize.QueryTypes.SELECT,
          }
        )
        .then((r) => r[0]),

      // #7 BẢNG XẾP HẠNG — Hoàn thành → Tập trung → Cải thiện (+ Phục hồi hiển thị).
      getLeaderboard(centerId, doctorId),
    ]);

  return {
    kpi: {
      // Tab 1 — #1–#5
      totalPatients: patientsStats.totalPatients,
      activePatients: patientsStats.activePatients,
      improvementRate: improvementStats.improvementRate,
      improvedCount: improvementStats.improvedCount,
      avgImprovementLevel: improvementStats.avgImprovementLevel,
      minAge: improvementStats.ageStats.minAge,
      maxAge: improvementStats.ageStats.maxAge,
      avgAge: improvementStats.ageStats.avgAge,
      // Legacy / other tabs
      trainingDays: parseInt(trainingStats?.training_days || 0, 10),
      totalTrainingHours: parseFloat(trainingStats?.total_hours || 0),
      totalExercises: parseInt(trainingStats?.total_exercises || 0, 10),
      avgRecoveryPct: recoveryStats.avgRecoveryPct,
      completionRate: completionStats.completionRate,
    },
    totalPatients: patientsStats.totalPatients,
    activePatients: patientsStats.activePatients,
    completedPatients: patientsStats.completedPatients,
    improvement: improvementStats,
    recovery: recoveryStats,
    completion: completionStats,
    // ĐỘ TUỔI — chỉ trên nhóm cải thiện (#5), lấy từ improvementStats
    ageStats: improvementStats.ageStats,
    // #12-15 — % cải thiện theo loại thị lực
    improvementByType: improvementStats.improvementByType,
    activityTrend,
    // #7 BẢNG XẾP HẠNG — đã shape sẵn trong getLeaderboard
    topPerformers,
  };
};

module.exports = {
  getTotalPatientsStats,
  getPatientImprovementStats,
  getVisionRecoveryStats,
  getCompletionStats,
  getInactivePatients,
  getUserActivityTrend,
  getLeaderboard,
  getPatientStatistics,
};
