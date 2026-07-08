const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('./ApiError');
const { sequelize } = require('../config/db');
const { sanitizePagination, buildSortBy, buildPagination, monitor } = require('./query');

/**
 * Standard query builder for consistent pagination, filtering, and sorting
 * Optimized for performance with attribute selection and database-level filtering
 * @param {Object} Model - Sequelize model
 * @param {Object} originalFilter - Filter conditions
 * @param {Object} options - Query options
 * @param {Object} includeConfig - Include configuration for relations
 * @returns {Promise<Object>} Paginated results
 */
const standardQuery = async (Model, originalFilter, options, includeConfig = []) => {
  return monitor.measure(`${Model.name}.standardQuery`, async () => {
    // Build where clause - move centerId to front for index optimization
    const whereClause = originalFilter.centerId ? { centerId: originalFilter.centerId, ...originalFilter } : originalFilter;

    // Build pagination and sorting with query utilities
    const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
    const order = buildSortBy(options.sortBy, ['id', 'code', 'name', 'createdAt', 'updatedAt']);

    // Optimize includes by adding attribute selection where missing
    const optimizedIncludes = includeConfig.map((include) => {
      // Don't auto-add attributes - let Sequelize handle defaults
      // Models have different columns, so auto-adding ['id', 'name', 'code'] causes errors
      return include;
    });

    const { count, rows } = await Model.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      distinct: true, // Essential for accurate counts with JOINs
      order,
      include: optimizedIncludes,
    });

    return {
      rows,
      ...buildPagination(count, limit, page),
    };
  });
};

/**
 * Standard create operation with transaction support
 * @param {Object} Model - Sequelize model
 * @param {Object} entityBody - Data to create
 * @param {Object} transaction - Optional transaction
 * @returns {Promise<Object>} Created entity
 */
const standardCreate = async (Model, entityBody, transaction = null) => {
  // Set createdBy = updatedBy for new records
  if (entityBody.updatedBy && !entityBody.createdBy) {
    entityBody.createdBy = entityBody.updatedBy;
  }

  if (transaction) {
    return Model.create(entityBody, { transaction });
  }
  return Model.create(entityBody);
};

/**
 * Standard update operation with duplicate checking
 * @param {Object} Model - Sequelize model
 * @param {number} id - Entity ID
 * @param {Object} updateBody - Update data
 * @param {string} entityName - Entity name for error messages
 * @param {Object} transaction - Optional transaction
 * @returns {Promise<Object>} Updated entity
 */
const standardUpdate = async (Model, id, updateBody, entityName, transaction = null) => {
  const entity = await Model.findByPk(id);
  if (!entity) {
    throw new ApiError(httpStatus.NOT_FOUND, `${entityName} không tồn tại`);
  }

  // Check for duplicates if code is being updated and model has duplicate checking methods
  if (updateBody.code && (Model.isDuplicateCode || Model.isDuplicateName)) {
    let isDuplicate;
    if (Model.isDuplicateCode) {
      // Special handling for Center model (doesn't have centerId)
      if (Model.tableName === 'Centers' || Model.name === 'Center') {
        isDuplicate = await Model.isDuplicateCode(updateBody.code, id);
      } else {
        isDuplicate = await Model.isDuplicateCode(updateBody.code, entity.centerId, id);
      }
    } else if (Model.isDuplicateName && updateBody.name) {
      // For models that use isDuplicateName (like ExerciseConfig)
      isDuplicate = await Model.isDuplicateName(entity.exerciseId, updateBody.name, entity.centerId, id);
    }
    if (isDuplicate) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Mã ${entityName.toLowerCase()} đã tồn tại`);
    }
  }

  Object.assign(entity, updateBody);

  if (transaction) {
    await entity.save({ transaction });
  } else {
    await entity.save();
  }

  return entity;
};

/**
 * Standard soft delete operation
 * @param {Object} Model - Sequelize model
 * @param {number} id - Entity ID
 * @param {string} entityName - Entity name for error messages
 * @returns {Promise<Object>} Deleted entity
 */
const standardSoftDelete = async (Model, id, entityName) => {
  const entity = await Model.findByPk(id);
  if (!entity) {
    throw new ApiError(httpStatus.NOT_FOUND, `${entityName} không tồn tại`);
  }

  await entity.update({
    deleted: true,
    deletedAt: new Date(),
  });

  return entity;
};

/**
 * Standard hard delete operation (use sparingly)
 * @param {Object} Model - Sequelize model
 * @param {number} id - Entity ID
 * @param {string} entityName - Entity name for error messages
 * @returns {Promise<Object>} Deleted entity
 */
const standardHardDelete = async (Model, id, entityName) => {
  const entity = await Model.findByPk(id);
  if (!entity) {
    throw new ApiError(httpStatus.NOT_FOUND, `${entityName} không tồn tại`);
  }

  await entity.destroy();
  return entity;
};

/**
 * Standard bulk soft delete operation with batch processing
 * @param {Object} Model - Sequelize model
 * @param {Array} ids - Array of entity IDs
 * @param {number} batchSize - Batch size for processing (default: 100)
 * @returns {Promise<number>} Number of affected rows
 */
const standardBulkSoftDelete = async (Model, ids, batchSize = 100) => {
  return monitor.measure(`${Model.name}.bulkSoftDelete`, async () => {
    // Process in batches to avoid overwhelming the database
    const batches = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push(ids.slice(i, i + batchSize));
    }

    // Process batches in parallel
    const results = await Promise.all(
      batches.map((batch) => Model.update({ deleted: true, deletedAt: new Date() }, { where: { id: { [Op.in]: batch } } }))
    );

    // Sum up affected counts
    const totalAffected = results.reduce((sum, [affectedCount]) => sum + affectedCount, 0);
    return totalAffected;
  });
};

/**
 * Standard bulk hard delete operation with batch processing (use sparingly)
 * @param {Object} Model - Sequelize model
 * @param {Array} ids - Array of entity IDs
 * @param {number} batchSize - Batch size for processing (default: 100)
 * @returns {Promise<number>} Number of affected rows
 */
const standardBulkHardDelete = async (Model, ids, batchSize = 100) => {
  return monitor.measure(`${Model.name}.bulkHardDelete`, async () => {
    // Process in batches to avoid overwhelming the database
    const batches = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push(ids.slice(i, i + batchSize));
    }

    // Process batches in parallel
    const results = await Promise.all(batches.map((batch) => Model.destroy({ where: { id: { [Op.in]: batch } } })));

    // Sum up affected counts
    const totalAffected = results.reduce((sum, affectedCount) => sum + affectedCount, 0);
    return totalAffected;
  });
};

/**
 * Standard transaction wrapper for complex operations
 * @param {Function} operation - Function to execute within transaction
 * @returns {Promise<any>} Result of the operation
 */
const withTransaction = async (operation) => {
  const transaction = await sequelize.transaction();

  try {
    const result = await operation(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Standard get by ID with includes
 * @param {Object} Model - Sequelize model
 * @param {number} id - Entity ID
 * @param {Array} includeConfig - Include configuration
 * @returns {Promise<Object>} Entity with relations
 */
const standardGetById = async (Model, id, includeConfig = []) => {
  return Model.findByPk(id, {
    include: includeConfig,
  });
};

/**
 * Standard get by field with includes
 * @param {Object} Model - Sequelize model
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {Array} includeConfig - Include configuration
 * @returns {Promise<Object>} Entity with relations
 */
const standardGetByField = async (Model, field, value, includeConfig = []) => {
  // Don't automatically add deleted: false - not all models have this column
  return Model.findOne({
    where: { [field]: value },
    include: includeConfig,
  });
};

module.exports = {
  standardQuery,
  standardCreate,
  standardUpdate,
  standardSoftDelete,
  standardHardDelete,
  standardBulkSoftDelete,
  standardBulkHardDelete,
  withTransaction,
  standardGetById,
  standardGetByField,
};
