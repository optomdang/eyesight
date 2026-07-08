/**
 * Helper script for E2E tests: set patient near vision level in DB.
 * Usage: node tests/set-near-level.cjs <rightEye> <leftEye> [bothEye]
 * Example: node tests/set-near-level.cjs 2 2 2  → N32 (all eyes)
 *          node tests/set-near-level.cjs 8 8 8  → N3 (restore)
 * Note: sets all three fields (rightEye, leftEye, bothEye) to avoid the max-level
 * logic in getAutoStartLevel() from being skewed by a stale bothEye value.
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

const [, , rightArg, leftArg, bothArg] = process.argv;
const rightEye = parseInt(rightArg || '2', 10);
const leftEye = parseInt(leftArg || '2', 10);
const bothEye = parseInt(bothArg || rightArg || '2', 10);

const client = new Client({
  host: requireEnv('DB_HOST'),
  port: parseInt(requireEnv('DB_PORT'), 10),
  database: requireEnv('DB_NAME'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  ssl: process.env.DB_USE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(
      `UPDATE "Patients" p
       SET "examResults" = jsonb_set(
         jsonb_set(
           jsonb_set(
             COALESCE("examResults", '{}'::jsonb),
             '{near,currentResult,rightEye}',
             $1::text::jsonb
           ),
           '{near,currentResult,leftEye}',
           $2::text::jsonb
         ),
         '{near,currentResult,bothEye}',
         $3::text::jsonb
       ),
       "updatedAt" = NOW()
       FROM "Users" u
       WHERE u.id = p."userId"
         AND u.email = 'patient@nhuocthi.vn'
         AND p.deleted = false
       RETURNING p.id`,
      [rightEye, leftEye, bothEye]
    );
    if (res.rows.length === 0) throw new Error('Patient not found');
    console.log(
      `[set-near-level] near rightEye=${rightEye} leftEye=${leftEye} bothEye=${bothEye} OK (patient id=${res.rows[0].id})`
    );
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
