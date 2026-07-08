/**
 * Reset exam sessions for E2E tests.
 * Run via: DATABASE_URL=... node tests/e2e/reset-exam-sessions.js
 */

const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('Missing DATABASE_URL. Example: DATABASE_URL=postgres://user:pass@host:5432/db node tests/e2e/reset-exam-sessions.js');
  process.exit(1);
}

async function resetExamSessions() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    const patientRes = await client.query(
      `SELECT p.id FROM "Patients" p 
       JOIN "Users" u ON p."userId" = u.id 
       WHERE u.email = 'patient@lotusvision.vn' LIMIT 1`
    );
    const patientId = patientRes.rows[0]?.id;
    if (!patientId) throw new Error('Patient not found');

    const resetResults = await client.query(
      `UPDATE "ExamResults" er
       SET status = 'incomplete', "completedAt" = NULL, "updatedAt" = NOW()
       FROM "ExamSessions" es
       WHERE er."examSessionId" = es.id
         AND es."patientId" = $1
         AND es."scheduledDate" >= NOW() - INTERVAL '60 days'
         AND er.deleted = false
         AND er.status = 'completed'
       RETURNING er.id`,
      [patientId]
    );

    const resetSessions = await client.query(
      `UPDATE "ExamSessions"
       SET status = 'incomplete', "completedAt" = NULL, "updatedAt" = NOW()
       WHERE "patientId" = $1
         AND "scheduledDate" >= NOW() - INTERVAL '60 days'
         AND deleted = false
         AND status = 'completed'
       RETURNING id, "examType"`,
      [patientId]
    );

    console.log(`Reset ${resetResults.rowCount} exam results`);
    console.log(`Reset ${resetSessions.rowCount} exam sessions:`, resetSessions.rows);
  } finally {
    await client.end();
  }
}

resetExamSessions().catch(console.error);
