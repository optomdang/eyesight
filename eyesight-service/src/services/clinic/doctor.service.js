const httpStatus = require('http-status');
const { sequelize } = require('../../config/db');
const { Doctor, Patient, Clinic } = require('../../models');
const { User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const auditLogService = require('../system/auditLog.service');

const createDoctor = async (doctorBody, transaction = null) => {
  if (await Doctor.isDuplicateCode(doctorBody.code, doctorBody.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã bác sĩ đã tồn tại');
  }

  // Set createdBy = updatedBy for new records
  doctorBody.createdBy = doctorBody.updatedBy;

  const doctor = transaction ? await Doctor.create(doctorBody, { transaction }) : await Doctor.create(doctorBody);

  await auditLogService.logEntityAuditEvent({
    action: 'doctor.create',
    entityType: 'doctor',
    entityId: doctor.id,
    centerId: doctor.centerId,
    actorUserId: doctorBody.updatedBy || null,
    metadata: {
      code: doctor.code,
      userId: doctor.userId,
    },
  });

  return doctor;
};

const queryDoctors = async (originalFilter, options) => {
  const { Op } = require('sequelize');
  const { FILTERS } = require('../../utils/query');

  const { sortBy, order: orderParam, limit = 10, page = 1, includeCount = false } = options;
  const offset = (page - 1) * limit;

  // Extract user-based filters
  const { name, search, ...basicFilter } = originalFilter;
  const filter = { ...basicFilter, deleted: false };

  // Build user include with optional name filter
  const userInclude = {
    model: User,
    as: 'user',
  };

  if (name) {
    userInclude.where = FILTERS.textSearchUnaccent('name', name);
  }

  // Handle search param - search across multiple fields
  if (search) {
    filter[Op.or] = [
      FILTERS.textSearch('code', search),
      { '$user.name$': { [Op.iLike]: `%${search}%` } },
      { '$user.phoneNumber$': { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Handle sort with relation support - support both formats:
  // Format 1: sortBy=user.name:desc
  // Format 2: sortBy=user.name&order=desc
  let order = [['createdAt', 'DESC']]; // default sort
  if (sortBy) {
    let field;
    let direction;

    // Check if direction is in sortBy (format: field:direction)
    if (sortBy.includes(':')) {
      [field, direction = 'ASC'] = sortBy.split(':');
    } else {
      // Use separate order parameter
      field = sortBy;
      direction = orderParam || 'ASC';
    }

    direction = direction.toUpperCase();

    // Check if it's a relation field (e.g., "user.name")
    if (field.includes('.')) {
      const [relationName, relationField] = field.split('.');
      order = [[relationName, relationField, direction]];
    } else {
      order = [[field, direction]];
    }
  }

  // First get the count without GROUP BY
  const count = await Doctor.count({
    where: filter,
    include: [userInclude, { model: Clinic, as: 'clinic' }],
  });

  // Build query attributes
  const queryOptions = {
    where: filter,
    limit,
    offset,
    order,
    include: [userInclude, { model: Clinic, as: 'clinic', attributes: ['id', 'name', 'code'], required: false }],
  };

  // Only add treatedPatientsCount subquery if explicitly requested
  if (includeCount) {
    queryOptions.attributes = {
      include: [
        [
          sequelize.literal(`(
            SELECT COUNT(*)
            FROM "Patients" AS p
            WHERE p."doctorId" = "Doctor"."id"
            AND p."deleted" = false
          )`),
          'treatedPatientsCount',
        ],
      ],
    };
  }

  // Get doctors with optional patient count
  const rows = await Doctor.findAll(queryOptions);

  // Convert to plain objects
  const doctorsWithCount = rows.map((doctor) => {
    const doctorData = doctor.toJSON();
    if (includeCount && doctorData.treatedPatientsCount !== undefined) {
      doctorData.treatedPatientsCount = parseInt(doctorData.treatedPatientsCount || 0, 10);
    }
    return doctorData;
  });

  return {
    rows: doctorsWithCount,
    count,
    limit,
    page,
    totalPages: Math.ceil(count / limit),
  };
};

const getDoctorById = async (id, options = {}) => {
  const { includeCount = false } = options;
  const doctor = await Doctor.findByPk(id, {
    include: [{ model: User, as: 'user' }],
  });

  if (!doctor) {
    return null;
  }

  // Only add count if explicitly requested (for read operations)
  if (includeCount) {
    const doctorData = doctor.toJSON();
    const patientCount = await Patient.count({
      where: {
        doctorId: doctor.id,
        deleted: false,
      },
    });
    doctorData.treatedPatientsCount = patientCount;
    return doctorData;
  }

  // Return Sequelize instance for save operations
  return doctor;
};

const getDoctorByCode = async (code) => {
  return Doctor.findOne({ where: { code, deleted: false } });
};

const updateDoctorById = async (doctorId, updateBody, transaction) => {
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bác sĩ không tồn tại');
  }
  if (updateBody.code && (await Doctor.isDuplicateCode(updateBody.code, doctor.centerId, doctorId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã bác sĩ đã tồn tại');
  }
  Object.assign(doctor, updateBody);
  if (transaction) {
    await doctor.save({ transaction });
  } else {
    await doctor.save();
  }

  await auditLogService.logEntityAuditEvent({
    action: 'doctor.update',
    entityType: 'doctor',
    entityId: doctor.id,
    centerId: doctor.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return doctor;
};

const deleteDoctorById = async (doctorId, deleteBody = {}) => {
  const doctor = await getDoctorById(doctorId);
  if (!doctor) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bác sĩ không tồn tại');
  }
  await doctor.update({ deleted: true, deletedAt: new Date() });

  await auditLogService.logEntityAuditEvent({
    action: 'doctor.delete',
    entityType: 'doctor',
    entityId: doctor.id,
    centerId: doctor.centerId,
    actorUserId: deleteBody.updatedBy || null,
  });

  return doctor;
};

const deleteDoctorByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const result = await Doctor.update({ deleted: true, deletedAt: new Date() }, { where: { id: ids } });

  await auditLogService.logEntityAuditEvent({
    action: 'doctor.bulkDelete',
    entityType: 'doctor',
    centerId: deleteBody?.centerId ?? null,
    actorUserId: deleteBody?.updatedBy || null,
    metadata: {
      ids,
      affectedCount: Array.isArray(result) ? result[0] : result,
    },
  });

  return result;
};

/**
 * Get doctor by userId
 * @param {number} userId - The user ID
 * @returns {Promise<Doctor>}
 */
const getDoctorByUserId = async (userId) => {
  return Doctor.findOne({ where: { userId, deleted: false } });
};

module.exports = {
  createDoctor,
  queryDoctors,
  getDoctorById,
  getDoctorByCode,
  updateDoctorById,
  deleteDoctorById,
  deleteDoctorByIds,
  getDoctorByUserId,
};
