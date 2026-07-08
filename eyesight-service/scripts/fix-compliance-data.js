/**
 * Script to fix compliance data - recalculate all patients' compliance with corrected formula
 * Run: node scripts/fix-compliance-data.js
 */

const { _sequelize } = require('../src/config/db');
const { Patient, ExamAssignment } = require('../src/models');
const { frequencyToDays } = require('../src/utils/examUtils');
const _logger = require('../src/config/logger');

/**
 * Calculate compliance for a specific exam type (with bug fix)
 */
async function calculateComplianceFixed(patientId, examType, frequency) {
  const { ExamResult } = require('../src/models');
  const now = new Date();

  // Get ALL exam results
  const allResults = await ExamResult.findAll({
    where: {
      patientId,
      examType,
      status: 'completed',
    },
    order: [['createdAt', 'ASC']],
  });

  // Get patient exam config to determine start date
  const examConfig = await ExamAssignment.findOne({
    where: {
      patientId,
      examType,
      isEnabled: true,
    },
  });

  if (!examConfig) {
    return {
      performanceRate: 0,
      status: 'poor',
      completedExams: 0,
      requiredExams: 0,
      lastCalculatedAt: now.toISOString(),
    };
  }

  const completedExams = allResults.length;

  // Calculate required exams
  const startDate = new Date(examConfig.createdAt);
  const totalDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  const intervalDays = frequencyToDays(frequency);
  const requiredExams = Math.max(1, Math.floor(totalDays / intervalDays) + 1);

  // 🔧 FIX: Cap performance rate at 100%
  const performanceRate = Math.min(100, Math.round((completedExams / requiredExams) * 100));

  // Determine status
  let status = 'poor';
  if (performanceRate >= 90) status = 'excellent';
  else if (performanceRate >= 75) status = 'good';
  else if (performanceRate >= 50) status = 'warning';

  return {
    performanceRate,
    status,
    completedExams,
    requiredExams,
    lastCalculatedAt: now.toISOString(),
  };
}

/**
 * Fix compliance for a single patient
 */
async function fixPatientCompliance(patientId) {
  try {
    const patient = await Patient.findByPk(patientId, {
      attributes: ['id', 'code', 'compliance'],
    });

    if (!patient) {
      console.log(`❌ Patient ${patientId} not found`);
      return;
    }

    const examTypes = ['far', 'near', 'contrast', 'stereopsis'];
    const updatedCompliance = patient.compliance || {};
    let hasChanges = false;

    for (const examType of examTypes) {
      // Get exam config
      // eslint-disable-next-line no-await-in-loop
      const examConfig = await ExamAssignment.findOne({
        where: {
          patientId,
          examType,
          isEnabled: true,
        },
      });

      if (examConfig) {
        const oldCompliance = updatedCompliance[examType];
        // eslint-disable-next-line no-await-in-loop
        const newCompliance = await calculateComplianceFixed(patientId, examType, examConfig.frequency);

        if (oldCompliance?.performanceRate !== newCompliance.performanceRate) {
          console.log(
            `  ${examType}: ${oldCompliance?.performanceRate || 0}% → ${newCompliance.performanceRate}% (${
              oldCompliance?.completedExams || 0
            }/${oldCompliance?.requiredExams || 0} → ${newCompliance.completedExams}/${newCompliance.requiredExams})`
          );
          updatedCompliance[examType] = newCompliance;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await Patient.update({ compliance: updatedCompliance }, { where: { id: patientId } });
      console.log(`✅ Updated patient ${patient.code} (ID: ${patientId})`);
    } else {
      console.log(`⏭️  Patient ${patient.code} (ID: ${patientId}) - No changes needed`);
    }
  } catch (error) {
    console.error(`❌ Error fixing patient ${patientId}:`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔧 Starting compliance data fix...\n');

    const patients = await Patient.findAll({
      where: { deleted: false },
      attributes: ['id', 'code'],
      order: [['id', 'ASC']],
    });

    console.log(`📊 Found ${patients.length} patients\n`);

    for (const patient of patients) {
      // eslint-disable-next-line no-await-in-loop
      await fixPatientCompliance(patient.id);
    }

    console.log('\n✅ Compliance data fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run
main();
