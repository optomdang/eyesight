const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { sequelize } = require('../../config/db');

/**
 * Service for managing patient compliance and exam results
 */

const buildEmptyCompliance = (now = new Date()) => ({
  performanceRate: 0,
  status: 'poor',
  completedExams: 0,
  requiredExams: 0,
  lastCalculatedAt: now.toISOString(),
});

const buildComplianceStatus = (performanceRate) => {
  if (performanceRate >= 90) return 'excellent';
  if (performanceRate >= 75) return 'good';
  if (performanceRate >= 50) return 'warning';
  return 'poor';
};

const getDueSessionWhereClause = (patientId, examType, now = new Date()) => ({
  patientId,
  examType,
  deleted: false,
  scheduledDate: {
    [Op.lte]: now,
  },
});

async function recalculatePatientComplianceByType(patientId, examType) {
  const { Patient, ExamAssignment } = require('../../models');

  // Whitelist vì examType được nội suy vào path của jsonb_set bên dưới.
  if (!['far', 'near', 'contrast', 'stereopsis'].includes(examType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Loại kiểm tra không hợp lệ: ${examType}`);
  }

  const patient = await Patient.findByPk(patientId, {
    attributes: ['id', 'compliance'],
  });

  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  const examConfig = await ExamAssignment.findOne({
    where: {
      patientId,
      examType,
      isEnabled: true,
    },
  });

  const compliance = examConfig ? await calculateCompliance(patientId, examType) : buildEmptyCompliance();

  // Ghi ATOMIC đúng key examType bằng jsonb_set — KHÔNG read-modify-write cả object.
  // Hàm này được gọi SONG SONG khi lưu nhiều exam config cùng lúc (FE Promise.all 4 loại);
  // merge trong JS rồi ghi đè cả cột sẽ last-writer-wins, clobber compliance của các
  // loại khám khác về giá trị cũ (đã tái hiện thực tế: contrast/stereopsis về default).
  await Patient.update(
    {
      compliance: sequelize.fn(
        'jsonb_set',
        sequelize.fn('COALESCE', sequelize.col('compliance'), sequelize.literal(`'{}'::jsonb`)),
        // examType là enum nội bộ (far|near|contrast|stereopsis) — không phải user input.
        sequelize.literal(`'{${examType}}'`),
        sequelize.literal(`'${JSON.stringify(compliance)}'::jsonb`),
        true
      ),
    },
    { where: { id: patientId } }
  );

  return compliance;
}

/**
 * Update compliance and exam results for a specific patient and exam type
 * @param {number} patientId - Patient ID
 * @param {string} examResult - Exam type (far, near, contrast, stereopsis)
 */
async function updatePatientCompliance(patientId, examResult) {
  try {
    const { Patient, ExamAssignment } = require('../../models');

    // Get patient exam configuration for this exam type.
    // NOTE: an ExamAssignment is a *schedule*. It is required to compute compliance %,
    // but it must NOT gate the recording of measured vision levels — those are the read
    // model the improvement dashboards depend on and must update on every completed exam,
    // whether or not the patient has a scheduled assignment.
    const examConfig = await ExamAssignment.findOne({
      where: {
        patientId,
        examType: examResult.examType,
        isEnabled: true,
      },
    });

    // Get current patient data to check if initialResult exists
    const patient = await Patient.findByPk(patientId, {
      attributes: ['examResults', 'compliance'],
    });

    if (!patient) {
      logger.debug(`Patient ${patientId} not found while updating exam results`);
      return;
    }

    const currentExamResults = (patient.examResults && patient.examResults[examResult.examType]) || {};
    const hasInitialResult =
      currentExamResults.initialResult &&
      (examResult.examType === 'stereopsis'
        ? currentExamResults.initialResult.bothEye !== null && currentExamResults.initialResult.bothEye !== undefined
        : currentExamResults.initialResult.leftEye !== null || currentExamResults.initialResult.rightEye !== null);

    const examResultData = {
      leftEye: examResult.examType === 'stereopsis' ? null : examResult.leftEyeLevel || null,
      rightEye: examResult.examType === 'stereopsis' ? null : examResult.rightEyeLevel || null,
      bothEye: examResult.examType === 'stereopsis' ? examResult.bothEyeLevel || null : null,
      lastExamDate: examResult.createdAt,
    };

    // CHECK ĐIỀU KIỆN TRƯỚC KHI UPDATE currentResult
    const shouldUpdateCurrentResult =
      examResult.status === 'completed' &&
      ((examResult.examType === 'stereopsis' && examResult.bothEyeLevel) ||
        (examResult.examType !== 'stereopsis' && examResult.rightEyeLevel && examResult.leftEyeLevel));

    // Get current examResults to preserve other exam types
    const allExamResults = patient.examResults || {};

    // Update only the specific exam type — always recorded, independent of any schedule.
    const updatedExamResults = {
      ...allExamResults,
      [examResult.examType]: {
        ...allExamResults[examResult.examType],
        ...(shouldUpdateCurrentResult ? { currentResult: examResultData } : {}),
        ...(hasInitialResult ? {} : { initialResult: examResultData }),
      },
    };

    const updateFields = { examResults: updatedExamResults };

    // Compliance % is meaningful only with a schedule; compute/update it only when one exists.
    if (examConfig) {
      const compliance = await calculateCompliance(patientId, examResult.examType);
      updateFields.compliance = {
        ...(patient.compliance || {}),
        [examResult.examType]: compliance,
      };
    }

    // Update patient record with merged data
    await Patient.update(updateFields, { where: { id: patientId } });

    logger.debug(
      `Updated ${hasInitialResult ? 'current' : 'initial + current'} result for patient ${patientId} (${
        examResult.examType
      }); compliance ${examConfig ? 'updated' : 'skipped (no schedule)'}; currentResult ${
        shouldUpdateCurrentResult ? 'YES' : 'NO'
      }`
    );
  } catch (error) {
    logger.error('Error updating compliance for patient', {
      patientId,
      examType: examResult.examType,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Calculate compliance for a specific exam type
 * @param {number} patientId - Patient ID
 * @param {string} examType - Exam type
 * @returns {Object} Compliance data
 */
async function calculateCompliance(patientId, examType) {
  const { ExamSession, ExamAssignment } = require('../../models');
  const now = new Date();

  const examConfig = await ExamAssignment.findOne({
    where: {
      patientId,
      examType,
      isEnabled: true,
    },
  });

  if (!examConfig) {
    return buildEmptyCompliance(now);
  }

  const dueSessions = await ExamSession.findAll({
    attributes: ['id', 'status', 'scheduledDate'],
    where: getDueSessionWhereClause(patientId, examType, now),
    order: [
      ['scheduledDate', 'ASC'],
      ['createdAt', 'ASC'],
    ],
    raw: true,
  });

  const requiredExams = dueSessions.length;
  const completedExams = dueSessions.filter((session) => session.status === 'completed').length;
  const performanceRate = requiredExams === 0 ? 0 : Math.round((completedExams / requiredExams) * 100);
  const status = buildComplianceStatus(performanceRate);

  return {
    performanceRate,
    status,
    completedExams,
    requiredExams,
    lastCalculatedAt: now.toISOString(),
  };
}

/**
 * Get exam results (initial and current) for a specific exam type
 * @param {number} patientId - Patient ID
 * @param {string} examType - Exam type
 * @returns {Object} Exam results data
 */

/**
 * Recalculate compliance for all patients
 */
async function recalculateAllPatientCompliance() {
  try {
    const { Patient } = require('../../models');

    const patients = await Patient.findAll({
      where: { deleted: false },
      attributes: ['id'],
    });

    logger.info(`Starting compliance recalculation for ${patients.length} patients`);

    await Promise.all(patients.map((patient) => updateAllExamTypesForPatient(patient.id)));

    logger.info('Completed compliance recalculation for all patients');
  } catch (error) {
    logger.error('Error recalculating compliance for all patients', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Update compliance for all exam types for a specific patient
 * @param {number} patientId - Patient ID
 */
async function updateAllExamTypesForPatient(patientId) {
  const examTypes = ['far', 'near', 'contrast', 'stereopsis'];

  const updatePromises = examTypes.map(async (examType) => {
    try {
      await recalculatePatientComplianceByType(patientId, examType);
    } catch (error) {
      logger.error('Error updating compliance for patient exam type', {
        patientId,
        examType,
        error: error.message,
      });
      // Continue with other exam types even if one fails
    }
  });

  await Promise.all(updatePromises);
}

/**
 * Get compliance data for a patient
 * @param {number} patientId - Patient ID
 * @returns {Object} Patient compliance data
 */
async function getPatientCompliance(patientId) {
  const { Patient } = require('../../models');

  const patient = await Patient.findByPk(patientId, {
    attributes: ['id', 'compliance', 'examResults'],
  });

  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  return {
    compliance: patient.compliance || {},
    examResults: patient.examResults || {},
  };
}

module.exports = {
  updatePatientCompliance,
  calculateCompliance,
  recalculatePatientComplianceByType,
  recalculateAllPatientCompliance,
  updateAllExamTypesForPatient,
  getPatientCompliance,
};
