const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { removeAccents, escapeRegExp } = require('../../utils/common');
const { User, Center, Role, Clinic, Doctor, Patient } = require('../../models');
const auditLogService = require('../system/auditLog.service');
const { getRoleByCodeAndCenterId } = require('./role.service');
const doctorService = require('../clinic/doctor.service');
const patientService = require('../clinic/patient.service');
const treatmentPackageService = require('../exercise/treatmentPackage.service');
const { FILTERS } = require('../../utils/query');
const {
  standardQuery,
  standardCreate,
  standardSoftDelete,
  standardBulkSoftDelete,
  standardGetById,
  withTransaction,
} = require('../../utils/patterns');

/**
 * Auto-determine roleId based on userType and centerId
 * @param {string} userType - The user type
 * @param {number} centerId - The center ID
 * @returns {Promise<number>} - The roleId
 */
const determineRoleId = async (userType, centerId) => {
  const role = await getRoleByCodeAndCenterId(userType, centerId);
  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Vai trò ${userType} không tồn tại cho trung tâm ${centerId}`);
  }

  return role.id;
};

/**
 * Create a user and automatically create Doctor/Patient record if needed
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email đã tồn tại');
  }
  if (userBody.phoneNumber && (await User.isPhoneNumberTaken(userBody.phoneNumber))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Số điện thoại đã tồn tại');
  }

  // Create a copy of userBody to avoid mutating the parameter
  const { doctor, patient, ...userData } = userBody;

  // Auto-determine roleId if not provided and userType is specified
  if (!userData.roleId && userData.userType) {
    userData.roleId = await determineRoleId(userData.userType, userData.centerId);
  }

  // Handle clinicId alias
  if (userData.clinicId && !userData.defaultClinicId) {
    userData.defaultClinicId = userData.clinicId;
  }

  // Use transaction wrapper for complex operation
  return withTransaction(async (transaction) => {
    // Create the user first using standardized pattern
    const user = await standardCreate(User, userData, transaction);

    // Auto-create Doctor or Patient record based on userType
    if (userData.userType === 'doctor') {
      doctor.userId = user.id; // Ensure userId is set for Doctor
      doctor.centerId = user.centerId; // Ensure centerId is set for Doctor
      doctor.clinicId = user.defaultClinicId; // Ensure clinicId is set for Patient
      doctor.updatedBy = userData.updatedBy; // Ensure updatedBy is set for Doctor
      await doctorService.createDoctor(doctor, transaction);
    } else if (userData.userType === 'patient') {
      const { treatmentPackageId, ...patientBody } = patient || {};
      if (!treatmentPackageId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Gói điều trị là bắt buộc');
      }

      patientBody.userId = user.id;
      patientBody.centerId = user.centerId;
      patientBody.clinicId = user.defaultClinicId;
      patientBody.updatedBy = userData.updatedBy;

      const createdPatient = await patientService.createPatient(patientBody, transaction);

      await treatmentPackageService.assignPackageToPatient({
        patientId: createdPatient.id,
        treatmentPackageId,
        centerId: user.centerId,
        assignedBy: userData.updatedBy,
        transaction,
      });
    }

    // Return user with includes for complete data
    const createdUser = await User.findByPk(user.id, {
      transaction,
      include: [
        { model: Center, as: 'center' },
        { model: Role, as: 'role' },
        { model: Clinic, as: 'defaultClinic' },
        {
          model: Doctor,
          as: 'doctor',
          where: { deleted: false },
          required: false,
        },
        {
          model: Patient,
          as: 'patient',
          where: { deleted: false },
          required: false,
        },
      ],
    });

    if (!createdUser) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Không thể tải thông tin tài khoản vừa tạo');
    }

    await auditLogService.logEntityAuditEvent({
      action: 'user.create',
      entityType: 'user',
      entityId: createdUser.id,
      centerId: createdUser.centerId,
      actorUserId: userData.updatedBy || null,
      metadata: {
        email: createdUser.email,
        userType: createdUser.userType,
        roleId: createdUser.roleId,
      },
    });

    return createdUser;
  });
};

/**
 * Query for users
 * @param {Object} originalFilter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<{rows: User[], count: number, limit: number, page: number, totalPages: number}>}
 */
const queryUsers = async (originalFilter, options) => {
  const filter = { ...originalFilter, deleted: false };

  // Handle search param - search across multiple fields
  if (originalFilter.search) {
    const searchTerm = String(originalFilter.search).trim();
    filter[Op.or] = [
      FILTERS.textSearch('name', searchTerm),
      { nameEng: { [Op.iRegexp]: removeAccents(escapeRegExp(searchTerm)) } },
      FILTERS.textSearch('email', searchTerm),
      FILTERS.textSearch('phoneNumber', searchTerm),
    ];
    delete filter.search;
  } else if (originalFilter.name) {
    // Fallback to old nameEng search for backward compatibility
    filter.nameEng = { [Op.iRegexp]: removeAccents(escapeRegExp(originalFilter.name)) };
    delete filter.name;
  }

  if (originalFilter.phoneNumber) {
    filter.phoneNumber = { [Op.like]: `%${escapeRegExp(originalFilter.phoneNumber)}%` };
  }

  const includeConfig = [
    { model: Center, as: 'center' },
    { model: Role, as: 'role' },
    { model: Clinic, as: 'defaultClinic' },
    {
      model: Doctor,
      as: 'doctor',
      where: { deleted: false },
      required: false,
    },
    {
      model: Patient,
      as: 'patient',
      where: { deleted: false },
      required: false,
    },
  ];

  return standardQuery(User, filter, options, includeConfig);
};

/**
 * Get user by id
 * @param {number} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const includeConfig = [
    { model: Role, as: 'role' },
    { model: Center, as: 'center' },
    { model: Clinic, as: 'defaultClinic' },
    {
      model: Doctor,
      as: 'doctor',
      where: { deleted: false },
      required: false,
    },
    {
      model: Patient,
      as: 'patient',
      where: { deleted: false },
      required: false,
    },
  ];

  return standardGetById(User, id, includeConfig);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({
    where: { email },
    include: [
      { model: Role, as: 'role' },
      { model: Center, as: 'center' },
      { model: Clinic, as: 'defaultClinic' },
      {
        model: Doctor,
        as: 'doctor',
        where: { deleted: false },
        required: false,
      },
      {
        model: Patient,
        as: 'patient',
        where: { deleted: false },
        required: false,
      },
    ],
  });
};

/**
 * Update user by id
 * @param {number} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody, options = {}) => {
  const { doctor, patient, ...userData } = updateBody;
  const actorUserType = options.actorUserType;

  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Tài khoản không tồn tại');
  }
  if (userData.email && (await User.isEmailTaken(userData.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email đã tồn tại');
  }
  if (userData.phoneNumber && (await User.isPhoneNumberTaken(userData.phoneNumber, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Số điện thoại đã tồn tại');
  }

  return withTransaction(async (transaction) => {
    Object.assign(user, userData);
    await user.save({ transaction });

    // Update doctor data if provided
    if (doctor && doctor.id) {
      doctor.userId = user.id;
      doctor.centerId = user.centerId;
      await doctorService.updateDoctorById(doctor.id, doctor, transaction);
    }

    // Update patient data if provided
    if (patient && patient.id) {
      const { treatmentPackageId, ...patientBody } = patient;
      patientBody.userId = user.id;
      patientBody.centerId = user.centerId;
      await patientService.updatePatientById(patient.id, patientBody, transaction);

      if (treatmentPackageId !== undefined && treatmentPackageId !== null && treatmentPackageId !== '') {
        if (actorUserType !== 'admin') {
          throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ quản trị viên mới được đổi gói điều trị');
        }

        const active = await treatmentPackageService.getActivePatientPackage(patient.id);
        const currentPackageId = active?.treatmentPackage?.id;
        if (Number(treatmentPackageId) !== Number(currentPackageId)) {
          await treatmentPackageService.assignPackageToPatient({
            patientId: patient.id,
            treatmentPackageId: Number(treatmentPackageId),
            centerId: user.centerId,
            assignedBy: updateBody.updatedBy,
            transaction,
          });
        }
      }
    }

    // Reload the user to get fresh data including avatar
    const updatedUser = await User.findByPk(userId, {
      transaction, // Use same transaction to ensure data consistency
      include: [
        { model: Center, as: 'center' },
        { model: Role, as: 'role' },
        { model: Clinic, as: 'defaultClinic' },
        {
          model: Doctor,
          as: 'doctor',
          where: { deleted: false },
          required: false,
        },
        {
          model: Patient,
          as: 'patient',
          where: { deleted: false },
          required: false,
        },
      ],
    });

    await auditLogService.logEntityAuditEvent({
      action: 'user.update',
      entityType: 'user',
      entityId: updatedUser.id,
      centerId: updatedUser.centerId,
      actorUserId: updateBody.updatedBy || null,
      metadata: {
        updatedFields: Object.keys(updateBody || {}),
        userType: updatedUser.userType,
      },
    });

    return updatedUser;
  });
};

/**
 * Delete user by id
 * @param {number} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId, deleteBody = {}) => {
  const user = await standardSoftDelete(User, userId, 'Tài khoản');

  await auditLogService.logEntityAuditEvent({
    action: 'user.delete',
    entityType: 'user',
    entityId: user.id,
    centerId: user.centerId,
    actorUserId: deleteBody.updatedBy || null,
  });

  return user;
};

/**
 * Delete users by ids
 * @param {number[]} ids
 * @returns {Promise<[affectedCount: number, affectedRows: User[]]>}
 */
const deleteUserByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const affectedCount = await standardBulkSoftDelete(User, ids);

  await auditLogService.logEntityAuditEvent({
    action: 'user.bulkDelete',
    entityType: 'user',
    centerId: deleteBody?.centerId ?? null,
    actorUserId: deleteBody?.updatedBy || null,
    metadata: {
      ids,
      affectedCount,
    },
  });

  return affectedCount;
};

/**
 * Store FCM registration token for user
 * @param {number} userId - User ID
 * @param {string} registrationToken - FCM registration token (can be null to clear)
 * @returns {Promise<void>}
 */
const storeRegistrationToken = async (userId, registrationToken) => {
  try {
    // Find the user by their ID
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tài khoản không tồn tại');
    }
    // Store the registration token in the user's document
    user.fcmRegistrationToken = registrationToken;
    await user.save();
    logger.info('Registration token stored successfully');
  } catch (error) {
    logger.error('Error storing registration token:', error);
    throw error;
  }
};

/**
 * Get user by phone number with patient data
 * @param {string} phoneNumber
 * @returns {Promise<User>}
 */
const getUserByPhone = async (phoneNumber) => {
  return User.findOne({
    where: { phoneNumber },
    include: [
      {
        model: Patient,
        as: 'patient',
        where: { deleted: false },
        required: false,
      },
    ],
  });
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  deleteUserByIds,
  storeRegistrationToken,
  getUserByPhone,
};
