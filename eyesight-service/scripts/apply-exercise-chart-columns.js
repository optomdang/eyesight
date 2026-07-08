/**
 * Idempotent migration cho feature "Biểu đồ tiến độ bài tập".
 *
 * Thêm đúng 2 cột (an toàn, không kéo theo migration pending khác như `db:migrate`):
 *   1. ExerciseConfigs.inactivityThreshold  (INTEGER, default 30)  — ngưỡng bỏ tương tác
 *   2. ExerciseSessions.visionLevel          (INTEGER, nullable)    — snapshot độ khó
 *
 * Chỉ thêm cột nếu CHƯA tồn tại (an toàn chạy lại nhiều lần), rồi đánh dấu 2 file
 * migration tương ứng vào SequelizeMeta để `sequelize-cli db:migrate` không chạy lại.
 *
 * Dùng:  cross-env NODE_ENV=<env> node scripts/apply-exercise-chart-columns.js
 */

const { sequelize } = require('../src/config/db');

const STEPS = [
  {
    table: 'ExerciseConfigs',
    column: 'inactivityThreshold',
    ddl: `ALTER TABLE "ExerciseConfigs" ADD COLUMN "inactivityThreshold" INTEGER DEFAULT 30`,
    migrationFile: '20260527000000-add-inactivity-threshold-to-exercise-configs.js',
  },
  {
    table: 'ExerciseSessions',
    column: 'visionLevel',
    ddl: `ALTER TABLE "ExerciseSessions" ADD COLUMN "visionLevel" INTEGER`,
    migrationFile: '20260527000001-add-vision-level-to-exercise-sessions.js',
  },
];

const columnExists = async (table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
};

(async () => {
  try {
    await sequelize.authenticate();
    console.log(`\n=== APPLY exercise-chart columns (NODE_ENV=${process.env.NODE_ENV || 'default'}) ===\n`);

    for (const step of STEPS) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await columnExists(step.table, step.column);
      if (exists) {
        console.log(`• ${step.table}.${step.column} đã tồn tại → bỏ qua`);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(step.ddl);
        console.log(`✓ Đã thêm cột ${step.table}.${step.column}`);
      }

      // Đánh dấu migration đã chạy để db:migrate không apply lại
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING`, {
        replacements: { name: step.migrationFile },
      });
      console.log(`  ↳ SequelizeMeta: ${step.migrationFile}`);
    }

    console.log('\n=== DONE ===\n');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
})();
