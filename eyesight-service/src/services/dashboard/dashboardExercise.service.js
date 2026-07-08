const { sequelize } = require('../../config/db');
const { ExerciseAssignment, ExerciseConfig, Exercise, ExerciseSession, ExerciseResult, Patient } = require('../../models');
const { buildInTreatmentWhereClause } = require('../../utils/treatmentUtils');
const { computeCenterExerciseStats } = require('./leaderboardMetrics');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * TAB 3 — HIỆU SUẤT BÀI TẬP (Exercise Performance).
 *
 * Cards / charts (theo BU spec DASHBOARD_REFACTOR_SPEC.md):
 *   #19 ĐANG SỬ DỤNG       = (Exercise distinct đã giao) / (tổng Exercise hệ thống) × 100
 *   #20 SỐ PHÁC ĐỒ TẬP     = count(ExerciseConfig)
 *   #21 % Hoàn thành       = % THỜI GIAN: Σ thực / Σ giao (chu kỳ frequency; ngày bỏ = giao nhưng 0 thực)
 *   #22 Tuân Thủ           = % SỐ LẦN: lượt completed / lượt giao kỳ vọng theo chu kỳ
 *   #23 BN Xuất Sắc        = count BN có Tuân thủ(#22) > 80%
 *   #24 Xu Hướng Hiệu Suất = ĐÃ XÓA
 *   #25 Phân Bổ Bài Tập    = phân bổ lượt tập theo exerciseType (bar ngang)
 *   #26 % Tuân thủ theo loại = mỗi exerciseType: lượt completed / lượt giao
 *
 * "Giao" lấy từ snapshot trên ExerciseSession (executionCount × executionDuration), ổn định lịch sử (D6).
 * duration trên ExerciseResult đã được clamp ≤ giao lúc WRITE (#21-clamp) nên không cần LEAST ở đây.
 * status chỉ còn 'incomplete' | 'completed' (pass/fail đã bỏ — D1).
 *
 * @param {Number} centerId - Center ID (multi-tenant)
 * @param {Date} startDate - Khoảng lọc (áp cho #21/#22/#23/#25/#26; #19/#20 là trạng thái danh mục hiện tại)
 * @param {Date} endDate
 * @param {Number} doctorId - Lọc theo bác sĩ (tùy chọn)
 * @returns {Promise<Object>}
 */
const getExerciseStats = async (centerId, startDate, endDate, doctorId = null) => {
  const replacements = { centerId, startDate, endDate, ...(doctorId && { doctorId }) };
  const assignmentDoctorJoin = doctorId ? 'INNER JOIN "Patients" p ON ea."patientId" = p.id' : '';
  const doctorFilter = doctorId ? 'AND p."doctorId" = :doctorId' : '';

  const patientWhere = {
    centerId,
    deleted: false,
    ...buildInTreatmentWhereClause(),
    ...(doctorId && { doctorId }),
  };

  const [[usage], distributionByType, complianceData] = await Promise.all([
    sequelize.query(
      `SELECT
        (SELECT COUNT(*) FROM "Exercises" e
           WHERE e."centerId" = :centerId AND e.deleted = false) AS "totalExercises",
        (SELECT COUNT(DISTINCT ec."exerciseId")
           FROM "ExerciseAssignments" ea
           INNER JOIN "ExerciseConfigs" ec ON ea."exerciseConfigId" = ec.id
           ${assignmentDoctorJoin}
           WHERE ea."centerId" = :centerId ${doctorFilter}) AS "inUseExercises",
        (SELECT COUNT(*) FROM "ExerciseConfigs" ec
           WHERE ec."centerId" = :centerId AND ec.deleted = false) AS "totalConfigs"`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    ),

    sequelize.query(
      `SELECT e."exerciseType" AS "exerciseType", COUNT(er.id) AS "count"
       FROM "ExerciseResults" er
       INNER JOIN "ExerciseAssignments" ea ON er."exerciseAssignmentId" = ea.id
       INNER JOIN "ExerciseConfigs" ec ON ea."exerciseConfigId" = ec.id
       INNER JOIN "Exercises" e ON ec."exerciseId" = e.id
       ${doctorId ? 'INNER JOIN "Patients" p ON er."patientId" = p.id' : ''}
       WHERE er."centerId" = :centerId ${doctorFilter}
         AND er."createdAt" BETWEEN :startDate AND :endDate
         AND er.status = 'completed'
       GROUP BY e."exerciseType"
       ORDER BY COUNT(er.id) DESC`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    ),

    (async () => {
      const inTreatmentPatients = await Patient.findAll({
        where: patientWhere,
        attributes: ['id'],
        raw: true,
      });
      const patientIds = inTreatmentPatients.map((p) => p.id);
      if (patientIds.length === 0) {
        return computeCenterExerciseStats({
          exerciseAssignments: [],
          exerciseSessions: [],
          exerciseResultsBySessionId: {},
          windowStart: startDate,
          windowEnd: endDate,
        });
      }

      const assignments = await ExerciseAssignment.findAll({
        where: { centerId, status: 'active', patientId: patientIds },
        attributes: ['id', 'patientId', 'assignedAt', 'exerciseConfigId'],
        include: [
          {
            model: ExerciseConfig,
            as: 'exerciseConfig',
            attributes: ['frequency', 'executionCount', 'duration'],
            include: [{ model: Exercise, as: 'exercise', attributes: ['exerciseType'] }],
          },
        ],
      });

      const assignmentRows = assignments.map((a) => ({
        id: a.id,
        patientId: a.patientId,
        assignedAt: a.assignedAt,
        frequency: a.exerciseConfig?.frequency,
        executionCount: a.exerciseConfig?.executionCount,
        executionDuration: a.exerciseConfig?.duration,
        exerciseType: a.exerciseConfig?.exercise?.exerciseType,
      }));

      const sessions = await ExerciseSession.findAll({
        where: { centerId, patientId: patientIds, deleted: false },
        attributes: ['id', 'patientId', 'exerciseAssignmentId', 'executionCount', 'executionDuration', 'startedAt'],
        raw: true,
      });

      const results = await ExerciseResult.findAll({
        where: { centerId, patientId: patientIds, deleted: false },
        attributes: ['id', 'exerciseSessionId', 'status', 'duration', 'createdAt'],
        order: [['createdAt', 'ASC']],
        raw: true,
      });

      const exerciseResultsBySessionId = {};
      results.forEach((r) => {
        if (!r.exerciseSessionId) return;
        if (!exerciseResultsBySessionId[r.exerciseSessionId]) {
          exerciseResultsBySessionId[r.exerciseSessionId] = [];
        }
        exerciseResultsBySessionId[r.exerciseSessionId].push(r);
      });

      return computeCenterExerciseStats({
        exerciseAssignments: assignmentRows,
        exerciseSessions: sessions,
        exerciseResultsBySessionId,
        windowStart: startDate,
        windowEnd: endDate,
      });
    })(),
  ]);

  const totalExercises = parseInt(usage.totalExercises || 0, 10);
  const inUseExercises = parseInt(usage.inUseExercises || 0, 10);
  const totalConfigs = parseInt(usage.totalConfigs || 0, 10);

  return {
    kpi: {
      inUseExercises,
      totalExercises,
      inUsePct: totalExercises > 0 ? round2((inUseExercises / totalExercises) * 100) : 0,
      totalConfigs,
      timeCompletionRate: complianceData.timeCompletionRate,
      countComplianceRate: complianceData.countComplianceRate,
      excellentPatientsCount: complianceData.excellentPatientsCount,
    },
    distributionByType: distributionByType.map((item) => ({
      exerciseType: item.exerciseType,
      count: parseInt(item.count || 0, 10),
    })),
    complianceByType: complianceData.complianceByType,
  };
};

/**
 * Get exercise details by patient for dashboard table
 * @param {Number} centerId - The center ID
 * @param {Number} page - Pagination page
 * @param {Number} limit - Results per page
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {Number} doctorId - Optional doctor filter
 * @returns {Promise<Object>} Paginated exercise results
 */
const getExerciseDetails = async (centerId, page = 1, limit = 10, startDate, endDate, doctorId = null) => {
  const offset = (page - 1) * limit;

  // Get total count
  const [countResult] = await sequelize.query(
    `SELECT COUNT(er.id)::INTEGER as "count"
     FROM "ExerciseResults" er
     ${
       doctorId
         ? 'INNER JOIN "ExerciseAssignments" ea ON er."exerciseAssignmentId" = ea.id INNER JOIN "Patients" p ON ea."patientId" = p.id'
         : ''
     }
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
       er.score,
       er.accuracy,
       er.duration,
       er."movesCount",
       er.status,
       er.level,
       e."exerciseType",
       er."createdAt",
       p.code as "patientCode",
       u.name as "patientName",
       e.name as "exerciseName",
       ec.name as "configName"
     FROM "ExerciseResults" er
     INNER JOIN "ExerciseAssignments" ea ON er."exerciseAssignmentId" = ea.id
     INNER JOIN "Patients" p ON ea."patientId" = p.id
     INNER JOIN "Users" u ON p."userId" = u.id
     INNER JOIN "ExerciseConfigs" ec ON ea."exerciseConfigId" = ec.id
     INNER JOIN "Exercises" e ON ec."exerciseId" = e.id
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
    data: rows.map((result) => ({
      id: result.id,
      patientCode: result.patientCode,
      patientName: result.patientName,
      exerciseName: result.exerciseName,
      configName: result.configName,
      score: result.score,
      accuracy: result.accuracy,
      duration: result.duration,
      movesCount: result.movesCount,
      status: result.status,
      level: result.level,
      exerciseType: result.exerciseType,
      createdAt: result.createdAt,
    })),
  };
};

module.exports = {
  getExerciseStats,
  getExerciseDetails,
};
