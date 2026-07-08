const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { Patient, User } = require('../../models');
const { patientImproved } = require('./visionImprovement');

/**
 * Dashboard Patient Correlation Service
 *
 * ExerciseResult.status (post-D1) is a STRING enum: 'incomplete' | 'completed'.
 * Pass/fail was removed — all "done" queries use status = 'completed'.
 */

/**
 * Calculate Pearson correlation coefficient between two arrays
 * @param {number[]} x - First variable array
 * @param {number[]} y - Second variable array
 * @returns {number} Correlation coefficient (-1 to 1)
 */
const calculateCorrelation = (x, y) => {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  // Filter out null/undefined pairs
  const pairs = x.map((xi, i) => [xi, y[i]]).filter(([xi, yi]) => xi != null && yi != null);
  const validN = pairs.length;

  if (validN < 2) return 0; // Need at least 2 points

  const validX = pairs.map((p) => p[0]);
  const validY = pairs.map((p) => p[1]);

  const meanX = validX.reduce((a, b) => a + b, 0) / validN;
  const meanY = validY.reduce((a, b) => a + b, 0) / validN;

  const numerator = validX.reduce((sum, xi, i) => sum + (xi - meanX) * (validY[i] - meanY), 0);
  const denomX = Math.sqrt(validX.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
  const denomY = Math.sqrt(validY.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));

  return denomX * denomY === 0 ? 0 : numerator / (denomX * denomY);
};

/**
 * Get patient training time and vision level correlation data
 * @param {number} centerId - Center ID for multi-tenant filtering
 * @param {string} visionType - Vision type: 'far', 'near', 'contrast', 'stereopsis'
 * @param {number} days - Number of days to look back (7, 30, 90, 365)
 * @param {number} doctorId - Optional doctor filter
 * @returns {Promise<{data: Array, statistics: Object}>}
 */
const getPatientCorrelation = async (centerId, visionType, days, doctorId = null) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  // Format dates for PostgreSQL
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Generate date series and aggregate training + vision data
  const query = `
    WITH RECURSIVE date_series AS (
      SELECT DATE(:startDate) AS date
      UNION ALL
      SELECT DATE(date + INTERVAL '1 day')
      FROM date_series
      WHERE date < DATE(:endDate)
    ),
    training_by_date AS (
      SELECT 
        DATE(er."createdAt") AS date,
        ROUND(CAST(SUM(er.duration) AS NUMERIC) / 3600.0, 2) AS training_hours
      FROM "ExerciseResults" er
      ${
        doctorId
          ? 'INNER JOIN "ExerciseAssignments" ea ON er."exerciseAssignmentId" = ea.id INNER JOIN "Patients" p ON ea."patientId" = p.id'
          : ''
      }
      WHERE er."centerId" = :centerId
        ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
        AND er."createdAt" BETWEEN :startDate AND :endDate
        AND er."status" = 'completed'
      GROUP BY DATE(er."createdAt")
    ),
    vision_by_date AS (
      SELECT 
        DATE(ex."completedAt") AS date,
        -- Level columns are SMALLINT (P3). Treat 0 as "không đo". Avg các mắt có giá trị, rồi avg theo ngày.
        ROUND(
          AVG(
            (
              COALESCE(NULLIF(ex."leftEyeLevel", 0), 0) +
              COALESCE(NULLIF(ex."rightEyeLevel", 0), 0) +
              COALESCE(NULLIF(ex."bothEyeLevel", 0), 0)
            )::NUMERIC / NULLIF(
              (CASE WHEN NULLIF(ex."leftEyeLevel", 0) IS NOT NULL THEN 1 ELSE 0 END +
               CASE WHEN NULLIF(ex."rightEyeLevel", 0) IS NOT NULL THEN 1 ELSE 0 END +
               CASE WHEN NULLIF(ex."bothEyeLevel", 0) IS NOT NULL THEN 1 ELSE 0 END), 0
            )
          )::NUMERIC, 1
        ) AS avg_vision_level
      FROM "ExamResults" ex
      ${doctorId ? 'INNER JOIN "Patients" p ON ex."patientId" = p.id' : ''}
      WHERE ex."centerId" = :centerId
        ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
        AND ex."examType" = :visionType
        AND ex."completedAt" BETWEEN :startDate AND :endDate
        AND ex."status" = 'completed'
      GROUP BY DATE(ex."completedAt")
    ),
    vision_forward_fill AS (
      SELECT 
        ds.date,
        COALESCE(
          vbd.avg_vision_level, 
          (SELECT vbd2.avg_vision_level 
           FROM vision_by_date vbd2 
           WHERE vbd2.date <= ds.date AND vbd2.avg_vision_level IS NOT NULL
           ORDER BY vbd2.date DESC
           LIMIT 1)
        ) AS vision_level
      FROM date_series ds
      LEFT JOIN vision_by_date vbd ON ds.date = vbd.date
    )
    SELECT 
      TO_CHAR(ds.date, 'YYYY-MM-DD') AS date,
      COALESCE(tbd.training_hours, 0) AS "trainingTime",
      vff.vision_level AS "visionLevel"
    FROM date_series ds
    LEFT JOIN training_by_date tbd ON ds.date = tbd.date
    LEFT JOIN vision_forward_fill vff ON ds.date = vff.date
    ORDER BY ds.date;
  `;

  const data = await sequelize.query(query, {
    replacements: { centerId, visionType, startDate: startDateStr, endDate: endDateStr, ...(doctorId && { doctorId }) },
    type: sequelize.QueryTypes.SELECT,
  });

  // Calculate statistics
  const totalTrainingHours = data.reduce((sum, d) => sum + parseFloat(d.trainingTime || 0), 0);
  const daysWithTraining = data.filter((d) => d.trainingTime > 0).length;
  const avgDailyTrainingTime = daysWithTraining > 0 ? totalTrainingHours / daysWithTraining : 0;

  const validVisionLevels = data.filter((d) => d.visionLevel !== null).map((d) => parseFloat(d.visionLevel));
  const avgVisionLevel =
    validVisionLevels.length > 0 ? validVisionLevels.reduce((sum, v) => sum + v, 0) / validVisionLevels.length : 0;

  const visionImprovement =
    validVisionLevels.length > 1 ? validVisionLevels[validVisionLevels.length - 1] - validVisionLevels[0] : 0;

  // Calculate Pearson correlation
  const trainingValues = data.map((d) => parseFloat(d.trainingTime || 0));
  const visionValues = data.map((d) => (d.visionLevel !== null ? parseFloat(d.visionLevel) : null));
  const correlationScore = calculateCorrelation(trainingValues, visionValues);

  return {
    data: data.map((d) => ({
      date: d.date,
      trainingTime: parseFloat(d.trainingTime || 0),
      visionLevel: d.visionLevel !== null ? parseFloat(d.visionLevel) : null,
    })),
    statistics: {
      totalTrainingHours: parseFloat(totalTrainingHours.toFixed(2)),
      avgDailyTrainingTime: parseFloat(avgDailyTrainingTime.toFixed(2)),
      avgVisionLevel: parseFloat(avgVisionLevel.toFixed(1)),
      visionImprovement: parseFloat(visionImprovement.toFixed(1)),
      correlationScore: parseFloat(correlationScore.toFixed(2)),
    },
  };
};

/**
 * Get age-based correlation: improvement rate, avg completion rate, avg focus score per age group
 * Ages ≤ 18 are individual groups, ages > 18 are grouped as '>18'
 * @param {number} centerId
 * @param {number|null} doctorId
 */
const getAgeCorrelation = async (centerId, doctorId = null) => {
  const baseWhere = {
    centerId,
    deleted: false,
    activeFrom: { [Op.ne]: null },
  };
  if (doctorId) baseWhere.doctorId = doctorId;

  const patients = await Patient.findAll({
    where: baseWhere,
    attributes: ['id', 'examResults'],
    include: [{ model: User, as: 'user', attributes: ['dateOfBirth'] }],
  });

  const doctorFilter = doctorId
    ? `AND ea."patientId" IN (SELECT id FROM "Patients" WHERE "doctorId" = :doctorId AND "centerId" = :centerId AND deleted = false)`
    : '';

  const sessionStats = await sequelize.query(
    `SELECT
       es."patientId",
       AVG(
         LEAST(
           CASE
             WHEN COALESCE(ec.duration, 0) > 0 AND COALESCE(ec."executionCount", 0) > 0
               THEN es.duration::FLOAT / (ec."executionCount" * ec.duration * 60) * 100
             ELSE NULL
           END,
           100
         )
       ) AS avg_completion_rate,
       AVG(es."focusScore"::FLOAT) AS avg_focus_score
     FROM "ExerciseSessions" es
     INNER JOIN "ExerciseAssignments" ea ON es."exerciseAssignmentId" = ea.id
     INNER JOIN "ExerciseConfigs" ec ON ea."exerciseConfigId" = ec.id
     WHERE es."centerId" = :centerId
       AND es.status = 'completed'
       ${doctorFilter}
     GROUP BY es."patientId"`,
    {
      replacements: { centerId, ...(doctorId && { doctorId }) },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const statsMap = {};
  sessionStats.forEach((s) => {
    statsMap[s.patientId] = {
      avgCompletionRate: s.avg_completion_rate != null ? parseFloat(parseFloat(s.avg_completion_rate).toFixed(1)) : null,
      avgFocusScore: s.avg_focus_score != null ? parseFloat(parseFloat(s.avg_focus_score).toFixed(1)) : null,
    };
  });

  // Dùng module cải thiện dùng chung (per-type/per-eye đúng, an toàn kiểu số — D8/D10).
  const hasImprovement = (examResults) => patientImproved(examResults);

  const ageGroups = {};

  patients.forEach((patient) => {
    const dob = patient.user?.dateOfBirth;
    if (!dob) return;

    const ageMs = Date.now() - new Date(dob).getTime();
    const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
    const ageKey = age > 18 ? '>18' : String(age);
    const ageSort = age > 18 ? 999 : age;

    if (!ageGroups[ageKey]) {
      ageGroups[ageKey] = { ageGroup: ageKey, ageSort, total: 0, improved: 0, completionRates: [], focusScores: [] };
    }

    const improved = hasImprovement(patient.examResults);
    ageGroups[ageKey].total += 1;

    if (improved) {
      ageGroups[ageKey].improved += 1;
      const stats = statsMap[patient.id];
      if (stats?.avgCompletionRate != null) ageGroups[ageKey].completionRates.push(stats.avgCompletionRate);
      if (stats?.avgFocusScore != null) ageGroups[ageKey].focusScores.push(stats.avgFocusScore);
    }
  });

  const avg = (arr) => (arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null);

  const data = Object.values(ageGroups)
    .sort((a, b) => a.ageSort - b.ageSort)
    .map((g) => ({
      ageGroup: g.ageGroup,
      totalPatients: g.total,
      improvedPatients: g.improved,
      improvementRate: g.total > 0 ? parseFloat(((g.improved / g.total) * 100).toFixed(1)) : 0,
      avgCompletionRate: avg(g.completionRates),
      avgFocusScore: avg(g.focusScores),
    }));

  return { data };
};

module.exports = {
  getPatientCorrelation,
  getAgeCorrelation,
  calculateCorrelation, // exported for unit testing
};
