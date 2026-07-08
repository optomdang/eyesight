const httpStatus = require('http-status');
const { Op } = require('sequelize');
const { ExerciseResult, ExerciseAssignment, Patient, Exercise, sequelize } = require('../../models');
const ExerciseSession = require('../../models/exercise/exerciseSession.model');
const ExerciseConfig = require('../../models/exercise/exerciseConfig.model');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { FIELDS, buildQuery, buildPagination, sanitizePagination, buildSortBy } = require('../../utils/query');
const { recordSessionCompletion } = require('./exerciseSessionCompletion.service');
const {
  COMPLETION_TIME_THRESHOLD_PCT,
  exerciseSlotCompletionPct,
  isExerciseSlotFullyComplete,
  isExerciseSlotEnded,
  computeSessionFocusScore,
  resolveInactivityCountOnComplete,
  focusScoreFromCounts,
} = require('../dashboard/leaderboardMetrics');

// ============================================
// NEW FUNCTIONS: Start, Pause, Complete Exercise
// ============================================

const getExecutionDurationLimitSeconds = (config) => {
  if (!config || config.duration == null) return Number.POSITIVE_INFINITY;
  const minutes = Number(config.duration);
  if (!Number.isFinite(minutes) || minutes <= 0) return Number.POSITIVE_INFINITY;
  return minutes * 60;
};

/** Clamp reported duration to configured assignment limit (minutes → seconds). */
const clampDurationToAssignmentLimit = (config, durationSeconds) => {
  const limit = getExecutionDurationLimitSeconds(config);
  if (!Number.isFinite(limit) || limit === Number.POSITIVE_INFINITY) {
    return durationSeconds;
  }
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
    return durationSeconds;
  }
  return Math.min(durationSeconds, limit);
};

const isExecutionTimedOut = (result, durationOverride = null) => {
  const durationSeconds = durationOverride ?? result?.duration ?? 0;
  const durationLimitSeconds = getExecutionDurationLimitSeconds(result?.exerciseConfig);

  return durationSeconds >= durationLimitSeconds;
};

/**
 * Resolve the difficulty (vision level) at which an exercise is performed.
 * Server-side source of truth — mirrors the client resolution:
 *   - if the assignment has an explicit override → use assignment.visionLevel
 *   - else → patient's current exam level for the config's visionType + eye
 * Returns an integer level, or null when neither source provides one.
 *
 * @param {Object} assignment - ExerciseAssignment incl. exerciseConfig (levelOverride/visionLevel on assignment)
 * @param {Object} patient    - Patient with examResults JSONB
 * @returns {number|null}
 */
const resolveAssignmentDifficultyLevel = (assignment, patient) => {
  const config = assignment && assignment.exerciseConfig;
  if (!config) return null;

  // Doctor override takes precedence
  if (assignment.levelOverride && assignment.visionLevel) {
    return Number(assignment.visionLevel);
  }

  const { visionType, eye: configEye } = config;
  if (!visionType) return null;

  const eye = assignment.trainingEye || configEye;
  if (!eye) return null;

  const current =
    patient && patient.examResults && patient.examResults[visionType] ? patient.examResults[visionType].currentResult : null;
  if (!current) return null;

  let level;
  if (eye === 'right') {
    level = current.rightEye;
  } else if (eye === 'both') {
    // 'both' = MẮT KÉM HƠN. Phải khớp tuyệt đối với FE (visionUtils.resolveExerciseVisionLevel)
    // để `ExerciseResult.level` (record/chart) bằng đúng độ khó cỡ chữ game bệnh nhân thực sự thấy.
    //  - far/near/contrast: thang đơn điệu cùng chiều (level cao = thị lực tốt) → mắt kém = min(left,right),
    //    loại bỏ mắt thiếu (null/0); cả hai thiếu → null (caller không có fallback ở tầng record).
    //  - stereopsis: exam chỉ đo bothEye → lấy thẳng bothEye.
    if (visionType === 'stereopsis') {
      level = current.bothEye;
    } else {
      const toLevel = (v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const candidates = [toLevel(current.leftEye), toLevel(current.rightEye)].filter((x) => x !== null);
      level = candidates.length ? Math.min(...candidates) : null;
    }
  } else {
    level = current.leftEye; // default to left eye
  }

  return level != null ? Number(level) : null;
};

/**
 * Start or resume an exercise
 * - If pending result exists with exerciseState → resume
 * - If pending result exists without exerciseState → continue
 * - If no pending result → create new with config snapshot
 *
 * @param {number} sessionId - Exercise session ID
 * @param {number} assignmentId - Exercise assignment ID
 * @param {number} patientId - Patient ID
 * @param {number} centerId - Center ID
 * @param {number} userId - User ID for createdBy
 * @returns {Promise<{action: 'new'|'resume'|'continue', result: ExerciseResult}>}
 */
const startExercise = async (sessionId, assignmentId, patientId, centerId, userId) => {
  const session = await ExerciseSession.findByPk(sessionId, {
    attributes: ['id', 'status'],
  });

  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phiên bài tập không tồn tại');
  }

  if (session.status === 'completed') {
    return {
      action: 'blocked',
      reason: 'session_completed_not_playable',
    };
  }

  // Only results still in progress (no completedAt) can be resumed or continued.
  const pendingResult = await ExerciseResult.findOne({
    where: {
      exerciseSessionId: sessionId,
      status: 'incomplete',
      deleted: false,
      completedAt: { [Op.is]: null },
    },
  });

  if (pendingResult) {
    if (isExecutionTimedOut(pendingResult)) {
      // Defensive guard: in normal flow this is unreachable because pauseExercise
      // rejects any duration >= limit before writing to DB, and completeExercise
      // sets status to passed/failed (removing the result from the incomplete query).
      // Timeout on the FE is handled by the FE calling completeExercise directly.
      // Day-crossing paused results are handled by exerciseStaleResult.service.js scheduler.
      return {
        action: 'blocked',
        reason: 'timed_out_not_playable',
        result: pendingResult,
      };
    }

    // Has pending result
    if (pendingResult.exerciseState) {
      // Has saved game state → resume
      return { action: 'resume', result: pendingResult };
    }
    // No saved state → continue with existing result
    return { action: 'continue', result: pendingResult };
  }

  // No pending result → create new
  const assignment = await ExerciseAssignment.findByPk(assignmentId, {
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        include: [{ model: Exercise, as: 'exercise', attributes: ['id', 'exerciseType', 'code'] }],
      },
    ],
  });

  if (!assignment || !assignment.exerciseConfig) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao hoặc cấu hình không tồn tại');
  }

  const config = assignment.exerciseConfig;

  // Resolve difficulty (vision level) server-side at the moment play begins —
  const patient = await Patient.findByPk(patientId, { attributes: ['id', 'examResults'] });
  const level = resolveAssignmentDifficultyLevel(assignment, patient);

  const configSnapshot = config.toJSON();
  if (config.exercise) {
    configSnapshot.exerciseType = config.exercise.exerciseType;
  }

  // Create new result with config snapshot
  const newResult = await ExerciseResult.create({
    exerciseSessionId: sessionId,
    exerciseAssignmentId: assignmentId,
    patientId,
    exerciseId: config.exerciseId,
    status: 'incomplete',
    startedAt: new Date(),
    level,
    exerciseConfig: configSnapshot, // Snapshot config for audit trail
    centerId,
    createdBy: userId,
    updatedBy: userId,
  });

  return { action: 'new', result: newResult };
};

/**
 * Validate exercise state structure for 2048 game
 * Expected structure from GameManager.serialize():
 * {
 *   grid: { size: number, cells: array[][] },
 *   score: number,
 *   over: boolean,
 *   won: boolean,
 *   keepPlaying: boolean
 * }
 */
const isValid2048ExerciseState = (state) => {
  if (!state || typeof state !== 'object') return false;
  if (!state.grid || typeof state.grid !== 'object') return false;
  if (typeof state.grid.size !== 'number' || state.grid.size <= 0) return false;
  if (!Array.isArray(state.grid.cells)) return false;
  const score = typeof state.score === 'string' ? parseInt(state.score, 10) : state.score;
  if (typeof score !== 'number' || Number.isNaN(score)) return false;
  if (typeof state.over !== 'boolean') return false;
  if (typeof state.won !== 'boolean') return false;
  return true;
};

const isValidVtQuestExerciseState = (state) => {
  if (!state || typeof state !== 'object') return false;
  if (typeof state.currentWorld !== 'string') return false;
  if (typeof state.stageIndex !== 'number') return false;
  if (!state.staircaseState || typeof state.staircaseState !== 'object') return false;
  return true;
};

const isValidFarAcuityExerciseState = (state) => {
  if (!state || typeof state !== 'object') return false;
  if (typeof state.farLevel !== 'number' || state.farLevel < 1) return false;
  if (typeof state.contrastLevel !== 'number' || state.contrastLevel < 1) return false;
  if (!Array.isArray(state.letters)) return false;
  if (typeof state.roundsCompleted !== 'number') return false;
  return true;
};

/**
 * Validate exerciseState structure based on exercise type from result's config snapshot.
 * Returns true when state is acceptable to persist; false means set to null + warn.
 */
const VT_QUEST_FAMILY_TYPES = new Set(['vt-quest', 'vt-gabor', 'vt-vernier', 'vt-crowding', 'vt-stereopsis']);

const isValidExerciseState = (state, exerciseType) => {
  if (!state || typeof state !== 'object') return false;

  const type = (exerciseType || '').toLowerCase().trim();

  if (VT_QUEST_FAMILY_TYPES.has(type)) return isValidVtQuestExerciseState(state);
  if (type === 'far-acuity') return isValidFarAcuityExerciseState(state);
  // Config snapshot may omit nested exercise — detect VT shape from payload.
  if (isValidVtQuestExerciseState(state)) return true;

  // Default: 2048 validator (backward compat)
  return isValid2048ExerciseState(state);
};

/**
 * Pause an exercise - save current game state and increment result pauseCount
 * Status remains 'incomplete'
 *
 * @param {number} resultId - Exercise result ID
 * @param {Object} updateBody - { exerciseState, score, movesCount, duration }
 * @returns {Promise<ExerciseResult>}
 */
const pauseExercise = async (resultId, updateBody, patientId = null) => {
  const result = await ExerciseResult.findOne({ where: { id: resultId, deleted: false } });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại');
  }

  // Security: verify ownership if patientId provided
  if (patientId !== null && result.patientId !== patientId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền cập nhật kết quả này');
  }

  if (result.status !== 'incomplete') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chỉ có thể tạm dừng bài tập đang thực hiện');
  }

  // Always allow pause — patient must be able to exit even when time limit elapsed.
  if (updateBody.duration != null) {
    updateBody.duration = clampDurationToAssignmentLimit(result.exerciseConfig, updateBody.duration);
  }

  // Validate exerciseState structure if provided (type-aware)
  if (updateBody.exerciseState !== null && updateBody.exerciseState !== undefined) {
    const exerciseType =
      result.exerciseConfig?.exercise?.exerciseType ??
      result.exerciseConfig?.exerciseType ??
      '';
    if (!isValidExerciseState(updateBody.exerciseState, exerciseType)) {
      logger.warn('Invalid exerciseState structure provided, setting to null', {
        resultId,
        exerciseType,
        hasGrid: !!updateBody.exerciseState?.grid,
        gridSize: updateBody.exerciseState?.grid?.size,
      });
      updateBody.exerciseState = null;
    }
  }

  // Update with current state and metrics; increment pauseCount on the result
  await result.update({
    exerciseState: updateBody.exerciseState,
    score: updateBody.score,
    movesCount: updateBody.movesCount,
    duration: updateBody.duration,
    accuracy: updateBody.accuracy,
    pauseCount: (result.pauseCount ?? 0) + 1,
    // status remains 'incomplete'
  });

  return result;
};

/**
 * Track a 30-second inactivity event — increments inactivityCount on the active result
 *
 * @param {number} resultId - Exercise result ID
 * @param {number} patientId - Patient ID for ownership verification
 */
const trackInactivity = async (resultId, patientId) => {
  const result = await ExerciseResult.findOne({ where: { id: resultId, deleted: false } });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại');
  }

  if (result.patientId !== patientId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền cập nhật kết quả này');
  }

  if (result.status !== 'incomplete') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bài tập không còn đang thực hiện');
  }

  await ExerciseResult.increment('inactivityCount', { by: 1, where: { id: resultId } });
};

/**
 * Complete an exercise - evaluate pass/fail and update session stats
 *
 * @param {number} resultId - Exercise result ID
 * @param {Object} finalData - { score, duration, movesCount, accuracy }
 * @param {number} patientId - Patient ID for ownership verification (optional)
 * @returns {Promise<ExerciseResult>}
 */
/**
 * Extract the highest vision level from a result's metrics blob.
 * Mirrors the frontend helper in exerciseDifficultyBaseline.ts.
 *
 * | exerciseType  | field                                                 |
 * |---------------|-------------------------------------------------------|
 * | far-acuity    | peakFarLevel  (both far and near use the same engine) |
 * | contrast      | peakContrastLevel                                     |
 * | VT Quest      | peakVisionLevel                                       |
 * | 2048 / static | peakVisionLevel or peakFarLevel, whichever present    |
 */
function extractPeakVisionLevelFromMetrics(resultMetrics) {
  if (!resultMetrics || typeof resultMetrics !== 'object') return null;

  // Contrast: separate field
  if (typeof resultMetrics.peakContrastLevel === 'number' && resultMetrics.peakContrastLevel > 0) {
    // If there is also a peakFarLevel the caller is far-acuity, not contrast — disambiguate below.
    if (!resultMetrics.peakFarLevel) {
      return resultMetrics.peakContrastLevel;
    }
  }

  // far-acuity (far/near), 2048, VT Quest
  for (const key of ['peakFarLevel', 'peakVisionLevel']) {
    const v = resultMetrics[key];
    if (typeof v === 'number' && v > 0) return v;
  }

  // Contrast (when far acuity data is absent)
  const cv = resultMetrics.peakContrastLevel;
  if (typeof cv === 'number' && cv > 0) return cv;

  return null;
}

/**
 * After a session execution is completed, look up the assignment and bump
 * lastAchievedVisionLevel to max(existing, peak from this result).
 */
async function updateAssignmentPeakVisionLevel(sessionId, resultMetrics) {
  const session = await ExerciseSession.findByPk(sessionId, {
    attributes: ['exerciseAssignmentId'],
  });
  if (!session?.exerciseAssignmentId) return;

  const peak = extractPeakVisionLevelFromMetrics(resultMetrics);
  if (peak == null || peak <= 0) return;

  const assignment = await ExerciseAssignment.findByPk(session.exerciseAssignmentId, {
    attributes: ['id', 'lastAchievedVisionLevel'],
  });
  if (!assignment) return;

  const existing = assignment.lastAchievedVisionLevel ?? 0;
  if (peak > existing) {
    await assignment.update({ lastAchievedVisionLevel: peak });
  }
}

const completeExercise = async (resultId, finalData, patientId = null) => {
  const result = await ExerciseResult.findOne({ where: { id: resultId, deleted: false } });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại');
  }

  // Security: verify ownership if patientId provided
  if (patientId !== null && result.patientId !== patientId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền cập nhật kết quả này');
  }

  if (result.status !== 'incomplete') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bài tập đã được hoàn thành trước đó');
  }

  // #21-clamp: thời gian thực không được vượt thời gian được giao (vượt = bug FE) → cap = giao.
  const assignedMin = result.exerciseConfig?.duration || 0;
  const assignedSec = assignedMin * 60;
  let clampedDuration = finalData.duration;
  if (assignedSec > 0 && clampedDuration > assignedSec) {
    clampedDuration = assignedSec;
  }

  const inactivityCount = resolveInactivityCountOnComplete(result, {
    movesCount: finalData.movesCount,
    durationSec: clampedDuration,
  });
  const pauseCount = result.pauseCount ?? 0;
  const focusScore = focusScoreFromCounts(pauseCount, inactivityCount);

  const timePct = exerciseSlotCompletionPct(clampedDuration, assignedMin);
  // BXH: mọi lượt kết thúc đều ghi nhận % thời gian; chỉ ≥80% mới status='completed'.
  const finalStatus = timePct >= COMPLETION_TIME_THRESHOLD_PCT ? 'completed' : 'incomplete';

  await result.update({
    status: finalStatus,
    score: finalData.score,
    duration: clampedDuration,
    movesCount: finalData.movesCount,
    accuracy: finalData.accuracy,
    inactivityCount,
    focusScore,
    // Persist VT clinical metrics permanently before clearing exerciseState
    ...(finalData.resultMetrics ? { resultMetrics: finalData.resultMetrics } : {}),
    // Complete (incl. early stop) ends the slot — never resumable like pause.
    exerciseState: null,
    completedAt: new Date(),
  });

  // Update session statistics
  if (result.exerciseSessionId) {
    await updateSessionStats(result.exerciseSessionId);
  }

  // Update assignment's peak vision level when this execution was a proper completion.
  if (finalStatus === 'completed' && finalData.resultMetrics && result.exerciseSessionId) {
    await updateAssignmentPeakVisionLevel(result.exerciseSessionId, finalData.resultMetrics).catch(
      (err) => logger.warn('Failed to update lastAchievedVisionLevel:', err.message)
    );
  }

  return result;
};

/**
 * Update session statistics after result completion.
 * Session complete = đủ lượt đạt ≥80% thời gian giao (executionCount).
 *
 * @param {number} sessionId - Exercise session ID
 */
const updateSessionStats = async (sessionId) => {
  const results = await ExerciseResult.findAll({
    where: { exerciseSessionId: sessionId, deleted: false },
    order: [['createdAt', 'ASC']],
  });

  const session = await ExerciseSession.findByPk(sessionId, {
    include: [
      {
        model: ExerciseAssignment,
        as: 'exerciseAssignment',
        include: [{ model: ExerciseConfig, as: 'exerciseConfig' }],
      },
    ],
  });

  if (!session || !session.exerciseAssignment || !session.exerciseAssignment.exerciseConfig) {
    return;
  }

  const config = session.exerciseAssignment.exerciseConfig;
  const requiredCount = session.executionCount ?? config.executionCount ?? 1;
  const assignedMin = parseFloat(session.executionDuration) || config.duration || 0;

  const endedResults = results.filter((r) => isExerciseSlotEnded(r));
  const fullyCompleteResults = endedResults.filter((r) => isExerciseSlotFullyComplete(r.duration, assignedMin));
  const fullyCompleteCount = fullyCompleteResults.length;

  const now = new Date();
  const isSessionComplete = fullyCompleteCount >= requiredCount;
  const previousStatus = session.status;

  const scoreSource = endedResults.length > 0 ? endedResults : fullyCompleteResults;
  const totalScore = scoreSource.reduce((sum, r) => sum + (r.score || 0), 0);
  const averageScore =
    scoreSource.length > 0 ? Math.round((totalScore / scoreSource.length) * 100) / 100 : 0;
  const bestScore = scoreSource.length > 0 ? Math.max(0, ...scoreSource.map((r) => r.score || 0)) : 0;

  const { pauseCount, inactivityCount, focusScore } = computeSessionFocusScore(endedResults);

  const resultWithLevel = results.find((r) => r.level != null);
  const visionLevel = resultWithLevel ? resultWithLevel.level : null;

  await session.update({
    executionsCompleted: fullyCompleteCount,
    validExecutions: fullyCompleteCount,
    totalScore,
    averageScore,
    bestScore,
    validityPercentage:
      requiredCount > 0 ? Math.min(100, Math.round((fullyCompleteCount / requiredCount) * 100)) : 0,
    duration: endedResults.reduce((sum, r) => sum + (r.duration || 0), 0),
    pauseCount,
    inactivityCount,
    focusScore,
    visionLevel,
    status: isSessionComplete ? 'completed' : 'incomplete',
    completedAt: isSessionComplete ? now : null,
    endedAt: isSessionComplete ? now : session.endedAt,
  });

  // If session just completed, update assignment's sessionsCompleted counter
  if (isSessionComplete && previousStatus !== 'completed') {
    try {
      await recordSessionCompletion(session.exerciseAssignmentId, {
        completedAt: now,
      });
    } catch (error) {
      // Log but don't fail if compliance update fails
      logger.error('Failed to update assignment compliance', {
        exerciseAssignmentId: session.exerciseAssignmentId,
        error: error.message,
      });
    }
  }
};

// ============================================
// EXISTING FUNCTIONS (updated for new status field)
// ============================================

const createExerciseResult = async (resultBody) => {
  // Set createdBy = updatedBy for new records
  const body = { ...resultBody, createdBy: resultBody.updatedBy };

  // Legacy "completed" flag → 'completed' status (no pass/fail evaluation anymore).
  if (body.completed === true) {
    body.status = 'completed';
    body.completedAt = new Date();
    delete body.completed;
  } else if (!body.status) {
    // Default status for new results
    body.status = 'incomplete';
  }

  // If no sessionId provided, use simple creation
  if (!body.exerciseSessionId) {
    return ExerciseResult.create(body);
  }

  // Use transaction for session stats update
  const transaction = await sequelize.transaction();

  try {
    const { exerciseSessionId } = body;

    // Create the exercise result
    const exerciseResult = await ExerciseResult.create(body, { transaction });

    // Commit transaction
    await transaction.commit();

    // Update session stats (outside transaction for simplicity)
    await updateSessionStats(exerciseSessionId);

    return exerciseResult;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    throw error;
  }
};

const queryExerciseResults = async (originalFilter, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy || 'createdAt:DESC', ['createdAt', 'status', 'score']);

  const filter = { ...originalFilter };

  const queryOptions = buildQuery('exerciseResultList', limit, offset, order, [
    {
      model: ExerciseAssignment,
      as: 'assignment',
      attributes: ['visionLevel'],
      required: false,
      include: [
        {
          model: ExerciseConfig,
          as: 'exerciseConfig',
          attributes: ['id', 'name', 'eye', 'visionType'],
          required: false,
        },
      ],
    },
  ]);
  queryOptions.where = filter;

  const { count, rows } = await ExerciseResult.findAndCountAll(queryOptions);

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

const getExerciseResultById = async (id) => {
  return ExerciseResult.findByPk(id, {
    attributes: FIELDS.exerciseResultDetail,
    raw: true,
  });
};

const getExerciseResultByCode = async (code) => {
  return ExerciseResult.findOne({
    attributes: FIELDS.exerciseResultDetail,
    where: { code },
    raw: true,
  });
};

const updateExerciseResultById = async (resultId, updateBody) => {
  // For updates, need full node instance
  const result = await ExerciseResult.findByPk(resultId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại');
  }
  Object.assign(result, updateBody);
  await result.save();
  return result;
};

const deleteExerciseResultById = async (resultId) => {
  const result = await ExerciseResult.findByPk(resultId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại');
  }
  result.deleted = true;
  result.deletedAt = new Date();
  await result.save();
  return result;
};

const deleteExerciseResultByIds = async (resultIds) => {
  return ExerciseResult.update({ deleted: true, deletedAt: new Date() }, { where: { id: resultIds } });
};

/**
 * Optimized: Get latest result for assignment using index
 */
const getLatestResultForExerciseAssignment = async (exerciseAssignmentId) => {
  return ExerciseResult.findOne({
    attributes: FIELDS.exerciseResultList,
    where: { exerciseAssignmentId },
    order: [['createdAt', 'DESC']],
    raw: true,
  });
};

/**
 * Optimized: Get latest results for assignment with limit
 */
const getLatestResultsForExerciseAssignment = async (exerciseAssignmentId, limit = 5) => {
  const { limit: safeLimit } = sanitizePagination(limit, 1, 50);

  return ExerciseResult.findAll({
    attributes: FIELDS.exerciseResultList,
    where: { exerciseAssignmentId },
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    raw: true,
  });
};

/**
 * Get results summary by patient (updated for status field)
 * Only counts completed exercises (passed or failed), not incomplete ones
 * Optimized: uses raw queries over large datasets
 */
const getResultsSummaryByPatient = async (patientId, dateFilter = {}) => {
  const whereClause = {
    patientId,
    deleted: false,
    status: 'completed', // Only completed executions
  };

  if (dateFilter.startDate) {
    whereClause.createdAt = { [Op.gte]: dateFilter.startDate };
  }
  if (dateFilter.endDate) {
    whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: dateFilter.endDate };
  }

  const results = await ExerciseResult.findAll({
    attributes: ['id', 'exerciseId', 'status', 'score', 'duration'],
    where: whereClause,
    raw: true,
  });

  const totalSessions = results.length;
  // No pass/fail: every fetched result is 'completed'. Kept the field name for API compatibility.
  const totalPassedSessions = totalSessions;

  // Calculate total time (duration is in seconds) - only for completed exercises
  const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  // Calculate average score - only for completed exercises
  const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
  const averageScore = totalSessions > 0 ? totalScore / totalSessions : 0;

  const resultsByExercise = results.reduce((acc, result) => {
    if (!acc[result.exerciseId]) {
      acc[result.exerciseId] = [];
    }
    acc[result.exerciseId].push(result);
    return acc;
  }, {});

  const passedSessionsByExercise = {};
  Object.entries(resultsByExercise).forEach(([exerciseId, exerciseResults]) => {
    passedSessionsByExercise[exerciseId] = exerciseResults.length; // all completed
  });

  return {
    totalSessions,
    totalPassedSessions,
    passedSessionsByExercise,
    totalTime,
    averageScore,
  };
};

// Pass/fail removed (BU 2026-06). Status is now incomplete|completed.
// Session completion: updateSessionStats (completedCount >= requiredCount).

module.exports = {
  // New functions
  startExercise,
  pauseExercise,
  trackInactivity,
  completeExercise,
  isExecutionTimedOut,
  getExecutionDurationLimitSeconds,
  updateSessionStats,
  resolveAssignmentDifficultyLevel,
  isValidExerciseState, // Export validation function
  // Existing functions
  createExerciseResult,
  queryExerciseResults,
  getExerciseResultById,
  getExerciseResultByCode,
  updateExerciseResultById,
  deleteExerciseResultById,
  deleteExerciseResultByIds,
  getLatestResultForExerciseAssignment,
  getLatestResultsForExerciseAssignment,
  getResultsSummaryByPatient,
};
