const { sequelize } = require('../src/config/db');
const { roleRights } = require('../src/config/roles');

const updateDoctorRole = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const doctorRights = roleRights.get('doctor');
    console.log('📋 Doctor rights from roles.js:', doctorRights);
    console.log('Total rights:', doctorRights.length);

    // Update doctor role in database
    const [updatedCount] = await sequelize.query(
      `
      UPDATE "Roles" 
      SET rights = :rights, "updatedAt" = NOW()
      WHERE code = 'doctor'
    `,
      {
        replacements: { rights: JSON.stringify(doctorRights) },
      }
    );

    console.log('✅ Updated doctor role in database');
    console.log('Affected rows:', updatedCount);

    // Verify update
    const [roles] = await sequelize.query(`
      SELECT id, code, name, rights 
      FROM "Roles" 
      WHERE code = 'doctor'
    `);

    console.log('\n📊 Doctor role after update:');
    console.log('Rights:', roles[0].rights);
    console.log('Total:', roles[0].rights.length);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateDoctorRole();
