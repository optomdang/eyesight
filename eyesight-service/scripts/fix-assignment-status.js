/**
 * Fix Script: Update Assignment Status to Active
 *
 * This script fixes assignments that have incorrect status,
 * preventing them from showing in patient portal.
 *
 * Usage:
 *   node scripts/fix-assignment-status.js <patientEmail>
 *
 * Example:
 *   node scripts/fix-assignment-status.js patient@example.com
 */

const { sequelize } = require('../src/config/db');
const { User, Patient, ExerciseAssignment, ExerciseConfig, Exercise } = require('../src/models');

async function fixAssignmentStatus(patientEmail) {
  console.log('\n=== FIXING ASSIGNMENT STATUS ===\n');

  try {
    // Find patient
    console.log(`Finding patient: ${patientEmail}...`);

    const patientUser = await User.findOne({
      where: { email: patientEmail },
      include: [{ model: Patient, as: 'patient' }],
    });

    if (!patientUser || !patientUser.patient) {
      console.error(`❌ Patient not found: ${patientEmail}`);
      return;
    }

    console.log(`✅ Found patient: ${patientUser.name} (ID: ${patientUser.patient.id})`);

    // Find non-active assignments
    const nonActiveAssignments = await ExerciseAssignment.findAll({
      where: {
        patientId: patientUser.patient.id,
        status: { [sequelize.Sequelize.Op.ne]: 'active' },
        deleted: false,
      },
      include: [
        {
          model: ExerciseConfig,
          as: 'exerciseConfig',
          include: [
            {
              model: Exercise,
              as: 'exercise',
            },
          ],
        },
      ],
    });

    if (nonActiveAssignments.length === 0) {
      console.log('\n✅ No non-active assignments found. Nothing to fix.');
      return;
    }

    console.log(`\nFound ${nonActiveAssignments.length} non-active assignments:`);

    nonActiveAssignments.forEach((assignment, index) => {
      console.log(`\n${index + 1}. Assignment ID: ${assignment.id}`);
      console.log(`   Exercise: ${assignment.exerciseConfig?.exercise?.name || 'N/A'}`);
      console.log(`   Current Status: ${assignment.status}`);
    });

    // Ask for confirmation
    console.log('\n⚠️  This will update all non-active assignments to status="active"');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Update assignments
    console.log('\nUpdating assignments...');

    const updatePromises = nonActiveAssignments.map(async (assignment) => {
      await assignment.update({ status: 'active' });
      console.log(`✅ Updated assignment ${assignment.id} to status="active"`);
    });

    await Promise.all(updatePromises);

    console.log(`\n✅ Successfully updated ${nonActiveAssignments.length} assignments`);

    // Verify
    const activeAssignments = await ExerciseAssignment.findAll({
      where: {
        patientId: patientUser.patient.id,
        status: 'active',
        deleted: false,
      },
    });

    console.log(`\nVerification: Patient now has ${activeAssignments.length} active assignments`);
    console.log('Patient should now see these exercises in portal.');
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
  } finally {
    await sequelize.close();
  }
}

// Run fix
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node scripts/fix-assignment-status.js <patientEmail>');
  console.log('Example: node scripts/fix-assignment-status.js patient@example.com');
  process.exit(1);
}

const [patientEmail] = args;

fixAssignmentStatus(patientEmail)
  .then(() => {
    console.log('\n=== FIX COMPLETED ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
