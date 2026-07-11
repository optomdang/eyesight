/**
 * Apply schema fixes missing after db:sync (columns added by migrations, not in models).
 * Safe to run multiple times (IF NOT EXISTS).
 */
const { sequelize } = require('../src/config/db');

const statements = [
  `ALTER TABLE "ExerciseSessions" ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "ExerciseSessions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE "ExerciseAssignments" ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "ExerciseAssignments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE "ExerciseConfigs" ADD COLUMN IF NOT EXISTS "vtSettings" JSONB`,
  `ALTER TABLE "ExerciseResults" ADD COLUMN IF NOT EXISTS "resultMetrics" JSONB`,
  `ALTER TABLE "ExerciseConfigs" ADD COLUMN IF NOT EXISTS "dichoptic" JSONB`,
  `ALTER TABLE "ExerciseSessions" ADD COLUMN IF NOT EXISTS "dichopticSnapshot" JSONB`,
];

(async () => {
  try {
    await sequelize.authenticate();
    for (const sql of statements) {
      await sequelize.query(sql);
    }
    console.log('✅ Local schema fixes applied');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    process.exit(1);
  }
})();
