/**
 * Reset exam sessions for E2E tests.
 * Resets completed exam sessions/results back to incomplete
 * for patient@nhuocthi.vn so tests always have sessions available.
 *
 * Run via: DB_HOST=... DB_PORT=... DB_NAME=... DB_USER=... DB_PASSWORD=... node tests/e2e/reset-exam-sessions.cjs
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

async function reset() {
  await client.connect();
  try {
    const r1 = await client.query(`
      UPDATE "ExamResults" er
      SET status = 'incomplete', "completedAt" = NULL, "updatedAt" = NOW()
      FROM "ExamSessions" es
      WHERE er."examSessionId" = es.id
        AND es."patientId" = 1
        AND es."scheduledDate" >= NOW() - INTERVAL '60 days'
        AND er.deleted = false
        AND er.status = 'completed'
      RETURNING er.id
    `);
    const r2 = await client.query(`
      UPDATE "ExamSessions"
      SET status = 'incomplete', "completedAt" = NULL, "updatedAt" = NOW()
      WHERE "patientId" = 1
        AND "scheduledDate" >= NOW() - INTERVAL '60 days'
        AND deleted = false
        AND status = 'completed'
      RETURNING id, "examType"
    `);
    console.log(`[reset] ExamResults: ${r1.rowCount}, ExamSessions: ${r2.rowCount}`, r2.rows);
  } finally {
    await client.end();
  }
}

reset().catch((e) => { console.error('[reset] Error:', e.message); process.exit(1); });
