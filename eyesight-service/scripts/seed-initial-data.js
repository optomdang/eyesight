const moment = require('moment');
const { sequelize } = require('../src/config/db');

// Import models properly
const User = require('../src/models/authentication/user.model');
const Role = require('../src/models/authentication/role.model');
const Center = require('../src/models/system/center.model');
const Clinic = require('../src/models/clinic/clinic.model');
const Doctor = require('../src/models/clinic/doctor.model');
const Patient = require('../src/models/clinic/patient.model');
const Exercise = require('../src/models/exercise/exercise.model');
const ExerciseConfig = require('../src/models/exercise/exerciseConfig.model');

const { roleRights } = require('../src/config/roles');

// Generate code function (same as utils/common.js)
const generateCode = (prefix) => {
  const datePart = moment().format('YYMMDD');
  const uniquePart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${datePart}${uniquePart}`;
};

// Truncate all tables (in proper order to handle foreign keys)
const truncateTables = async () => {
  console.log('🗑️  Truncating all tables...');

  // Define tables to truncate (child tables first)
  const tables = [
    'Tokens',
    'Notifications',
    'ExerciseResults',
    'ExerciseSessions',
    'ExerciseAssignments',
    'ExerciseConfigs',
    'Exercises',
    'ExamResults',
    'ExamMetrics',
    'ExamSessions',
    'ExamAssignments',
    'Doctors',
    'Patients',
    'Users',
    'Roles',
    'Clinics',
    'NotificationTemplates',
    'Configurations',
    'Centers',
  ];

  // Truncate each table and reset ID sequences
  // eslint-disable-next-line no-restricted-syntax
  for (const table of tables) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      console.log(`  ✓ Truncated ${table}`);
    } catch (error) {
      if (error.original?.code === '42P01') {
        console.log(`  ⊘ Skipped ${table} (doesn't exist)`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ All tables truncated with ID reset');
};

const seedInitialData = async () => {
  try {
    // Truncate all tables first
    await truncateTables();

    console.log('🌱 Starting seed process...');

    // 1. Create Default Center
    console.log('\n🏥 Creating Default Center...');
    const center = await Center.create({
      code: generateCode('E'),
      name: 'Trung tâm Lotus Vision',
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Cầu Giấy',
        wardCode: '00004',
        specificAddress: 'Số 1 Nguyễn Phong Sắc',
      }),
      phoneNumber: '0241234567',
    });
    console.log(`✅ Created center: ${center.name} (${center.code})`);

    // 2. Create Roles with Rights JSON
    console.log('\n👥 Creating Roles...');
    const createdRoles = {};
    const roleEntries = Array.from(roleRights.entries());

    // eslint-disable-next-line no-restricted-syntax
    for (const [roleName, rightCodes] of roleEntries) {
      // eslint-disable-next-line no-await-in-loop
      const role = await Role.create({
        name: roleName,
        code: roleName.toUpperCase(),
        centerId: center.id,
        rights: rightCodes,
        description: getRoleDescription(roleName),
      });
      createdRoles[roleName] = role;
      console.log(`✅ Created role '${roleName}' (${role.code}) with ${rightCodes.length} rights`);
    }

    // 3. Create Default Clinic
    console.log('\n🏥 Creating Default Clinic...');
    const clinic = await Clinic.create({
      code: generateCode('I'),
      name: 'Phòng khám Thị lực',
      centerId: center.id,
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Cầu Giấy',
        wardCode: '00004',
        specificAddress: 'Số 1 Nguyễn Phong Sắc',
      }),
      phoneNumber: '0241234567',
    });
    console.log(`✅ Created clinic: ${clinic.name} (${clinic.code})`);

    // 4. Create Admin Users
    console.log('\n👤 Creating Admin Users...');
    const adminUser = await User.create({
      email: 'admin@lotusvision.vn',
      password: 'Admin@123',
      name: 'Administrator',
      userType: 'admin',
      phoneNumber: '0241234567',
      roleId: createdRoles.admin.id,
      centerId: center.id,
      isEmailVerified: true,
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Cầu Giấy',
        wardCode: '00004',
        specificAddress: 'Số 1 Nguyễn Phong Sắc',
      }),
    });
    console.log(`✅ Created admin user: ${adminUser.email}`);

    const hungdxAdmin = await User.create({
      email: 'hungdx@gmail.com',
      password: '12345678a',
      name: 'Đặng Xuân Hưng',
      userType: 'admin',
      phoneNumber: '0987000001',
      roleId: createdRoles.admin.id,
      centerId: center.id,
      isEmailVerified: true,
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Cầu Giấy',
        wardCode: '00004',
        specificAddress: 'Hà Nội',
      }),
    });
    console.log(`✅ Created admin user: ${hungdxAdmin.email}`);

    const vinhnbAdmin = await User.create({
      email: 'vinhnb@example.com',
      password: '12345678a',
      name: 'Nguyễn Bá Vinh',
      userType: 'admin',
      phoneNumber: '0987000002',
      roleId: createdRoles.admin.id,
      centerId: center.id,
      isEmailVerified: true,
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Cầu Giấy',
        wardCode: '00004',
        specificAddress: 'Hà Nội',
      }),
    });
    console.log(`✅ Created admin user: ${vinhnbAdmin.email}`);

    // 5. Create Doctor User
    console.log('\n👨‍⚕️ Creating Doctor User...');
    const doctorUser = await User.create({
      email: 'doctor@lotusvision.vn',
      password: 'Doctor@123',
      name: 'Bác sĩ Nguyễn Văn A',
      userType: 'doctor',
      phoneNumber: '0987654321',
      roleId: createdRoles.doctor.id,
      centerId: center.id,
      isEmailVerified: true,
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Cầu Giấy',
        wardCode: '00004',
        specificAddress: 'Số 2 Nguyễn Phong Sắc',
      }),
    });
    console.log(`✅ Created doctor user: ${doctorUser.email}`);

    // 5.1. Create Doctor Record
    console.log('👨‍⚕️ Creating Doctor Record...');
    const doctor = await Doctor.create({
      code: generateCode('DT'),
      userId: doctorUser.id,
      centerId: center.id,
      specialization: 'Ophthalmology',
    });
    console.log(`✅ Created doctor record: ${doctor.code}`);

    // 6. Create Patient User
    console.log('\n🧑 Creating Patient User...');
    const patientUser = await User.create({
      email: 'patient@lotusvision.vn',
      password: 'Patient@123',
      name: 'Nguyễn Thị B',
      userType: 'patient',
      phoneNumber: '0912345678',
      roleId: createdRoles.patient.id,
      centerId: center.id,
      isEmailVerified: true,
      dateOfBirth: '1990-01-01',
      gender: 'female',
      address: JSON.stringify({
        country: 'Vietnam',
        province: 'Hà Nội',
        provinceCode: '01',
        ward: 'Phường Dịch Vọng',
        wardCode: '00007',
        specificAddress: 'Số 10 Xuân Thủy',
      }),
    });
    console.log(`✅ Created patient user: ${patientUser.email}`);

    // 6.1. Create Patient Record
    console.log('🧑 Creating Patient Record...');
    const patient = await Patient.create({
      code: generateCode('PT'),
      userId: patientUser.id,
      centerId: center.id,
    });
    console.log(`✅ Created patient record: ${patient.code}`);

    // 7. Create Sample Exercise - 2048 only
    console.log('\n🎮 Creating Sample Exercise...');

    const exercise2048 = await Exercise.create({
      code: generateCode('EX'),
      name: 'Game 2048',
      description: 'Trò chơi ghép số 2048 giúp cải thiện thị lực và khả năng tập trung',
      exerciseType: '2048',
      status: 'active',
      centerId: center.id,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    });
    console.log(`✅ Created exercise: ${exercise2048.name} (${exercise2048.code})`);

    // 8. Create Exercise Config for 2048
    console.log('\n⚙️  Creating Exercise Config...');

    await ExerciseConfig.create({
      exerciseId: exercise2048.id,
      centerId: center.id,
      configType: 'admin',
      name: 'Cấu hình 2048 mặc định',
      visionType: 'far',
      contrast: 100,
      fontSize: 16,
      frequency: 'daily',
      duration: 10,
      executionCount: 1,
      eye: 'both',
      distance: 3.0,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    });
    console.log(`✅ Created config for ${exercise2048.name}`);

    console.log('\n✨ Seed completed successfully!');
    console.log('\n📝 Default Accounts:');
    console.log('   Admin: admin@lotusvision.vn / Admin@123');
    console.log('   Admin: hungdx@gmail.com / 12345678a');
    console.log('   Admin: vinhnb@example.com / 12345678a');
    console.log('   Doctor: doctor@lotusvision.vn / Doctor@123');
    console.log('   Patient: patient@lotusvision.vn / Patient@123');
    console.log('\n🎮 Sample Exercise Created:');
    console.log(`   - ${exercise2048.name} (${exercise2048.code})`);
    console.log('\n💡 Please change passwords after first login!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
};

function getRoleDescription(roleName) {
  const descriptions = {
    admin: 'System Administrator - Full access to all features',
    doctor: 'Doctor - Manage patients, exams, and exercises',
    patient: 'Patient - Access own data and perform exercises',
  };
  return descriptions[roleName] || roleName;
}

// Run seed
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    await seedInitialData();

    await sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();
