const httpStatus = require('http-status');
const { Op, literal } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const { patientErrors } = require('../../utils/errorFactory');
const logger = require('../../config/logger');
const { User, Patient, Doctor, Clinic } = require('../../models');
const auditLogService = require('../system/auditLog.service');
const {
  buildInTreatmentWhereClause,
  buildCompletedWhereClause,
  buildNotStartedWhereClause,
  isInTreatmentWindow,
  computeTreatmentStatus,
} = require('../../utils/treatmentUtils');
const { provisionAllSessionsForPatient } = require('../../utils/sessionProvisionUtils');
const { sanitizePagination, buildSortBy, buildPagination, ATTRS, FILTERS, monitor } = require('../../utils/query');
const { ExamResult } = require('../../models');
const { rebuildExamResults, hasData, VISION_TYPES } = require('../../utils/examResultsBackfill');

// ===== PATIENT OPERATIONS =====

const createPatient = async (patientBody, transaction = null) => {
  if (await Patient.isDuplicateCode(patientBody.code, patientBody.centerId)) {
    throw patientErrors.duplicateCode('vi', { code: patientBody.code });
  }

  // Set createdBy = updatedBy for new records
  patientBody.createdBy = patientBody.updatedBy;

  // Auto-update currentResult with initialResult values when creating patient
  if (patientBody.examResults) {
    const visionTypes = ['far', 'near', 'contrast', 'stereopsis'];
    visionTypes.forEach((visionType) => {
      if (patientBody.examResults[visionType] && patientBody.examResults[visionType].initialResult) {
        // Only copy initialResult to currentResult if currentResult doesn't exist or is empty
        if (
          !patientBody.examResults[visionType].currentResult ||
          (!patientBody.examResults[visionType].currentResult.leftEye &&
            !patientBody.examResults[visionType].currentResult.rightEye &&
            !patientBody.examResults[visionType].currentResult.bothEye)
        ) {
          patientBody.examResults[visionType].currentResult = {
            ...patientBody.examResults[visionType].initialResult,
          };
          // Set lastExamDate to current date only if we're setting currentResult
          patientBody.examResults[visionType].lastExamDate = new Date().toISOString();
        }
      }
    });
  }

  const patient = transaction ? await Patient.create(patientBody, { transaction }) : await Patient.create(patientBody);

  await auditLogService.logEntityAuditEvent({
    action: 'patient.create',
    entityType: 'patient',
    entityId: patient.id,
    centerId: patient.centerId,
    actorUserId: patientBody.updatedBy || null,
    metadata: {
      code: patient.code,
      userId: patient.userId,
      doctorId: patient.doctorId,
      treatmentStatus: patient.treatmentStatus,
    },
  });

  return patient;
};

const queryPatients = async (originalFilter, options) => {
  return monitor.measure('Patient.queryPatients', async () => {
    // Build where clause - move centerId to front for index optimization
    const filter = originalFilter.centerId ? { centerId: originalFilter.centerId, ...originalFilter } : originalFilter;

    // Extract special filters - inactiveDays/effectiveness are computed fields, not DB columns
    const { severityLevel, country, status, name, phoneNumber, inactiveDays, effectiveness, ...basicFilter } = filter;

    // Build base where clause with multi-tenant filter
    const whereClause = FILTERS.multiTenant(basicFilter.centerId);
    Object.assign(whereClause, basicFilter);

    // Add severityLevel filter directly (it's a column)
    if (severityLevel) {
      whereClause.severityLevel = severityLevel;
    }

    // Map status filter (UI) -> derived treatment phase
    if (status) {
      if (status === 'active') {
        Object.assign(whereClause, buildInTreatmentWhereClause());
      } else if (status === 'completed') {
        Object.assign(whereClause, buildCompletedWhereClause());
      } else if (status === 'not_started') {
        Object.assign(whereClause, buildNotStartedWhereClause());
      } else if (status === 'inactive' || status === 'paused' || status === 'discontinued') {
        whereClause.treatmentStatus = 'paused';
      }
    }

    // effectiveness: filter bằng JSONB operators trên examResults.far
    // So sánh currentResult vs initialResult — filter thẳng ở DB, pagination chính xác
    if (effectiveness) {
      const improvementSql = `(
        COALESCE(("Patient"."examResults"->'far'->'currentResult'->>'leftEye')::numeric, 0) > COALESCE(("Patient"."examResults"->'far'->'initialResult'->>'leftEye')::numeric, 0)
        OR COALESCE(("Patient"."examResults"->'far'->'currentResult'->>'rightEye')::numeric, 0) > COALESCE(("Patient"."examResults"->'far'->'initialResult'->>'rightEye')::numeric, 0)
        OR COALESCE(("Patient"."examResults"->'far'->'currentResult'->>'bothEye')::numeric, 0) > COALESCE(("Patient"."examResults"->'far'->'initialResult'->>'bothEye')::numeric, 0)
      )`;
      whereClause[Op.and] = whereClause[Op.and] || [];
      if (effectiveness === 'has_improvement') {
        whereClause[Op.and].push(literal(improvementSql));
      } else if (effectiveness === 'no_improvement') {
        whereClause[Op.and].push(literal(`NOT ${improvementSql}`));
      }
    }

    // inactiveDays: filter bằng SQL date arithmetic trên User.lastLoginAt (joined table)
    // COALESCE với Patient.activeFrom khi user chưa login
    if (inactiveDays) {
      const daysSql = `EXTRACT(EPOCH FROM (NOW() - COALESCE("user"."lastLoginAt", "Patient"."activeFrom"))) / 86400`;
      whereClause[Op.and] = whereClause[Op.and] || [];
      if (inactiveDays === 'no_config') {
        whereClause[Op.and].push(literal(`"user"."lastLoginAt" IS NULL AND "Patient"."activeFrom" IS NULL`));
      } else if (inactiveDays === 'has_config') {
        whereClause[Op.and].push(literal(`("user"."lastLoginAt" IS NOT NULL OR "Patient"."activeFrom" IS NOT NULL)`));
      } else if (inactiveDays === '0-7') {
        whereClause[Op.and].push(literal(`${daysSql} BETWEEN 0 AND 7`));
      } else if (inactiveDays === '7-30') {
        whereClause[Op.and].push(literal(`${daysSql} BETWEEN 7 AND 30`));
      } else if (inactiveDays === '30-90') {
        whereClause[Op.and].push(literal(`${daysSql} BETWEEN 30 AND 90`));
      } else if (inactiveDays === '90+') {
        whereClause[Op.and].push(literal(`${daysSql} > 90`));
      }
    }

    // Build pagination and sorting with query utilities
    const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
    const order = buildSortBy(options.sortBy, [
      'code',
      'user.name',
      'severityLevel',
      'activeFrom',
      'activeTo',
      'treatmentStatus',
      'createdAt',
    ]);

    // Build include with optional User-based filters (name/phoneNumber/country)
    const userInclude = {
      model: User,
      as: 'user',
      attributes: ATTRS.USER_LIST,
    };

    const userWhereAnd = [];
    if (name) {
      userWhereAnd.push(FILTERS.textSearchUnaccent('name', name));
    }
    if (phoneNumber) {
      userWhereAnd.push(FILTERS.textSearch('phoneNumber', phoneNumber));
    }
    if (country) {
      // Address stored as JSONB. Filter by address.country (Postgres).
      userWhereAnd.push(FILTERS.jsonb('user.address', 'country', country));
    }
    if (userWhereAnd.length > 0) {
      userInclude.where = { [Op.and]: userWhereAnd };
    }

    // Optimized includes with attribute selection
    const optimizedIncludes = [
      userInclude,
      {
        model: Clinic,
        as: 'clinic',
        attributes: ATTRS.CLINIC_BASIC,
        required: false,
      },
      {
        model: Doctor,
        as: 'doctor',
        attributes: ATTRS.DOCTOR_BASIC,
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name'],
          },
        ],
      },
    ];

    const { count, rows } = await Patient.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      distinct: true, // Essential for accurate counts with JOINs
      order,
      include: optimizedIncludes,
    });

    // Lightweight post-processing - Only calculate display fields
    const processedRows = rows.map((patient) => {
      const plainPatient = patient.get({ plain: true });
      const now = new Date();

      // Calculate display fields only (no filtering)
      let calculatedInactiveDays = null;
      if (plainPatient.activeFrom) {
        const lastLogin = plainPatient.user?.lastLoginAt;
        if (lastLogin) {
          calculatedInactiveDays = Math.floor((now - new Date(lastLogin)) / (1000 * 60 * 60 * 24));
        } else {
          calculatedInactiveDays = Math.floor((now - new Date(plainPatient.activeFrom)) / (1000 * 60 * 60 * 24));
        }
      }

      const activeDuration = plainPatient.activeFrom
        ? Math.floor((now - new Date(plainPatient.activeFrom)) / (1000 * 60 * 60 * 24))
        : 0;

      const remainingDuration = plainPatient.activeTo
        ? Math.max(0, Math.floor((new Date(plainPatient.activeTo) - now) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        ...plainPatient,
        inactiveDays: calculatedInactiveDays,
        activeDuration,
        remainingDuration,
      };
    });

    return {
      rows: processedRows,
      ...buildPagination(count, limit, page),
    };
  });
};

const getPatientById = async (id, include = null) => {
  // Use optimized includes if not specified
  const defaultInclude = include || [
    {
      model: User,
      as: 'user',
      attributes: ATTRS.USER_PROFILE,
    },
    {
      model: Clinic,
      as: 'clinic',
      attributes: ATTRS.CLINIC_LIST,
    },
    {
      model: Doctor,
      as: 'doctor',
      attributes: ATTRS.DOCTOR_LIST,
    },
  ];

  return Patient.findByPk(id, { include: defaultInclude });
};

const getPatientByCode = async (code) => {
  return Patient.findOne({
    where: { code, deleted: false },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ATTRS.USER_BASIC,
      },
      {
        model: Doctor,
        as: 'doctor',
        attributes: ATTRS.DOCTOR_BASIC,
      },
    ],
  });
};

const updatePatientById = async (patientId, updateBody, transaction = null) => {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }
  if (updateBody.code && (await Patient.isDuplicateCode(updateBody.code, patient.centerId, patientId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã bệnh nhân đã tồn tại');
  }

  const previousState = patient.get({ plain: true });

  // Capture treatment state BEFORE update (for status transition detection)
  const wasInTreatment = isInTreatmentWindow(patient, new Date());

  // Auto-update currentResult with initialResult values when updating exam results
  if (updateBody.examResults) {
    const visionTypes = ['far', 'near', 'contrast', 'stereopsis'];
    visionTypes.forEach((visionType) => {
      if (updateBody.examResults[visionType] && updateBody.examResults[visionType].initialResult) {
        // Only copy initialResult to currentResult if currentResult doesn't exist or is empty
        if (
          !updateBody.examResults[visionType].currentResult ||
          (!updateBody.examResults[visionType].currentResult.leftEye &&
            !updateBody.examResults[visionType].currentResult.rightEye &&
            !updateBody.examResults[visionType].currentResult.bothEye)
        ) {
          updateBody.examResults[visionType].currentResult = {
            ...updateBody.examResults[visionType].initialResult,
          };
          // Set lastExamDate to current date only if we're setting currentResult
          updateBody.examResults[visionType].lastExamDate = new Date().toISOString();
        }
      }
    });
  }

  Object.assign(patient, updateBody);
  if (transaction) {
    await patient.save({ transaction });
  } else {
    await patient.save();
  }

  const changedFields = Object.keys(updateBody);
  await auditLogService.logEntityAuditEvent({
    action: 'patient.update',
    entityType: 'patient',
    entityId: patient.id,
    centerId: patient.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      code: patient.code,
      changedFields,
      previousTreatmentStatus: previousState.treatmentStatus,
      nextTreatmentStatus: patient.treatmentStatus,
      previousDoctorId: previousState.doctorId,
      nextDoctorId: patient.doctorId,
    },
  });

  // Detect treatment status transition: INACTIVE → ACTIVE
  // This covers: pause→resume, future→active, expired→extended, etc.
  const isNowInTreatment = isInTreatmentWindow(patient, new Date());

  logger.info(`Treatment status transition check`, {
    patientId: patient.id,
    wasInTreatment,
    isNowInTreatment,
    treatmentStatus: patient.treatmentStatus,
    activeFrom: patient.activeFrom,
    activeTo: patient.activeTo,
  });

  if (!wasInTreatment && isNowInTreatment) {
    // Patient just became active - provision sessions for existing assignments
    logger.info(`Patient ${patient.id} transitioned to active, provisioning sessions...`);
    // Run async after response to avoid blocking (setImmediate)
    setImmediate(async () => {
      try {
        const result = await provisionAllSessionsForPatient(patient.id);
        logger.info(`Session provisioning completed for patient ${patient.id}`, result);
      } catch (error) {
        logger.error(`Session provisioning failed for patient ${patient.id}`, { error: error.message });
      }
    });
  }

  return patient;
};

const deletePatientById = async (patientId, deleteBody = {}) => {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }
  await patient.update({ deleted: true, deletedAt: new Date() });

  await auditLogService.logEntityAuditEvent({
    action: 'patient.delete',
    entityType: 'patient',
    entityId: patient.id,
    centerId: patient.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      code: patient.code,
      userId: patient.userId,
      doctorId: patient.doctorId,
    },
  });

  return patient;
};

const deletePatientByIds = async (deleteBody) => {
  return monitor.measure('Patient.bulkDelete', async () => {
    const patientIds = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
    const patients = await Patient.findAll({
      where: { id: patientIds },
      attributes: ['id', 'code', 'userId', 'doctorId', 'centerId'],
    });

    // Use batch processing for large datasets
    const batchSize = 100;

    // Create batches
    const batches = [];
    for (let i = 0; i < patientIds.length; i += batchSize) {
      batches.push(patientIds.slice(i, i + batchSize));
    }

    // Process all batches in parallel
    const results = await Promise.all(
      batches.map((batch) => Patient.update({ deleted: true, deletedAt: new Date() }, { where: { id: batch } }))
    );

    // Sum up affected counts from all batches
    const totalAffected = results.reduce((sum, [affectedCount]) => sum + affectedCount, 0);

    await auditLogService.logEntityAuditEvent({
      action: 'patient.bulkDelete',
      entityType: 'patient',
      centerId: deleteBody?.centerId ?? patients[0]?.centerId ?? null,
      actorUserId: deleteBody?.updatedBy || null,
      metadata: {
        patientIds,
        affectedCount: totalAffected,
        patients: patients.map((patient) => ({
          id: patient.id,
          code: patient.code,
          userId: patient.userId,
          doctorId: patient.doctorId,
        })),
      },
    });

    return totalAffected;
  });
};

const getPatientByUserId = async (userId) => {
  return Patient.findOne({ where: { userId } });
};

// ===== TREATMENT STATUS MANAGEMENT =====

/**
 * Pause patient treatment
 * @param {number} patientId
 * @param {number} updatedBy
 * @returns {Promise<Patient>}
 */
const pausePatientTreatment = async (patientId, updatedBy) => {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  return updatePatientById(patientId, {
    treatmentStatus: 'paused',
    updatedBy,
  });
};

/**
 * Resume patient treatment
 * @param {number} patientId
 * @param {Object} treatmentData
 * @param {Date} [treatmentData.activeFrom]
 * @param {Date} [treatmentData.activeTo]
 * @param {number} [treatmentData.updatedBy]
 * @returns {Promise<Patient>}
 */
const resumePatientTreatment = async (patientId, treatmentData = {}) => {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  const updates = {
    updatedBy: treatmentData.updatedBy,
  };

  if (treatmentData.activeFrom !== undefined) {
    updates.activeFrom = treatmentData.activeFrom;
  } else if (!patient.activeFrom) {
    updates.activeFrom = new Date();
  }

  if (treatmentData.activeTo !== undefined) {
    updates.activeTo = treatmentData.activeTo;
  }

  // Resume = không còn paused → tính lại status từ ngày (active / not_started / completed).
  updates.treatmentStatus = computeTreatmentStatus({
    paused: false,
    activeFrom: updates.activeFrom ?? patient.activeFrom,
    activeTo: updates.activeTo ?? patient.activeTo,
  });

  return updatePatientById(patientId, updates);
};

const activatePatient = async (patientId, activeFrom, activeTo, updatedBy) => {
  return resumePatientTreatment(patientId, {
    activeFrom,
    activeTo,
    updatedBy,
  });
};

const extendTreatmentPeriod = async (patientId, activeTo, updatedBy) => {
  const patient = await getPatientById(patientId);
  return updatePatientById(patientId, {
    activeTo,
    updatedBy,
    treatmentStatus: computeTreatmentStatus({ paused: false, activeFrom: patient?.activeFrom, activeTo }),
  });
};

/**
 * Set patient severity level (by doctor)
 * @param {number} patientId
 * @param {string} severityLevel - 'mild', 'moderate', 'severe', 'critical'
 * @param {string} severityNotes - Optional notes
 * @param {number} updatedBy
 * @returns {Promise<Patient>}
 */
const setPatientSeverity = async (patientId, severityLevel, severityNotes, updatedBy) => {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  const validSeverities = ['mild', 'moderate', 'severe', 'critical'];
  if (!validSeverities.includes(severityLevel)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mức độ nghiêm trọng không hợp lệ');
  }

  await patient.update({
    severityLevel,
    severityNotes,
    updatedBy,
  });

  return patient;
};

/**
 * Update patient medical record (bệnh án)
 * @param {number} patientId - Patient ID
 * @param {Object} medicalData - Medical record data
 * @param {string} medicalData.medicalHistory - Rich text medical history
 * @param {string} medicalData.additionalNotes - Additional notes
 * @param {Array} medicalData.medicalImages - Array of base64 images
 * @returns {Promise<Patient>}
 */
const updateMedicalRecord = async (patientId, medicalData) => {
  const patient = await Patient.findByPk(patientId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }

  // Validate image sizes if provided
  if (medicalData.medicalImages && medicalData.medicalImages.length > 0) {
    medicalData.medicalImages.forEach((img, index) => {
      if (img.size > 1024 * 1024) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Ảnh ${index + 1} vượt quá 1MB`);
      }
    });
  }

  // Update only medical record fields
  const updateData = {};
  if (medicalData.medicalHistory !== undefined) {
    updateData.medicalHistory = medicalData.medicalHistory;
  }
  if (medicalData.additionalNotes !== undefined) {
    updateData.additionalNotes = medicalData.additionalNotes;
  }
  if (medicalData.medicalImages !== undefined) {
    updateData.medicalImages = medicalData.medicalImages;
  }
  if (medicalData.causes !== undefined) {
    updateData.causes = medicalData.causes;
  }

  await patient.update(updateData);

  await auditLogService.logEntityAuditEvent({
    action: 'patient.medicalRecord.update',
    entityType: 'patient',
    entityId: patient.id,
    centerId: patient.centerId,
    actorUserId: medicalData.updatedBy || null,
    metadata: {
      changedFields: Object.keys(updateData),
      medicalImageCount: Array.isArray(updateData.medicalImages) ? updateData.medicalImages.length : undefined,
    },
  });

  return patient;
};

/**
 * Rebuild Patient.examResults from completed ExamResult rows when cache is missing/stale.
 * Fixes portal exercise gate after exams completed before cache sync existed.
 */
const ensurePatientExamResultsCache = async (patient) => {
  if (!patient) return patient;

  const missingTypes = VISION_TYPES.filter((type) => !hasData(patient.examResults?.[type]?.currentResult));
  if (missingTypes.length === 0) {
    return patient;
  }

  const completedExams = await ExamResult.findAll({
    where: { patientId: patient.id, status: 'completed', deleted: false },
    order: [['completedAt', 'ASC']],
    raw: true,
  });

  const { examResults, changed } = rebuildExamResults(patient.examResults, completedExams);
  if (!changed) {
    return patient;
  }

  await patient.update({ examResults });
  patient.examResults = examResults;
  return patient;
};

// ===== EXPORTS =====

module.exports = {
  // Core patient functions
  createPatient,
  queryPatients,
  getPatientById,
  getPatientByCode,
  updatePatientById,
  deletePatientById,
  deletePatientByIds,
  getPatientByUserId,

  // Exam results cache
  ensurePatientExamResultsCache,

  // Treatment status management
  activatePatient,
  pausePatientTreatment,
  resumePatientTreatment,
  extendTreatmentPeriod,
  setPatientSeverity,

  // Medical record management
  updateMedicalRecord,
};
