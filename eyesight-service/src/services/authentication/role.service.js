const { Op } = require('sequelize');
const httpStatus = require('http-status');
const { Role } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { removeAccents, escapeRegExp } = require('../../utils/common');
const { sanitizePagination, buildSortBy, buildPagination } = require('../../utils/query');
const auditLogService = require('../system/auditLog.service');

/**
 * Create a role
 * @param {Object} roleBody
 * @returns {Promise<Role>}
 */
const createRole = async (roleBody) => {
  if (await Role.isDuplicateCode(roleBody.code, roleBody.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Nhóm quyền đã tồn tại');
  }

  // Set createdBy = updatedBy for new records
  roleBody.createdBy = roleBody.updatedBy;

  const role = await Role.create(roleBody);

  await auditLogService.logEntityAuditEvent({
    action: 'role.create',
    entityType: 'role',
    entityId: role.id,
    centerId: role.centerId,
    actorUserId: roleBody.updatedBy || null,
    metadata: {
      code: role.code,
      name: role.name,
    },
  });

  return role;
};

/**
 * Query for roles
 * @param {Object} originalFilter - Filter conditions
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {string} [options.order] - Sort order (ASC|DESC)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<{rows: Role[], count: number, limit: number, page: number, totalPages: number}>}
 */
const queryRoles = async (originalFilter, options) => {
  const filter = {
    ...originalFilter,
    code: { [Op.ne]: 'admin' }, // Không lấy role có code là 'admin'
  };
  if (originalFilter.name) {
    filter.nameEng = { [Op.iRegexp]: removeAccents(escapeRegExp(originalFilter.name)) };
    delete filter.name;
  }

  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['name', 'createdAt']);

  const { count, rows } = await Role.findAndCountAll({
    where: filter,
    limit,
    offset,
    order,
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get role by id
 * @param {number} id
 * @returns {Promise<Role>}
 */
const getRoleById = async (id) => {
  return Role.findByPk(id);
};

/**
 * Get role by code
 * @param {string} code
 * @returns {Promise<Role>}
 */
const getRoleByCode = async (code) => {
  return Role.findOne({ where: { code } });
};

/**
 * Get role by code and centerId
 * @param {string} code - Role code
 * @param {number} centerId - Center ID
 * @returns {Promise<Role>}
 */
const getRoleByCodeAndCenterId = async (code, centerId) => {
  return Role.findOne({
    where: {
      code: { [Op.iLike]: code },
      centerId,
    },
  });
};

/**
 * Get role by code for a specific center
 * @param {string} code - Role code
 * @param {number} centerId - Center ID
 * @returns {Promise<Role>}
 */
const getRoleByCenterAndCode = async (code, centerId) => {
  return Role.findOne({ where: { code, centerId } });
};

/**
 * Update role by id
 * @param {number} roleId
 * @param {Object} updateBody
 * @returns {Promise<Role>}
 */
const updateRoleById = async (roleId, updateBody) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Nhóm quyền không tồn tại');
  }
  if (updateBody.code && (await Role.isDuplicateCode(updateBody.code, role.centerId, roleId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Nhóm quyền đã tồn tại');
  }
  Object.assign(role, updateBody);
  await role.save();

  await auditLogService.logEntityAuditEvent({
    action: 'role.update',
    entityType: 'role',
    entityId: role.id,
    centerId: role.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return role;
};

/**
 * Delete role by id (hard delete)
 * @param {number} roleId
 * @returns {Promise<Role>}
 */
const deleteRoleById = async (roleId, deleteBody = {}) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Nhóm quyền không tồn tại');
  }
  await role.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'role.delete',
    entityType: 'role',
    entityId: role.id,
    centerId: role.centerId,
    actorUserId: deleteBody.updatedBy || null,
  });

  return role;
};

/**
 * Delete roles by ids (hard delete)
 * @param {number[]} roleIds
 * @returns {Promise<number>} - Số bản ghi đã bị xóa
 */
const deleteRoleByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const affectedCount = await Role.destroy({
    where: { id: { [Op.in]: ids } },
  });

  await auditLogService.logEntityAuditEvent({
    action: 'role.bulkDelete',
    entityType: 'role',
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
 * Get roles by center
 * @param {number} centerId - Center ID
 * @returns {Promise<Role[]>}
 */
const getRolesByCenter = async (centerId) => {
  return Role.findAll({
    where: { centerId },
    order: [['createdAt', 'ASC']],
  });
};

module.exports = {
  createRole,
  queryRoles,
  getRoleById,
  getRoleByCode,
  getRoleByCodeAndCenterId,
  getRoleByCenterAndCode,
  updateRoleById,
  deleteRoleById,
  deleteRoleByIds,
  getRolesByCenter,
};
