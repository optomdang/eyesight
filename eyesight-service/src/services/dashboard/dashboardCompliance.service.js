const { sequelize } = require('../../config/db');

/**
 * Get patient exercise compliance/adherence statistics
 * @param {Number} centerId - The center ID for multi-tenant filtering
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {Number} doctorId - Optional doctor filter
 * @returns {Promise<Object>} Compliance statistics
 */
const getPatientCompliance = async (centerId, startDate, endDate, doctorId = null) => {
  const doctorFilter = doctorId ? 'AND p."doctorId" = :doctorId' : '';
  const replacements = { centerId, startDate, endDate, ...(doctorId && { doctorId }) };

  // An assignment is "compliant" when >=75% of its in-window sessions are completed.
  // Both summary and top-performers are computed set-based in the DB; we no longer pull
  // every assignment into Node, no correlated subquery, and we don't build the (unused)
  // full details array — getComplianceDetails serves the paginated table separately.
  const [summaryRow, topPerformers] = await Promise.all([
    sequelize
      .query(
        `WITH per_assignment AS (
          SELECT ea.id,
            COUNT(es.id) AS total,
            COUNT(es.id) FILTER (WHERE es.status = 'completed') AS completed
          FROM "ExerciseAssignments" ea
          INNER JOIN "Patients" p ON ea."patientId" = p.id
          LEFT JOIN "ExerciseSessions" es ON ea.id = es."exerciseAssignmentId"
            AND es."createdAt" BETWEEN :startDate AND :endDate
          WHERE ea."centerId" = :centerId
            AND p."centerId" = :centerId
            ${doctorFilter}
            AND ea."createdAt" <= :endDate
          GROUP BY ea.id
        )
        SELECT
          COUNT(*)::int AS total_assignments,
          COUNT(*) FILTER (WHERE total > 0 AND completed::float / total >= 0.75)::int AS compliant_assignments,
          COALESCE(SUM(total), 0)::int AS total_sessions,
          COALESCE(SUM(completed), 0)::int AS completed_sessions
        FROM per_assignment`,
        { replacements, type: sequelize.QueryTypes.SELECT }
      )
      .then((r) => r[0]),

    sequelize.query(
      `SELECT
        p.code AS "patientCode",
        u.name AS "patientName",
        CASE WHEN COUNT(es.id) > 0
          THEN ROUND(COUNT(es.id) FILTER (WHERE es.status = 'completed')::numeric / COUNT(es.id) * 100, 2)
          ELSE 0 END AS "complianceRate",
        COUNT(es.id) FILTER (WHERE es.status = 'completed')::int AS "sessionsCompleted",
        COALESCE(ROUND(th.training_hours::numeric, 2), 0) AS "trainingHours",
        ROUND(AVG(es."focusScore")::numeric, 1) AS "focusScore"
      FROM "ExerciseAssignments" ea
      INNER JOIN "Patients" p ON ea."patientId" = p.id
      INNER JOIN "Users" u ON p."userId" = u.id
      LEFT JOIN "ExerciseSessions" es ON ea.id = es."exerciseAssignmentId"
        AND es."createdAt" BETWEEN :startDate AND :endDate
      LEFT JOIN LATERAL (
        SELECT SUM(er."duration") / 3600.0 AS training_hours
        FROM "ExerciseResults" er
        WHERE er."exerciseAssignmentId" = ea.id
          AND er."createdAt" BETWEEN :startDate AND :endDate
          AND er."duration" IS NOT NULL
      ) th ON true
      WHERE ea."centerId" = :centerId
        AND p."centerId" = :centerId
        ${doctorFilter}
        AND ea."createdAt" <= :endDate
      GROUP BY ea.id, p.code, u.name, th.training_hours
      ORDER BY "complianceRate" DESC, ea."createdAt" DESC
      LIMIT 10`,
      { replacements, type: sequelize.QueryTypes.SELECT }
    ),
  ]);

  const totalAssignments = summaryRow?.total_assignments || 0;
  const compliantAssignments = summaryRow?.compliant_assignments || 0;
  const totalScheduledSessions = summaryRow?.total_sessions || 0;
  const completedSessions = summaryRow?.completed_sessions || 0;

  const overallComplianceRate = totalAssignments > 0 ? (compliantAssignments / totalAssignments) * 100 : 0;
  const sessionCompletionRate = totalScheduledSessions > 0 ? (completedSessions / totalScheduledSessions) * 100 : 0;

  return {
    summary: {
      totalPatients: totalAssignments,
      compliantPatients: compliantAssignments,
      overallComplianceRate: Math.round(overallComplianceRate * 100) / 100,
      totalScheduledSessions,
      completedSessions,
      sessionCompletionRate: Math.round(sessionCompletionRate * 100) / 100,
    },
    topPerformers: topPerformers.map((p) => ({
      patientCode: p.patientCode,
      patientName: p.patientName,
      complianceRate: parseFloat(p.complianceRate || 0),
      sessionsCompleted: parseInt(p.sessionsCompleted || 0, 10),
      trainingHours: parseFloat(p.trainingHours || 0),
      focusScore: p.focusScore !== null && p.focusScore !== undefined ? parseFloat(p.focusScore) : null,
    })),
  };
};

/**
 * Get paginated compliance details for dashboard table
 * @param {Number} centerId - The center ID
 * @param {Number} page - Pagination page
 * @param {Number} limit - Results per page
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {Number} doctorId - Optional doctor filter
 * @returns {Promise<Object>} Paginated compliance data
 */
const getComplianceDetails = async (centerId, page = 1, limit = 10, startDate, endDate, doctorId = null) => {
  const offset = (page - 1) * limit;

  // Get assignment count using raw SQL
  const [countResult] = await sequelize.query(
    `SELECT COUNT(DISTINCT ea.id)::INTEGER as "count"
    FROM "ExerciseAssignments" ea
    INNER JOIN "Patients" p ON ea."patientId" = p.id
    WHERE ea."centerId" = :centerId
      AND p."centerId" = :centerId
      ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
      AND ea."createdAt" <= :endDate`,
    {
      replacements: { centerId, endDate, ...(doctorId && { doctorId }) },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const complianceCount = countResult?.count || 0;

  // Get paginated results using raw SQL
  const assignments = await sequelize.query(
    `SELECT
      ea.id,
      ea.status,
      ea."currentLevel" as "level",
      ea."createdAt",
      p.id as "patientId",
      p.code as "patientCode",
      u.name as "patientName",
      COUNT(es.id) as "totalSessions",
      SUM(CASE WHEN es.status = 'completed' THEN 1 ELSE 0 END) as "completedSessions",
      ROUND(AVG(es."averageScore")::numeric, 2) as "avgScore"
    FROM "ExerciseAssignments" ea
    INNER JOIN "Patients" p ON ea."patientId" = p.id
    INNER JOIN "Users" u ON p."userId" = u.id
    LEFT JOIN "ExerciseSessions" es ON ea.id = es."exerciseAssignmentId"
      AND es."createdAt" BETWEEN :startDate AND :endDate
    WHERE ea."centerId" = :centerId
      AND p."centerId" = :centerId
      ${doctorId ? 'AND p."doctorId" = :doctorId' : ''}
      AND ea."createdAt" <= :endDate
    GROUP BY ea.id, p.id, u.id
    ORDER BY ea."createdAt" DESC
    LIMIT :limit OFFSET :offset`,
    {
      replacements: { centerId, startDate, endDate, limit, offset, ...(doctorId && { doctorId }) },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const data = assignments.map((assignment) => {
    const totalSessions = parseInt(assignment.totalSessions || 0, 10);
    const completedSessions = parseInt(assignment.completedSessions || 0, 10);
    let complianceRate = 0;

    if (totalSessions > 0) {
      complianceRate = Math.round((completedSessions / totalSessions) * 100 * 100) / 100;
    }

    return {
      id: assignment.id,
      patientCode: assignment.patientCode,
      patientName: assignment.patientName,
      status: assignment.status,
      level: assignment.level,
      totalSessions,
      completedSessions,
      complianceRate,
      avgScore: parseFloat(assignment.avgScore || 0),
      createdAt: assignment.createdAt,
    };
  });

  return {
    total: complianceCount,
    page,
    limit,
    data,
  };
};

module.exports = {
  getPatientCompliance,
  getComplianceDetails,
};
