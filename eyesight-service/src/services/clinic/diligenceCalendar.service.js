/**
 * Patient daily diligence calendar (warranty tab).
 *
 * Day color (display only — does NOT inflate the day's %):
 * - complete (blue): exercise actualSec/assignedSec >= 80% AND all daily-frequency exams that day completed
 * - partial (yellow): login and/or activity, but not complete
 * - none: no login and no activity
 *
 * Overall % = trung bình cộng completionPct các ngày có nhiệm vụ (giữ nguyên 86%, không làm tròn lên 100% vì ≥80%).
 * Weekly/monthly/quarterly exams do NOT affect day color.
 * Admin override to complete also completes that day's daily sessions (option B).
 */

const httpStatus = require('http-status');
const moment = require('moment');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const { sequelize } = require('../../config/db');
const { generateCode } = require('../../utils/common');
const {
  Patient,
  User,
  ExerciseAssignment,
  ExerciseConfig,
  ExerciseSession,
  ExamAssignment,
  ExamSession,
  AuditLog,
} = require('../../models');
const { recordSessionCompletion } = require('../exercise/exerciseSessionCompletion.service');
const { recalculatePatientComplianceByType } = require('./compliance.service');
const auditLogService = require('../system/auditLog.service');

const VN_UTC_OFFSET_MINUTES = 7 * 60;
const EXERCISE_COMPLETE_THRESHOLD = 0.8;
const EXAM_TYPES = ['far', 'near', 'contrast', 'stereopsis'];
/** Overall completion on the diligence calendar / portal summary. */
const COMPLETION_FORMULA_DAILY_AVG = 'daily-avg';

const toDateKey = (value) => moment(value).utcOffset(VN_UTC_OFFSET_MINUTES).format('YYYY-MM-DD');

const parseMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tháng không hợp lệ (YYYY-MM)');
  }
  const start = moment(`${month}-01`).utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day');
  if (!start.isValid()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tháng không hợp lệ (YYYY-MM)');
  }
  const end = start.clone().endOf('month');
  return { month, start, end, startDate: start.toDate(), endDate: end.toDate() };
};

const parseDateKey = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Ngày không hợp lệ (YYYY-MM-DD)');
  }
  const day = moment(dateKey).utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day');
  if (!day.isValid() || day.format('YYYY-MM-DD') !== dateKey) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Ngày không hợp lệ (YYYY-MM-DD)');
  }
  return day;
};

/**
 * Pure helper — exported for unit tests.
 */
const computeDayStatus = ({
  assignedSec,
  actualSec,
  dailyExamRequired,
  dailyExamCompleted,
  hasLogin,
  overriddenComplete,
}) => {
  if (overriddenComplete) return 'complete';

  const hasDuty = assignedSec > 0 || dailyExamRequired > 0;
  const hasActivity = actualSec > 0 || dailyExamCompleted > 0;
  if (!hasDuty && !hasActivity && !hasLogin) return 'none';

  const exerciseOk =
    assignedSec <= 0 ? true : actualSec / assignedSec >= EXERCISE_COMPLETE_THRESHOLD;
  const examsOk = dailyExamRequired <= 0 || dailyExamCompleted >= dailyExamRequired;

  if (exerciseOk && examsOk && (hasDuty || hasActivity)) return 'complete';
  // Yellow only when the patient actually showed up (login/activity) but didn't finish.
  // A day with assigned duty but zero presence stays gray.
  if (hasLogin || hasActivity) return 'partial';
  return 'none';
};

/**
 * Trung bình cộng % từng ngày có nhiệm vụ.
 * Giữ nguyên completionPct thực tế (86% vẫn là 86%) — ngưỡng 80% chỉ ảnh hưởng màu ô lịch.
 * @param {Array<{ date: string, completionPct: number, assignedSec: number, dailyExamRequired: number, overridden?: boolean }>} days
 * @param {string} [todayKey] YYYY-MM-DD — bỏ qua ngày tương lai
 */
const averageDailyCompletionPct = (days, todayKey = toDateKey(new Date())) => {
  const countable = (days || []).filter((d) => {
    if (!d?.date || d.date > todayKey) return false;
    return (d.assignedSec || 0) > 0 || (d.dailyExamRequired || 0) > 0 || Boolean(d.overridden);
  });
  if (countable.length === 0) return 0;
  const sum = countable.reduce((acc, d) => acc + (Number(d.completionPct) || 0), 0);
  return Math.round((sum / countable.length) * 10) / 10;
};

const loadDailyExerciseAssignments = async (patientId) =>
  ExerciseAssignment.findAll({
    where: {
      patientId,
      status: { [Op.in]: ['active', 'on_track', 'overdue', 'completed'] },
    },
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        required: true,
        where: { frequency: 'daily', deleted: false },
      },
    ],
  });

const loadDailyExamAssignments = async (patientId) =>
  ExamAssignment.findAll({
    where: {
      patientId,
      isEnabled: true,
      frequency: 'daily',
    },
  });

const resolveOverallStart = (patient, dailyExerciseAssignments, dailyExamAssignments, fallbackStart) => {
  const candidates = [];
  if (patient.activeFrom) {
    candidates.push(moment(patient.activeFrom).utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day'));
  }
  (dailyExerciseAssignments || []).forEach((a) => {
    if (a.assignedAt) {
      candidates.push(moment(a.assignedAt).utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day'));
    }
  });
  (dailyExamAssignments || []).forEach((a) => {
    if (a.createdAt) {
      candidates.push(moment(a.createdAt).utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day'));
    }
  });
  if (!candidates.length) return fallbackStart.clone().startOf('day');
  return moment.min(candidates);
};

/**
 * Build diligence day rows for an inclusive VN date range.
 */
const buildDiligenceDaysForRange = async (patient, start, end) => {
  const patientId = patient.id;
  const userId = patient.userId;
  const overrides = patient.diligenceDayOverrides || {};
  const startDate = start.toDate();
  const endDate = end.toDate();

  const dailyExerciseAssignments = await loadDailyExerciseAssignments(patientId);
  const dailyAssignmentIds = dailyExerciseAssignments.map((a) => a.id);

  const [dailyExamAssignments, exerciseSessions, exerciseDurations, examSessions, loginRows] =
    await Promise.all([
      loadDailyExamAssignments(patientId),
      dailyAssignmentIds.length
        ? ExerciseSession.findAll({
            where: {
              patientId,
              deleted: false,
              exerciseAssignmentId: { [Op.in]: dailyAssignmentIds },
              startedAt: { [Op.between]: [startDate, endDate] },
            },
          })
        : Promise.resolve([]),
      sequelize.query(
        `
        SELECT TO_CHAR(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
               COALESCE(SUM(duration), 0)::int AS "actualSec"
        FROM "ExerciseResults"
        WHERE "patientId" = :patientId
          AND deleted = false
          AND "createdAt" >= :startDate
          AND "createdAt" <= :endDate
        GROUP BY 1
        `,
        {
          replacements: { patientId, startDate, endDate },
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      ExamSession.findAll({
        where: {
          patientId,
          deleted: false,
          scheduledDate: {
            [Op.between]: [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')],
          },
        },
      }),
      userId
        ? AuditLog.findAll({
            where: {
              action: 'auth.login',
              status: 'success',
              actorUserId: userId,
              occurredAt: { [Op.between]: [startDate, endDate] },
            },
            attributes: ['occurredAt'],
          })
        : Promise.resolve([]),
    ]);

  const actualByDay = new Map();
  exerciseDurations.forEach((row) => {
    actualByDay.set(row.day, Number(row.actualSec) || 0);
  });

  const loginDays = new Set(loginRows.map((r) => toDateKey(r.occurredAt)));

  const assignedByDay = new Map();
  exerciseSessions.forEach((session) => {
    const day = toDateKey(session.startedAt);
    const count = Number(session.executionCount) || 1;
    const minutes = parseFloat(session.executionDuration) || 0;
    const assignedSec = Math.round(count * minutes * 60);
    assignedByDay.set(day, (assignedByDay.get(day) || 0) + assignedSec);
  });

  const todayKey = toDateKey(new Date());
  const fallbackAssignedSec = dailyExerciseAssignments.reduce((sum, a) => {
    const cfg = a.exerciseConfig;
    const count = Number(cfg?.executionCount) || 1;
    const minutes = parseFloat(cfg?.duration) || 0;
    return sum + Math.round(count * minutes * 60);
  }, 0);

  const dailyExamTypes = dailyExamAssignments.map((a) => a.examType);
  const examsByDay = new Map();
  examSessions.forEach((session) => {
    if (!dailyExamTypes.includes(session.examType)) return;
    const day =
      typeof session.scheduledDate === 'string'
        ? session.scheduledDate.slice(0, 10)
        : toDateKey(session.scheduledDate);
    if (!examsByDay.has(day)) examsByDay.set(day, []);
    examsByDay.get(day).push(session);
  });

  const days = [];
  const cursor = start.clone().startOf('day');
  const rangeEnd = end.clone().startOf('day');
  while (cursor.isBefore(rangeEnd, 'day') || cursor.isSame(rangeEnd, 'day')) {
    const date = cursor.format('YYYY-MM-DD');
    const override = overrides[date] || null;
    const overriddenComplete = override?.status === 'complete';

    let assignedSec = assignedByDay.get(date) || 0;
    if (assignedSec === 0 && fallbackAssignedSec > 0 && date <= todayKey) {
      const activeThatDay = dailyExerciseAssignments.some((a) => {
        const assignedAt = a.assignedAt ? toDateKey(a.assignedAt) : null;
        return !assignedAt || assignedAt <= date;
      });
      if (activeThatDay) assignedSec = fallbackAssignedSec;
    }

    const actualSec = actualByDay.get(date) || 0;
    const dayExams = examsByDay.get(date) || [];
    const dailyExamRequired = date <= todayKey ? dailyExamTypes.length : dayExams.length;
    const dailyExamCompleted = dailyExamTypes.filter((type) =>
      dayExams.some((s) => s.examType === type && s.status === 'completed')
    ).length;

    const hasLogin = loginDays.has(date);
    const status = computeDayStatus({
      assignedSec,
      actualSec,
      dailyExamRequired,
      dailyExamCompleted,
      hasLogin,
      overriddenComplete,
    });

    // Keep the real day % (e.g. 86). The 80% threshold only drives status color.
    let completionPct = 0;
    if (overriddenComplete) {
      completionPct = 100;
    } else if (assignedSec > 0) {
      completionPct = Math.min(100, Math.round((actualSec / assignedSec) * 100));
    } else if (dailyExamRequired > 0) {
      completionPct = Math.round((dailyExamCompleted / dailyExamRequired) * 100);
    } else if (actualSec > 0) {
      completionPct = 100;
    }

    days.push({
      date,
      status,
      completionPct: overriddenComplete ? 100 : completionPct,
      assignedSec,
      actualSec: overriddenComplete ? Math.max(actualSec, assignedSec) : actualSec,
      hasLogin,
      dailyExamRequired,
      dailyExamCompleted: overriddenComplete ? dailyExamRequired : dailyExamCompleted,
      overridden: Boolean(override),
      override: override
        ? {
            status: override.status,
            reason: override.reason || null,
            overriddenBy: override.overriddenBy || null,
            overriddenAt: override.overriddenAt || null,
          }
        : null,
    });

    cursor.add(1, 'day');
  }

  return {
    days,
    dailyExerciseAssignments,
    dailyExamAssignments,
  };
};

/**
 * % hoàn thành tổng = TB các ngày có nhiệm vụ (actual day %, không nâng ≥80% → 100%).
 */
const getPatientDailyAverageCompletionPct = async (patientId) => {
  const id = Number(patientId);
  if (!Number.isFinite(id) || id <= 0) return 0;

  const patient = await Patient.findOne({
    where: { id, deleted: false },
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'name'] }],
  });
  if (!patient) return 0;

  const today = moment().utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day');
  const todayKey = today.format('YYYY-MM-DD');
  const [dailyExerciseAssignments, dailyExamAssignments] = await Promise.all([
    loadDailyExerciseAssignments(id),
    loadDailyExamAssignments(id),
  ]);
  const overallStart = resolveOverallStart(
    patient,
    dailyExerciseAssignments,
    dailyExamAssignments,
    today
  );
  if (overallStart.isAfter(today, 'day')) return 0;

  const { days } = await buildDiligenceDaysForRange(patient, overallStart, today);
  return averageDailyCompletionPct(days, todayKey);
};

const assertPatientAccess = async (patientId, actor) => {
  const patient = await Patient.findOne({
    where: { id: patientId, deleted: false },
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'name'] }],
  });
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');
  }
  // Patient may only view their own calendar
  if (actor?.userType === 'patient') {
    if (patient.userId !== actor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập bệnh nhân này');
    }
    return patient;
  }
  if (actor?.centerId != null && patient.centerId !== actor.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập bệnh nhân này');
  }
  if (actor?.userType === 'doctor') {
    const doctorId = actor.doctor?.id;
    if (!doctorId || patient.doctorId !== doctorId) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền truy cập bệnh nhân này');
    }
  }
  return patient;
};

const getMonthCalendar = async (patientId, month, actor) => {
  const { start, end } = parseMonth(month);
  const patient = await assertPatientAccess(patientId, actor);
  const today = moment().utcOffset(VN_UTC_OFFSET_MINUTES).startOf('day');
  const todayKey = today.format('YYYY-MM-DD');

  const [dailyExerciseAssignments, dailyExamAssignments] = await Promise.all([
    loadDailyExerciseAssignments(patient.id),
    loadDailyExamAssignments(patient.id),
  ]);
  const overallStart = resolveOverallStart(
    patient,
    dailyExerciseAssignments,
    dailyExamAssignments,
    start
  );

  // One pass covering both the viewed month and the overall window (activeFrom → today).
  const rangeStart = moment.min(start.clone().startOf('day'), overallStart);
  const rangeEnd = moment.max(end.clone().startOf('day'), today);
  const { days: allDays } = await buildDiligenceDaysForRange(patient, rangeStart, rangeEnd);

  const monthPrefix = `${month}-`;
  const days = allDays.filter((d) => d.date.startsWith(monthPrefix));

  return {
    month,
    patientId: patient.id,
    thresholdPct: EXERCISE_COMPLETE_THRESHOLD * 100,
    completionFormula: COMPLETION_FORMULA_DAILY_AVG,
    overallCompletionPct: averageDailyCompletionPct(allDays, todayKey),
    days,
  };
};

const overrideDayComplete = async (patientId, dateKey, { reason, actor }) => {
  const day = parseDateKey(dateKey);
  const patient = await assertPatientAccess(patientId, actor);

  if (actor?.userType !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Chỉ admin được chỉnh sửa ngày tuân thủ');
  }

  const dayStart = day.clone().startOf('day').toDate();
  const dayEnd = day.clone().endOf('day').toDate();
  const dateStr = day.format('YYYY-MM-DD');
  const now = new Date();

  const dailyExerciseAssignments = await loadDailyExerciseAssignments(patientId);
  const dailyAssignmentIds = dailyExerciseAssignments.map((a) => a.id);

  const transaction = await sequelize.transaction();
  const newlyCompletedAssignmentIds = [];
  const touchedExamTypes = new Set();

  try {
    if (dailyAssignmentIds.length) {
      const exerciseSessions = await ExerciseSession.findAll({
        where: {
          patientId,
          deleted: false,
          exerciseAssignmentId: { [Op.in]: dailyAssignmentIds },
          startedAt: { [Op.between]: [dayStart, dayEnd] },
          status: { [Op.ne]: 'completed' },
        },
        transaction,
      });

      for (const session of exerciseSessions) {
        const required = Number(session.executionCount) || 1;
        const minutes = parseFloat(session.executionDuration) || 0;
        const assignedSec = Math.round(required * minutes * 60);

        await session.update(
          {
            status: 'completed',
            executionsCompleted: required,
            validExecutions: required,
            validityPercentage: 100,
            duration: Math.max(Number(session.duration) || 0, assignedSec),
            focusScore: 100,
            completedAt: now,
            endedAt: now,
          },
          { transaction }
        );
        if (session.exerciseAssignmentId) {
          newlyCompletedAssignmentIds.push(session.exerciseAssignmentId);
        }
      }
    }

    const dailyExamAssignments = await ExamAssignment.findAll({
      where: { patientId, isEnabled: true, frequency: 'daily' },
      transaction,
    });

    for (const assignment of dailyExamAssignments) {
      let session = await ExamSession.findOne({
        where: {
          patientId,
          examType: assignment.examType,
          scheduledDate: dateStr,
          deleted: false,
        },
        transaction,
      });

      if (!session) {
        session = await ExamSession.create(
          {
            code: generateCode('ES'),
            patientId,
            centerId: patient.centerId,
            examType: assignment.examType,
            scheduledDate: dateStr,
            status: 'completed',
            startedAt: dayStart,
            completedAt: now,
            endedAt: now,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          { transaction }
        );
      } else if (session.status !== 'completed') {
        await session.update(
          {
            status: 'completed',
            completedAt: now,
            endedAt: now,
            updatedBy: actor.id,
          },
          { transaction }
        );
      }
      touchedExamTypes.add(assignment.examType);
    }

    const nextOverrides = {
      ...(patient.diligenceDayOverrides || {}),
      [dateStr]: {
        status: 'complete',
        reason: reason || 'Admin xác nhận hoàn thành (lỗi hệ thống / ngoại lệ)',
        overriddenBy: actor.id,
        overriddenAt: now.toISOString(),
      },
    };
    await patient.update(
      { diligenceDayOverrides: nextOverrides, updatedBy: actor.id },
      { transaction }
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  for (const assignmentId of newlyCompletedAssignmentIds) {
    // eslint-disable-next-line no-await-in-loop
    await recordSessionCompletion(assignmentId, { completedAt: now }).catch(() => {});
  }

  const examTypesToRecalc = touchedExamTypes.size ? [...touchedExamTypes] : [];
  for (const examType of examTypesToRecalc) {
    // eslint-disable-next-line no-await-in-loop
    await recalculatePatientComplianceByType(patientId, examType).catch(() => {});
  }

  await auditLogService.logEntityAuditEvent({
    user: actor,
    requestContext: {},
    action: 'patient.diligenceDay.overrideComplete',
    entityType: 'patient',
    entityId: patientId,
    metadata: { date: dateStr, reason: reason || null },
  });

  const calendar = await getMonthCalendar(patientId, dateStr.slice(0, 7), actor);
  return {
    date: dateStr,
    day: calendar.days.find((d) => d.date === dateStr) || null,
    calendar,
  };
};

module.exports = {
  getMonthCalendar,
  overrideDayComplete,
  getPatientDailyAverageCompletionPct,
  computeDayStatus,
  averageDailyCompletionPct,
  toDateKey,
  EXERCISE_COMPLETE_THRESHOLD,
  COMPLETION_FORMULA_DAILY_AVG,
  EXAM_TYPES,
};
