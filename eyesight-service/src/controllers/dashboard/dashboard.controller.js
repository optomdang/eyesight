const httpStatus = require('http-status');
const { getExerciseStats, getExerciseDetails } = require('../../services/dashboard/dashboardExercise.service');
const { getExamStats, getExamDetails } = require('../../services/dashboard/dashboardExam.service');
const { getPatientCompliance, getComplianceDetails } = require('../../services/dashboard/dashboardCompliance.service');
const { getPatientStatistics, getInactivePatients } = require('../../services/dashboard/dashboardUser.service');
const { getPatientCorrelation, getAgeCorrelation } = require('../../services/dashboard/dashboardPatient.service');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

/**
 * Get exercise statistics and trends (with compliance)
 * GET /exercise-stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getExerciseStatistics = catchAsync(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 10, centerId } = req.query;
  // centerId from user context (injected by middleware)

  // Validate date parameters
  if (!startDate || !endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date format. Use YYYY-MM-DD');
  }

  // centerId is required - ensure it exists
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }

  // Doctor security: only see their own patients
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }

  // Independent reads — run in parallel to cut latency (each is a separate DB round-trip).
  // Tab 3 KPIs (#19-#23) + phân bổ (#25) + tuân thủ theo loại (#26) đều nằm trong getExerciseStats;
  // #27 ExerciseDetailsTable lấy từ getExerciseDetails.
  const [stats, details] = await Promise.all([
    getExerciseStats(centerId, start, end, doctorId),
    getExerciseDetails(centerId, parseInt(page, 10), parseInt(limit, 10), start, end, doctorId),
  ]);

  res.send({
    stats: {
      kpi: stats.kpi, // #19 inUse*, #20 totalConfigs, #21 timeCompletionRate, #22 countComplianceRate, #23 excellentPatientsCount
      distributionByType: stats.distributionByType, // #25
      complianceByType: stats.complianceByType, // #26
    },
    details,
  });
});

/**
 * Get exam statistics and trends
 * GET /exam-stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getExamStatistics = catchAsync(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 10, centerId, period } = req.query;

  // Validate date parameters
  if (!startDate || !endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date format. Use YYYY-MM-DD');
  }

  // centerId is injected by middleware - ensure it exists
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }

  // Doctor security: only see their own patients
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }

  // Independent reads — run in parallel.
  const [stats, details] = await Promise.all([
    getExamStats(centerId, start, end, doctorId, period), // #17 selector Tuần/Tháng/Quý/Năm
    getExamDetails(centerId, parseInt(page, 10), parseInt(limit, 10), start, end, doctorId),
  ]);

  res.send({
    stats: {
      kpi: stats.kpi,
      trend: stats.trend,
      breakdown: stats.breakdown,
    },
    details,
  });
});

/**
 * Get patient compliance/adherence statistics
 * GET /patient-compliance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getPatientComplianceStats = catchAsync(async (req, res) => {
  const { startDate, endDate, page = 1, limit = 10, centerId } = req.query;

  // Validate date parameters
  if (!startDate || !endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date format. Use YYYY-MM-DD');
  }

  // centerId is injected by middleware - ensure it exists
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }

  // Doctor security: only see their own patients
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }

  // Independent reads — run in parallel.
  const [compliance, details] = await Promise.all([
    getPatientCompliance(centerId, start, end, doctorId),
    getComplianceDetails(centerId, parseInt(page, 10), parseInt(limit, 10), start, end, doctorId),
  ]);

  res.send({
    summary: compliance.summary,
    topPerformers: compliance.topPerformers,
    details,
  });
});

/**
 * Get patient statistics (for Dashboard)
 * GET /user-stats?visionType=far&inactiveDays=7&trendDays=30
 */
const getPatientDashboardStats = catchAsync(async (req, res) => {
  const { centerId, visionType = 'far', inactiveDays = 7, trendDays = 30, causes } = req.query;

  // centerId is injected by middleware
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }

  // Validate visionType
  const validVisionTypes = ['far', 'near', 'contrast', 'stereopsis'];
  if (!validVisionTypes.includes(visionType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid vision type. Must be: far, near, contrast, or stereopsis');
  }

  // Validate inactiveDays
  const validInactiveDays = [3, 7, 14, 30, 90];
  const inactiveDaysNum = parseInt(inactiveDays, 10);
  if (!validInactiveDays.includes(inactiveDaysNum)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid inactiveDays. Must be: 3, 7, 14, 30, or 90');
  }

  // Doctor security: only see their own patients
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }

  // `causes` may arrive as an array (?causes=a&causes=b) or a CSV string (?causes=a,b).
  const normalizeCauses = (raw) => {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };
  const causesArray = normalizeCauses(causes);

  // Get comprehensive patient statistics
  const stats = await getPatientStatistics({
    centerId: parseInt(centerId, 10),
    visionType,
    inactiveDays: inactiveDaysNum,
    trendDays: parseInt(trendDays, 10),
    doctorId,
    causes: causesArray,
  });

  res.send(stats);
});

/**
 * Get inactive patients list
 * GET /inactive-patients?inactiveDays=7&page=1&limit=10
 */
const getInactivePatientsData = catchAsync(async (req, res) => {
  const { centerId, inactiveDays = 7, page = 1, limit = 10 } = req.query;

  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }

  const validInactiveDays = [3, 7, 14, 30, 90];
  const inactiveDaysNum = parseInt(inactiveDays, 10);
  if (!validInactiveDays.includes(inactiveDaysNum)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid inactiveDays. Must be: 3, 7, 14, 30, or 90');
  }

  // Doctor security: only see their own patients
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }

  const result = await getInactivePatients(parseInt(centerId, 10), inactiveDaysNum, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    doctorId,
  });

  res.send(result);
});

/**
 * Get patient training time and vision level correlation data
 * GET /patient-correlation?visionType=far&days=30
 */
const getPatientCorrelationData = catchAsync(async (req, res) => {
  const { centerId, visionType = 'far', days = 30 } = req.query;

  // centerId is injected by middleware
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }

  // Validate visionType
  const validVisionTypes = ['far', 'near', 'contrast', 'stereopsis'];
  if (!validVisionTypes.includes(visionType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid vision type. Must be: far, near, contrast, or stereopsis');
  }

  // Validate days
  const validDays = [7, 30, 90, 365];
  const daysNum = parseInt(days, 10);
  if (!validDays.includes(daysNum)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid days. Must be: 7, 30, 90, or 365');
  }

  // Doctor security: only see their own patients
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }

  // Get correlation data
  const result = await getPatientCorrelation(parseInt(centerId, 10), visionType, daysNum, doctorId);

  res.send(result);
});

const getAgeCorrelationData = catchAsync(async (req, res) => {
  const { centerId } = req.query;
  if (!centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Center ID is required');
  }
  let doctorId = null;
  if (req.user.userType === 'doctor') {
    if (!req.user.doctor || !req.user.doctor.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Không tìm thấy thông tin bác sĩ');
    }
    doctorId = req.user.doctor.id;
  }
  const result = await getAgeCorrelation(parseInt(centerId, 10), doctorId);
  res.send(result);
});

module.exports = {
  getExerciseStatistics,
  getExamStatistics,
  getPatientComplianceStats,
  getPatientDashboardStats,
  getInactivePatientsData,
  getPatientCorrelationData,
  getAgeCorrelationData,
};
