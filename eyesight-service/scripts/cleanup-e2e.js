/**
 * Xóa dữ liệu E2E test khỏi DB.
 * Chạy THỦ CÔNG từ thư mục eye-sight-service:
 *
 *   node scripts/cleanup-e2e.js
 *
 * Xóa tất cả centers có tên bắt đầu bằng "E2E Center" và cascade xóa
 * tất cả data liên quan (users, patients, doctors, clinics, exercises, etc.).
 */

const path = require('path');

// Load .env từ root service
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'false' ? false : { require: true, rejectUnauthorized: false },
  },
});

async function cleanup() {
  console.log('🧹 E2E Cleanup — xóa centers test từ DB...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB\n');

    // Tìm E2E centers
    const centers = await sequelize.query(
      `SELECT id, name, code FROM "Centers" WHERE name LIKE 'E2E Center%' AND deleted = false`,
      { type: QueryTypes.SELECT }
    );

    if (centers.length === 0) {
      console.log('✅ Không có center E2E nào cần xóa.');
      return;
    }

    console.log(`📋 Tìm thấy ${centers.length} center(s) E2E:`);
    centers.forEach((c) => console.log(`   - [${c.id}] ${c.name} (code: ${c.code})`));
    console.log('');

    const centerIds = centers.map((c) => c.id);
    const placeholders = centerIds.map((_, i) => `$${i + 1}`).join(',');

    // Safety: đưa admin accounts về center gốc (ID nhỏ nhất không phải E2E)
    const [safeCenter] = await sequelize.query(
      `SELECT id FROM "Centers" WHERE name NOT LIKE 'E2E Center%' AND deleted = false ORDER BY id LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    if (safeCenter) {
      const movePlaceholders = centerIds.map((_, i) => `$${i + 2}`).join(',');
      const [, resetMeta] = await sequelize.query(
        `UPDATE "Users" SET "centerId" = $1 WHERE "centerId" IN (${movePlaceholders}) AND email NOT LIKE 'e2e.%'`,
        { bind: [safeCenter.id, ...centerIds], type: QueryTypes.RAW }
      );
      if (resetMeta?.rowCount > 0) {
        console.log(`   🔄 Moved ${resetMeta.rowCount} non-E2E user(s) back to center [${safeCenter.id}]`);
      }
      // Fix admin roleId (may have been set to E2E role which will be deleted)
      const adminRoleId = await sequelize.query(`SELECT id FROM "Roles" WHERE "centerId" = $1 AND code = 'admin' LIMIT 1`, {
        bind: [safeCenter.id],
        type: QueryTypes.SELECT,
      });
      if (adminRoleId.length > 0) {
        await sequelize.query(
          `UPDATE "Users" SET "roleId" = $1 WHERE "centerId" = $2 AND "roleId" NOT IN (SELECT id FROM "Roles" WHERE "centerId" = $2)`,
          { bind: [adminRoleId[0].id, safeCenter.id], type: QueryTypes.RAW }
        );
      }
    }

    // Xóa theo thứ tự dependency (con trước, cha sau)
    const deleteQueries = [
      // Exercise results & sessions
      `DELETE FROM "ExerciseResults" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "ExerciseSessions" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "ExerciseAssignments" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "ExerciseConfigs" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "Exercises" WHERE "centerId" IN (${placeholders})`,
      // Exam results & sessions
      `DELETE FROM "ExamResults" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "ExamSessions" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "ExamAssignments" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "ExamMetrics" WHERE "centerId" IN (${placeholders})`,
      // Patients & Doctors
      `DELETE FROM "Patients" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "Doctors" WHERE "centerId" IN (${placeholders})`,
      // Notifications & Audit
      `DELETE FROM "Notifications" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "NotificationTemplates" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "AuditLogs" WHERE "centerId" IN (${placeholders})`,
      // Auth — CHỈ xóa users E2E (email e2e.*), KHÔNG đụng admin/system accounts
      `DELETE FROM "Tokens" WHERE "userId" IN (SELECT id FROM "Users" WHERE "centerId" IN (${placeholders}) AND email LIKE 'e2e.%')`,
      `DELETE FROM "Users" WHERE "centerId" IN (${placeholders}) AND email LIKE 'e2e.%'`,
      `DELETE FROM "Roles" WHERE "centerId" IN (${placeholders})`,
      // System
      `DELETE FROM "Clinics" WHERE "centerId" IN (${placeholders})`,
      `DELETE FROM "Centers" WHERE id IN (${placeholders})`,
    ];

    // Sequential on purpose: deletes must run in dependency order
    // (Tokens → Users → Roles → Clinics → Centers); parallelizing would break ordering.
    for (const sql of deleteQueries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const [, meta] = await sequelize.query(sql, {
          bind: centerIds,
          type: QueryTypes.RAW,
        });
        const table = sql.match(/"(\w+)"/)?.[1] || '?';
        if (meta?.rowCount > 0) {
          console.log(`   🗑️  ${table}: ${meta.rowCount} row(s) deleted`);
        }
      } catch (err) {
        // Bảng có thể không tồn tại — skip
        const table = sql.match(/"(\w+)"/)?.[1] || '?';
        console.log(`   ⚠️  ${table}: skipped (${err.message.slice(0, 60)})`);
      }
    }

    console.log('\n🧹 Cleanup hoàn tất.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

cleanup();
