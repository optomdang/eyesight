const express = require('express');
const auth = require('../../middlewares/auth');
const injectData = require('../../middlewares/injectData');
const {
  getExerciseStatistics,
  getExamStatistics,
  getPatientComplianceStats,
  getPatientDashboardStats,
  getInactivePatientsData,
  getPatientCorrelationData,
  getAgeCorrelationData,
} = require('../../controllers/dashboard/dashboard.controller');

const router = express.Router();

/**
 * @route   GET /api/v1/dashboard/exercise-stats
 * @desc    Get exercise statistics and trends for the center
 * @access  Private (requires readReport permission)
 * @query   startDate {string} - Start date (YYYY-MM-DD)
 * @query   endDate {string} - End date (YYYY-MM-DD)
 * @query   page {number} - Page number (default: 1)
 * @query   limit {number} - Results per page (default: 10)
 * @query   centerId {number} - Injected by middleware from user
 */
router.get('/exercise-stats', auth(), injectData('query'), getExerciseStatistics);

/**
 * @route   GET /api/v1/dashboard/exam-stats
 * @desc    Get exam statistics and trends for the center
 * @access  Private (requires readReport permission)
 * @query   startDate {string} - Start date (YYYY-MM-DD)
 * @query   endDate {string} - End date (YYYY-MM-DD)
 * @query   page {number} - Page number (default: 1)
 * @query   limit {number} - Results per page (default: 10)
 * @query   centerId {number} - Injected by middleware from user
 */
router.get('/exam-stats', auth(), injectData('query'), getExamStatistics);

/**
 * @route   GET /api/v1/dashboard/patient-compliance
 * @desc    Get patient compliance/adherence statistics for the center
 * @access  Private (requires readReport permission)
 * @query   startDate {string} - Start date (YYYY-MM-DD)
 * @query   endDate {string} - End date (YYYY-MM-DD)
 * @query   page {number} - Page number (default: 1)
 * @query   limit {number} - Results per page (default: 10)
 * @query   centerId {number} - Injected by middleware from user
 */
router.get('/patient-compliance', auth(), injectData('query'), getPatientComplianceStats);

/**
 * @route   GET /api/v1/dashboard/patient-stats
 * @desc    Get comprehensive patient statistics for Dashboard
 * @access  Private (requires readReport permission)
 * @query   visionType {string} - Vision type for improvement stats: 'far', 'near', 'contrast', 'stereopsis' (default: 'far')
 * @query   inactiveDays {number} - Days threshold for inactive patients: 3, 7, 14, 30, 90 (default: 7)
 * @query   trendDays {number} - Number of days for activity trend (default: 30)
 * @query   centerId {number} - Injected by middleware from user
 */
router.get('/patient-stats', auth(), injectData('query'), getPatientDashboardStats);

/**
 * @route   GET /api/v1/dashboard/inactive-patients
 * @desc    Get paginated list of inactive patients
 * @access  Private (requires readReport permission)
 * @query   inactiveDays {number} - Days threshold: 3, 7, 14, 30, 90 (default: 7)
 * @query   page {number} - Page number (default: 1)
 * @query   limit {number} - Results per page (default: 10)
 * @query   centerId {number} - Injected by middleware from user
 */
router.get('/inactive-patients', auth(), injectData('query'), getInactivePatientsData);

/**
 * @route   GET /api/v1/dashboard/patient-correlation
 * @desc    Get patient training time and vision level correlation data
 * @access  Private (requires readReport permission)
 * @query   visionType {string} - Vision type: 'far', 'near', 'contrast', 'stereopsis' (default: 'far')
 * @query   days {number} - Number of days to look back: 7, 30, 90, 365 (default: 30)
 * @query   centerId {number} - Injected by middleware from user
 */
router.get('/patient-correlation', auth(), injectData('query'), getPatientCorrelationData);

router.get('/age-correlation', auth(), injectData('query'), getAgeCorrelationData);

module.exports = router;
