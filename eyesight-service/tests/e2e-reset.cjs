/**
 * E2E test data reset script.
 * Resets exam and exercise state for patient@lotusvision.vn
 * so portal E2E tests always start from a predictable baseline.
 */

const { Client } = require('pg');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

const client = new Client({
  host: requireEnv('DB_HOST'),
  port: parseInt(requireEnv('DB_PORT'), 10),
  database: requireEnv('DB_NAME'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const TEST_PATIENT_EMAIL = process.env.E2E_PATIENT_EMAIL || 'patient@lotusvision.vn';

const buildSessionCode = (examType) => {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ES-${examType.toUpperCase()}-${ts}-${rand}`;
};

const buildExerciseSessionCode = (assignmentId) => {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `XS-${assignmentId}-${ts}-${rand}`;
};

async function reset() {
  await client.connect();
  try {
    const patientRes = await client.query(
      `SELECT p.id, p."centerId"
       FROM "Patients" p
       JOIN "Users" u ON u.id = p."userId"
       WHERE u.email = $1
         AND p.deleted = false
       LIMIT 1`,
      [TEST_PATIENT_EMAIL]
    );

    if (!patientRes.rows[0]) {
      throw new Error(`Patient not found for email: ${TEST_PATIENT_EMAIL}`);
    }

    const { id: patientId, centerId } = patientRes.rows[0];

    // Clean stale in-progress/completed results so UI starts from a predictable state.
    const resetResults = await client.query(
      `UPDATE "ExamResults"
       SET deleted = true,
           "updatedAt" = NOW()
       WHERE "patientId" = $1
         AND deleted = false
       RETURNING id`,
      [patientId]
    );

    const assignmentRes = await client.query(
      `SELECT "examType"
       FROM "ExamAssignments"
       WHERE "patientId" = $1
         AND "isEnabled" = true`,
      [patientId]
    );

    const examTypes = assignmentRes.rows.length > 0 ? [...new Set(assignmentRes.rows.map((row) => row.examType))] : ['far'];

    const today = new Date().toISOString().slice(0, 10);
    const upsertResults = await Promise.all(
      examTypes.map(async (examType) => {
        const existing = await client.query(
          `SELECT id
           FROM "ExamSessions"
           WHERE "patientId" = $1
             AND "examType" = $2
             AND deleted = false
           ORDER BY "createdAt" DESC
           LIMIT 1`,
          [patientId, examType]
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE "ExamSessions"
             SET "scheduledDate" = $2,
                 status = 'incomplete',
                 "startedAt" = NULL,
                 "endedAt" = NULL,
                 "completedAt" = NULL,
                 deleted = false,
                 "updatedAt" = NOW()
             WHERE id = $1`,
            [existing.rows[0].id, today]
          );
          return { updated: 1, inserted: 0 };
        }

        await client.query(
          `INSERT INTO "ExamSessions"
            (code, "patientId", "examType", "scheduledDate", status, "centerId", "createdBy", "updatedBy", deleted, "createdAt", "updatedAt")
           VALUES
            ($1, $2, $3, $4, 'incomplete', $5, 1, 1, false, NOW(), NOW())`,
          [buildSessionCode(examType), patientId, examType, today, centerId]
        );

        return { updated: 0, inserted: 1 };
      })
    );

    const updatedSessions = upsertResults.reduce((sum, item) => sum + item.updated, 0);
    const insertedSessions = upsertResults.reduce((sum, item) => sum + item.inserted, 0);

    const resetExerciseResults = await client.query(
      `UPDATE "ExerciseResults"
       SET deleted = true,
           "deletedAt" = NOW(),
           "updatedAt" = NOW()
       WHERE "patientId" = $1
         AND deleted = false
       RETURNING id`,
      [patientId]
    );

    const exerciseAssignmentRes = await client.query(
      `SELECT id
       FROM "ExerciseAssignments"
       WHERE "patientId" = $1
         AND status = 'active'
       ORDER BY id ASC`,
      [patientId]
    );

    const exerciseResetResults = await Promise.all(
      exerciseAssignmentRes.rows.map(async ({ id: assignmentId }) => {
        const latestSession = await client.query(
          `SELECT id
           FROM "ExerciseSessions"
           WHERE "exerciseAssignmentId" = $1
           ORDER BY "createdAt" DESC
           LIMIT 1`,
          [assignmentId]
        );

        if (latestSession.rows.length > 0) {
          await client.query(
            `UPDATE "ExerciseSessions"
             SET status = 'incomplete',
                 "startedAt" = NOW(),
                 "endedAt" = NULL,
                 "completedAt" = NULL,
                 duration = NULL,
                 "executionsCompleted" = 0,
                 "validExecutions" = 0,
                 "totalScore" = 0,
                 "averageScore" = 0,
                 "bestScore" = 0,
                 "validityPercentage" = 0,
                 "updatedAt" = NOW()
             WHERE id = $1`,
            [latestSession.rows[0].id]
          );

          return { updated: 1, inserted: 0 };
        }

        await client.query(
          `INSERT INTO "ExerciseSessions"
            (code, "exerciseAssignmentId", "patientId", status, "startedAt", "centerId", "createdBy", "updatedBy", "createdAt", "updatedAt")
           VALUES
            ($1, $2, $3, 'incomplete', NOW(), $4, 1, 1, NOW(), NOW())`,
          [buildExerciseSessionCode(assignmentId), assignmentId, patientId, centerId]
        );

        return { updated: 0, inserted: 1 };
      })
    );

    const updatedExerciseSessions = exerciseResetResults.reduce((sum, item) => sum + item.updated, 0);
    const insertedExerciseSessions = exerciseResetResults.reduce((sum, item) => sum + item.inserted, 0);

    console.log(
      `[e2e-reset] patient=${patientId} email=${TEST_PATIENT_EMAIL} examSoftDeleted=${
        resetResults.rowCount
      } examUpdated=${updatedSessions} examInserted=${insertedSessions} exerciseSoftDeleted=${
        resetExerciseResults.rowCount
      } exerciseUpdated=${updatedExerciseSessions} exerciseInserted=${insertedExerciseSessions} examTypes=${examTypes.join(
        ','
      )}`
    );
  } finally {
    await client.end();
  }
}

reset().catch((e) => {
  console.error('[e2e-reset] Error:', e.message);
  process.exit(1);
});
