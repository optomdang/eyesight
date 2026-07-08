const { _sequelize } = require('../src/config/db');
const { ExerciseConfig } = require('../src/models');

/**
 * Migration script: Update configType from 'system' to 'admin'
 * Run: node scripts/migrate-system-to-admin-config.js
 */

const migrateSystemToAdmin = async () => {
  try {
    console.log('🔄 Starting migration: system → admin config type...\n');

    const systemConfigs = await ExerciseConfig.findAll({
      where: { configType: 'system' },
    });

    console.log(`📊 Found ${systemConfigs.length} configs with type 'system'\n`);

    if (systemConfigs.length === 0) {
      console.log('✅ No configs to migrate. All done!');
      return;
    }

    // Update all system configs to admin
    const [updatedCount] = await ExerciseConfig.update({ configType: 'admin' }, { where: { configType: 'system' } });

    console.log(`✅ Successfully updated ${updatedCount} configs from 'system' to 'admin'\n`);

    // Verify
    const remainingSystem = await ExerciseConfig.count({
      where: { configType: 'system' },
    });

    if (remainingSystem === 0) {
      console.log('✅ Migration completed! No more "system" configs.');
    } else {
      console.log(`⚠️  Warning: Still ${remainingSystem} configs with type 'system'`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
migrateSystemToAdmin()
  .then(() => {
    console.log('\n🎉 Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
