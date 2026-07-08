const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { exerciseConfigService, exerciseAssignmentService } = require('../../services');
const pick = require('../../utils/pick');

const filterKeys = ['name', 'exerciseId', 'configType', 'centerId'];

const assertCanAccessExerciseConfig = (config, user) => {
  if (!exerciseConfigService.canUserAccessExerciseConfig(config, user)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this exercise config');
  }
};

const assertCanMutateExerciseConfig = (config, user) => {
  if (!exerciseConfigService.canUserMutateExerciseConfig(config, user)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Chỉ quản trị viên mới được sửa hoặc xóa chế độ tập luyện mặc định của hệ thống'
    );
  }
};

/**
 * Create a new exercise configuration
 */
const createExerciseConfig = catchAsync(async (req, res) => {
  const body = {
    ...req.body,
    centerId: req.user.centerId,
    createdBy: req.body.createdBy ?? req.user.id,
    updatedBy: req.user.id,
  };

  // Doctors may only create personal (doctor) configs — never system/admin catalog modes
  if (req.user.userType === 'doctor') {
    body.configType = 'doctor';
  } else if (req.user.userType === 'admin') {
    body.configType = body.configType === 'doctor' ? 'doctor' : 'admin';
  }

  const config = await exerciseConfigService.createExerciseConfig(body);
  res.status(httpStatus.CREATED).send(config);
});

/**
 * Get exercise configuration by exercise ID
 */
const getExerciseConfigByExerciseId = catchAsync(async (req, res) => {
  const config = await exerciseConfigService.getExerciseConfigByExerciseId(req.params.exerciseId, req.user.centerId);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise configuration not found');
  }
  res.send(config);
});

/**
 * Update exercise configuration by exercise ID
 */
const updateExerciseConfig = catchAsync(async (req, res) => {
  const config = await exerciseConfigService.getExerciseConfigByExerciseId(req.params.exerciseId, req.user.centerId);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise configuration not found');
  }
  assertCanAccessExerciseConfig(config, req.user);
  assertCanMutateExerciseConfig(config, req.user);
  if (req.user.userType === 'doctor' && req.body?.configType) {
    req.body.configType = 'doctor';
  }
  const updatedConfig = await exerciseConfigService.updateExerciseConfigById(config.id, req.body);
  res.send(updatedConfig);
});

/**
 * Delete exercise configuration by exercise ID
 */
const deleteExerciseConfig = catchAsync(async (req, res) => {
  const config = await exerciseConfigService.getExerciseConfigByExerciseId(req.params.exerciseId, req.user.centerId);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise configuration not found');
  }
  assertCanAccessExerciseConfig(config, req.user);
  assertCanMutateExerciseConfig(config, req.user);
  await exerciseConfigService.deleteExerciseConfigById(config.id, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get exercise configuration by config ID
 */
const getExerciseConfigById = catchAsync(async (req, res) => {
  const config = await exerciseConfigService.getExerciseConfigById(req.params.configId);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise config not found');
  }
  // SECURITY: Verify center ownership and role-based config access
  if (config.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this exercise config');
  }
  assertCanAccessExerciseConfig(config, req.user);
  res.send(config);
});

/**
 * Update exercise configuration by config ID
 */
const updateExerciseConfigById = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before updating
  const existingConfig = await exerciseConfigService.getExerciseConfigById(req.params.configId);
  if (!existingConfig) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise config not found');
  }
  if (existingConfig.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exercise config');
  }
  assertCanAccessExerciseConfig(existingConfig, req.user);
  assertCanMutateExerciseConfig(existingConfig, req.user);

  // Doctors cannot elevate a personal config into a system template
  if (req.user.userType === 'doctor' && req.body?.configType) {
    req.body.configType = 'doctor';
  }

  const config = await exerciseConfigService.updateExerciseConfigById(req.params.configId, req.body);
  res.send(config);
});

/**
 * Delete exercise configuration by config ID
 */
const deleteExerciseConfigById = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before deleting
  const existingConfig = await exerciseConfigService.getExerciseConfigById(req.params.configId);
  if (!existingConfig) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exercise config not found');
  }
  if (existingConfig.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this exercise config');
  }
  assertCanAccessExerciseConfig(existingConfig, req.user);
  assertCanMutateExerciseConfig(existingConfig, req.user);

  await exerciseConfigService.deleteExerciseConfigById(req.params.configId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get exercise configurations with template filtering
 */
const getExerciseConfigs = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'order', 'limit', 'page']);

  const result = await exerciseConfigService.queryExerciseConfigs(filter, options, req.user);
  res.send(result);
});

/**
 * Assign template to patient (create patient-specific config)
 */
const assignTemplateToPatient = catchAsync(async (req, res) => {
  const configData = {
    ...req.body,
    exerciseId: parseInt(req.params.exerciseId, 10),
    patientId: parseInt(req.params.patientId, 10),
    centerId: req.user.centerId,
    configType: 'patient', // This is a patient-specific config
    createdBy: req.user.id,
    updatedBy: req.user.id,
  };

  const config = await exerciseConfigService.assignTemplateToPatient(configData);
  res.status(httpStatus.CREATED).send(config);
});

/**
 * Assign configuration to multiple patients
 */
const assignConfigToPatients = catchAsync(async (req, res) => {
  const { configId } = req.params;
  const { patientIds, notes, visionLevel, levelOverride, trainingEye } = req.body;
  const assignedBy = req.user.id; // Get current user ID

  const assignments = await exerciseAssignmentService.assignConfigToPatients(configId, patientIds, {
    notes,
    assignedBy,
    priority: req.body.priority || 'normal',
    visionLevel,
    levelOverride,
    trainingEye,
  });

  res.status(httpStatus.CREATED).send({
    message: `Configuration assigned to ${assignments.length} patients successfully`,
    assignments,
  });
});

/**
 * Bulk delete exercise configurations by IDs
 */
const deleteExerciseConfigs = catchAsync(async (req, res) => {
  const ids = req.body;
  await exerciseConfigService.deleteExerciseConfigsByIds(ids, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get color scheme presets for game 2048
 */
const getColorSchemePresets = catchAsync(async (req, res) => {
  const presets = await exerciseConfigService.getColorSchemePresets(req.user.centerId);
  res.send(presets);
});

const saveColorSchemePreset = catchAsync(async (req, res) => {
  const { preset, textColor, backgroundColor } = req.body;
  const presets = await exerciseConfigService.saveColorSchemePreset(
    req.user.centerId,
    preset,
    { textColor, backgroundColor },
    req.user.id
  );
  res.send(presets);
});

module.exports = {
  createExerciseConfig,
  getExerciseConfigByExerciseId,
  updateExerciseConfig,
  deleteExerciseConfig,
  getExerciseConfigById,
  updateExerciseConfigById,
  deleteExerciseConfigById,
  getExerciseConfigs,
  deleteExerciseConfigs,
  assignTemplateToPatient,
  assignConfigToPatients,
  getColorSchemePresets,
  saveColorSchemePreset,
};
