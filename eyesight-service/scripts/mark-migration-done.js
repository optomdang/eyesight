const { sequelize } = require('../src/models');

(async () => {
  try {
    await sequelize.query(
      `INSERT INTO "SequelizeMeta" (name) VALUES ('20260208000000-add-performance-indexes.js') ON CONFLICT DO NOTHING`
    );
    console.log('✓ Marked migration 20260208000000-add-performance-indexes.js as completed');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
})();
