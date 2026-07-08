/**
 * Create base tables from Sequelize models (development only).
 * Run before db:migrate on a fresh local database.
 */
const { connectDB, sequelize } = require('../src/config/db');

(async () => {
  try {
    await connectDB();
    console.log('✅ Base schema synced from models');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema sync failed:', error);
    process.exit(1);
  }
})();
