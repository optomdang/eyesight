const { sequelize } = require('../../config/db');
const { ExamAssignment, ExamSession, Patient } = require('../../models');
const { buildInTreatmentWhereClause } = require('../../utils/treatmentUtils');
const { computeCenterExamComplianceRate } = require('./leaderboardMetrics');

// ---------------------------------------------------------------------------
// Private query helpers — each returns a Promise resolving to raw query rows.
// Only fixed strings are interpolated into SQL (never user input) so these
// template literals do NOT introduce SQL injection risk.
// ---------------------------------------------------------------------------

const _queryExamKPI = (replacements, doctorJoin, doctorFilter) =>
  sequelize
    .query(
      `SELECT
        COUNT(er.id) as "totalExams",
        COUNT(DISTINCT er."patientId")::INTEGER as "uniquePatients",
        SUM(CASE WHEN er.status = 'completed' THEN 1 ELSE 0 END) as "completedCount",
        SUM(CASE WHEN er.status = 'incomplete' THEN 1 ELSE 0 END) as "pendingCount",
        ROUND(AVG(CASE WHEN er.status = 'completed'
          THEN (
            (CASE WHEN "rawData"->'leftEye'->>'spherical' ~ '^-?[0-9]+([.][0-9]+)?$'
                  THEN ("rawData"->'leftEye'->>'spherical')::FLOAT END) +
            (CASE WHEN "rawData"->'rightEye'->>'spherical' ~ '^-?[0-9]+([.][0-9]+)?$'
                  THEN ("rawData"->'rightEye'->>'spherical')::FLOAT END)
          ) / 2
          ELSE NULL END)::NUMERIC, 2) as "avgSpherical",
        ROUND(AVG(CASE WHEN er.status = 'completed'
          THEN (
            (CASE WHEN "rawData"->'leftEye'->>'cylinder' ~ '^-?[0-9]+([.][0-9]+)?$'
                  THEN ("rawData"->'leftEye'->>'cylinder')::FLOAT END) +
            (CASE WHEN "rawData"->'rightEye'->>'cylinder' ~ '^-?[0-9]+([.][0-9]+)?$'
                  THEN ("rawData"->'rightEye'->>'cylinder')::FLOAT END)
          ) / 2
          ELSE NULL END)::NUMERIC, 2) as "avgCylinder"
      FROM "ExamResults" er
      ${doctorJoin}
      WHERE er."centerId" = :centerId
        ${doctorFilter}
        AND er."createdAt" BETWEEN :startDate AND :endDate`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    )
    .then(([row]) => row);

const _queryVisionImprovement = (centerId, doctorId) =>
  sequelize
    .query(
      `WITH vision_types AS (
        SELECT unnest(ARRAY['far','near','contrast','stereopsis']) AS vtype
      ),
      patient_improvements AS (
        SELECT
          p.id,
          vt.vtype,
          (
            NULLIF(
              COALESCE((p."examResults"->vt.vtype->'currentResult'->>'leftEye')::FLOAT, 0) +
              COALESCE((p."examResults"->vt.vtype->'currentResult'->>'rightEye')::FLOAT, 0) +
              COALESCE((p."examResults"->vt.vtype->'currentResult'->>'bothEye')::FLOAT, 0),
              0
            ) /
            NULLIF(
              (CASE WHEN (p."examResults"->vt.vtype->'currentResult'->>'leftEye')::FLOAT > 0 THEN 1 ELSE 0 END) +
              (CASE WHEN (p."examResults"->vt.vtype->'currentResult'->>'rightEye')::FLOAT > 0 THEN 1 ELSE 0 END) +
              (CASE WHEN (p."examResults"->vt.vtype->'currentResult'->>'bothEye')::FLOAT > 0 THEN 1 ELSE 0 END),
              0
            )
          ) AS current_avg,
          (
            NULLIF(
              COALESCE((p."examResults"->vt.vtype->'initialResult'->>'leftEye')::FLOAT, 0) +
              COALESCE((p."examResults"->vt.vtype->'initialResult'->>'rightEye')::FLOAT, 0) +
              COALESCE((p."examResults"->vt.vtype->'initialResult'->>'bothEye')::FLOAT, 0),
              0
            ) /
            NULLIF(
              (CASE WHEN (p."examResults"->vt.vtype->'initialResult'->>'leftEye')::FLOAT > 0 THEN 1 ELSE 0 END) +
              (CASE WHEN (p."examResults"->vt.vtype->'initialResult'->>'rightEye')::FLOAT > 0 THEN 1 ELSE 0 END) +
              (CASE WHEN (p."examResults"->vt.vtype->'initialResult'->>'bothEye')::FLOAT > 0 THEN 1 ELSE 0 END),
              0
            )
          ) AS initial_avg
        FROM "Patients" p
        CROSS JOIN vision_types vt
        WHERE p."centerId" = :centerId
          ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
          AND p."examResults" IS NOT NULL
          AND p."treatmentStatus" = 'active'
          AND p.deleted = false
      )
      SELECT
        COALESCE(AVG(current_avg - initial_avg) FILTER (WHERE current_avg > 0 AND initial_avg > 0), 0) as "avgVisionImprovement"
      FROM patient_improvements`,
      {
        replacements: { centerId, ...(doctorId && { doctorId }) },
        type: sequelize.QueryTypes.SELECT,
      }
    )
    .then(([row]) => parseFloat(row?.avgVisionImprovement || 0));

// #11 — TỈ LỆ TUÂN THỦ (test): phiên hoàn thành / phiên kỳ vọng theo chu kỳ ExamAssignment.
const _loadTestCompliance = async (centerId, startDate, endDate, doctorId) => {
  const patientWhere = {
    centerId,
    deleted: false,
    ...buildInTreatmentWhereClause(),
    ...(doctorId && { doctorId }),
  };

  const patients = await Patient.findAll({ where: patientWhere, attributes: ['id'], raw: true });
  const patientIds = patients.map((p) => p.id);

  if (patientIds.length === 0) {
    return { testComplianceRate: 0, totalSessions: 0, completedSessions: 0 };
  }

  const examAssignments = await ExamAssignment.findAll({
    where: { centerId, patientId: patientIds, isEnabled: true },
    attributes: ['id', 'patientId', 'examType', 'frequency', 'createdAt'],
    raw: true,
  });

  const examSessions = await ExamSession.findAll({
    where: { centerId, patientId: patientIds, deleted: false },
    attributes: ['id', 'patientId', 'examType', 'scheduledDate', 'status'],
    raw: true,
  });

  return computeCenterExamComplianceRate({
    examAssignments,
    examSessions,
    windowStart: startDate,
    windowEnd: endDate,
  });
};

// #17 — Xu Hướng Hoàn Thành theo bucket (Tuần/Tháng/Quý/Năm). "hoàn thành" = exam full (status='completed').
// `bucketUnit` đã được whitelist ở getExamStats nên an toàn để nội suy vào date_trunc.
const _queryExamTrend = (replacements, doctorJoin, doctorFilter, bucketUnit) =>
  sequelize.query(
    `SELECT
      date_trunc('${bucketUnit}', er."createdAt") as "bucket",
      COUNT(er.id) as "count",
      SUM(CASE WHEN er.status = 'completed' THEN 1 ELSE 0 END) as "completedCount"
    FROM "ExamResults" er
    ${doctorJoin}
    WHERE er."centerId" = :centerId
      ${doctorFilter}
      AND er."createdAt" BETWEEN :startDate AND :endDate
    GROUP BY date_trunc('${bucketUnit}', er."createdAt")
    ORDER BY date_trunc('${bucketUnit}', er."createdAt") ASC`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );

const _queryExamTypeBreakdown = (replacements, doctorJoin, doctorFilter) =>
  sequelize.query(
    `SELECT
      er."examType" as "type",
      COUNT(er.id) as "count",
      SUM(CASE WHEN er.status = 'completed' THEN 1 ELSE 0 END) as "completedCount"
    FROM "ExamResults" er
    ${doctorJoin}
    WHERE er."centerId" = :centerId
      ${doctorFilter}
      AND er."createdAt" BETWEEN :startDate AND :endDate
    GROUP BY er."examType"
    ORDER BY COUNT(er.id) DESC`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );

// ---------------------------------------------------------------------------
// Formatters — convert raw DB rows to API response shapes
// ---------------------------------------------------------------------------

const _formatTrend = (rows) =>
  rows.map((item) => {
    const total = parseInt(item.count, 10);
    const completed = parseInt(item.completedCount || 0, 10);
    return {
      // bucket start (ISO date). Granularity is carried by the response's `trendPeriod`.
      date: item.bucket,
      totalExams: total,
      completedExams: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0,
    };
  });

// #16 — stack Hoàn thành / Chưa xong theo từng examType.
const _formatBreakdown = (rows) =>
  rows.map((item) => {
    const total = parseInt(item.count, 10);
    const completed = parseInt(item.completedCount || 0, 10);
    return {
      type: item.type,
      total,
      completed,
      notCompleted: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0,
    };
  });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// #17 selector → đơn vị date_trunc của PostgreSQL. Whitelist để chống injection.
const TREND_PERIODS = { week: 'week', month: 'month', quarter: 'quarter', year: 'year', day: 'day' };
const resolveBucketUnit = (period) => TREND_PERIODS[period] || 'day';

/**
 * Get exam statistics for dashboard (center-level aggregation) — TAB 2.
 *   #11 testComplianceRate (session-level), #16 breakdown theo examType, #17 trend theo bucket.
 * All sub-queries run in parallel via Promise.all.
 *
 * @param {Number} centerId
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Number|null} doctorId
 * @param {string} period - #17 selector: 'week' | 'month' | 'quarter' | 'year' | 'day' (mặc định 'day')
 */
const getExamStats = async (centerId, startDate, endDate, doctorId = null, period = 'day') => {
  const replacements = { centerId, startDate, endDate, ...(doctorId && { doctorId }) };
  const doctorJoin = doctorId ? 'INNER JOIN "Patients" p ON er."patientId" = p.id' : '';
  const doctorFilter = doctorId ? 'AND p."doctorId" = :doctorId' : '';
  const bucketUnit = resolveBucketUnit(period);

  const [kpiData, testCompliance, avgVisionImprovement, trendRows, breakdownRows] = await Promise.all([
    _queryExamKPI(replacements, doctorJoin, doctorFilter),
    _loadTestCompliance(centerId, startDate, endDate, doctorId),
    _queryVisionImprovement(centerId, doctorId),
    _queryExamTrend(replacements, doctorJoin, doctorFilter, bucketUnit),
    _queryExamTypeBreakdown(replacements, doctorJoin, doctorFilter),
  ]);

  const totalExams = parseInt(kpiData.totalExams || 0, 10);
  const completedCount = parseInt(kpiData.completedCount || 0, 10);
  const pendingCount = parseInt(kpiData.pendingCount || 0, 10);
  const uniquePatients = kpiData.uniquePatients || 1;

  // #11 — tuân thủ theo chu kỳ giao (kể cả ngày không có session).
  const totalSessions = parseInt(testCompliance?.totalSessions || 0, 10);
  const completedSessions = parseInt(testCompliance?.completedSessions || 0, 10);
  const testComplianceRate = testCompliance?.testComplianceRate ?? 0;

  return {
    kpi: {
      totalSessions,
      completedSessions,
      testComplianceRate,
      // Thống kê mô tả ở mức exam-result (giữ nguyên)
      totalExams,
      completedExams: completedCount,
      pendingExams: pendingCount,
      completionRate: totalExams > 0 ? Math.round((completedCount / totalExams) * 100 * 100) / 100 : 0,
      visionImprovement: Math.round(avgVisionImprovement * 10) / 10,
      avgTestsPerPatient: totalExams > 0 ? Math.round((totalExams / uniquePatients) * 10) / 10 : 0,
      avgSpherical: parseFloat(kpiData.avgSpherical || 0),
      avgCylinder: parseFloat(kpiData.avgCylinder || 0),
    },
    trendPeriod: bucketUnit, // #17 granularity (echo back the resolved selector)
    trend: _formatTrend(trendRows),
    breakdown: _formatBreakdown(breakdownRows),
  };
};

/**
 * Get exam details for dashboard table
 * @param {Number} centerId - The center ID
 * @param {Number} page - Pagination page
 * @param {Number} limit - Results per page
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {Number} doctorId - Optional doctor filter
 * @returns {Promise<Object>} Paginated exam results
 */
const getExamDetails = async (centerId, page = 1, limit = 10, startDate, endDate, doctorId = null) => {
  const offset = (page - 1) * limit;

  // Get total count
  const [countResult] = await sequelize.query(
    `SELECT COUNT(er.id)::INTEGER as "count"
     FROM "ExamResults" er
     ${doctorId ? 'INNER JOIN "Patients" p ON er."patientId" = p.id' : ''}
     WHERE er."centerId" = :centerId
       ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
       AND er."createdAt" BETWEEN :startDate AND :endDate`,
    {
      replacements: { centerId, startDate, endDate, ...(doctorId && { doctorId }) },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const count = countResult?.count || 0;

  // Get paginated results
  const rows = await sequelize.query(
    `SELECT 
       er.id,
       er."examType",
       er.status,
       er."rawData" as result,
       er."createdAt",
       er."startedAt",
       er."completedAt",
       p.code as "patientCode",
       u.name as "patientName"
     FROM "ExamResults" er
     INNER JOIN "Patients" p ON er."patientId" = p.id
     INNER JOIN "Users" u ON p."userId" = u.id
     WHERE er."centerId" = :centerId
       ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
       AND er."createdAt" BETWEEN :startDate AND :endDate
     ORDER BY er."createdAt" DESC
     LIMIT :limit OFFSET :offset`,
    {
      replacements: { centerId, startDate, endDate, limit, offset, ...(doctorId && { doctorId }) },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return {
    total: count,
    page,
    limit,
    data: rows.map((exam) => {
      let resultSummary = {};
      if (exam.result && typeof exam.result === 'object') {
        try {
          const result = typeof exam.result === 'string' ? JSON.parse(exam.result) : exam.result;
          resultSummary = {
            leftEyeSpherical: result.leftEye?.spherical,
            leftEyeCylinder: result.leftEye?.cylinder,
            rightEyeSpherical: result.rightEye?.spherical,
            rightEyeCylinder: result.rightEye?.cylinder,
          };
        } catch (e) {
          // If JSON parsing fails, result will be empty object
        }
      }

      return {
        id: exam.id,
        patientCode: exam.patientCode,
        patientName: exam.patientName,
        examType: exam.examType,
        status: exam.status,
        result: resultSummary,
        createdAt: exam.createdAt,
        startedAt: exam.startedAt,
        completedAt: exam.completedAt,
      };
    }),
  };
};

module.exports = {
  getExamStats,
  getExamDetails,
};
