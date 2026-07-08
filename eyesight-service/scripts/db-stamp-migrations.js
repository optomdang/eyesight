/**
 * Mark all Sequelize migrations as applied (after db:sync on fresh local DB).
 */
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/db');

const migrationsDir = path.join(__dirname, '../src/database/migrations');

(async () => {
  try {
    await sequelize.authenticate();

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.js'))
      .sort();

    for (const file of files) {
      // sequelize-cli v6 / umzug stores the full filename including ".js"
      await sequelize.query(
        'INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING',
        { replacements: { name: file } }
      );
    }

    console.log(`✅ Stamped ${files.length} migrations`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Stamp failed:', error);
    process.exit(1);
  }
})();
