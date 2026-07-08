/**
 * Exercise Compliance Controller
 * Handles frequency-based compliance tracking and notifications
 */

const _httpStatus = require('http-status');
const _ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const pick = require('../../utils/pick');
const { exerciseComplianceService } = require('../../services');

/**
 * Get compliance summary for dashboard
 * GET /compliance/summary
 */
const getComplianceSummary = catchAsync(async (req, res) => {
  const { centerId } = req.user;
  const dateRange = pick(req.query, ['startDate', 'endDate']);

  const summary = await exerciseComplianceService.getComplianceSummary([centerId], dateRange);

  res.json({
    message: 'Compliance summary retrieved successfully',
    data: summary,
  });
});

/**
 * Get overdue assignments
 * GET /compliance/overdue
 */
const getOverdueAssignments = catchAsync(async (req, res) => {
  const { centerId } = req.user;
  const filter = pick(req.query, ['limit', 'page']);

  const overdueAssignments = await exerciseComplianceService.getOverdueAssignments([centerId]);

  // Apply pagination if requested
  const { limit = 10, page = 1 } = filter;
  const offset = (page - 1) * limit;
  const paginatedResults = overdueAssignments.slice(offset, offset + limit);

  res.json({
    message: 'Overdue assignments retrieved successfully',
    data: {
      results: paginatedResults,
      count: overdueAssignments.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(overdueAssignments.length / limit),
    },
  });
});

/**
 * Update all compliance statuses
 * POST /compliance/update-all
 */
const updateAllCompliance = catchAsync(async (req, res) => {
  const { centerId } = req.user;

  const results = await exerciseComplianceService.updateAllComplianceStatuses([centerId]);

  res.json({
    message: 'Compliance statuses updated successfully',
    data: results,
  });
});

/**
 * Send compliance reminders
 * POST /compliance/send-reminders
 */
const sendReminders = catchAsync(async (req, res) => {
  const { centerId } = req.user;
  const options = pick(req.body, ['maxNotifications', 'notificationInterval', 'dryRun']);

  const results = await exerciseComplianceService.sendComplianceReminders([centerId], options);

  res.json({
    message: 'Compliance reminders processed successfully',
    data: results,
  });
});

/**
 * Pause assignment
 * POST /compliance/assignments/:assignmentId/pause
 */
const pauseAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const pauseData = pick(req.body, ['reason']);

  pauseData.updatedBy = req.body.updatedBy || req.user.id;
  const assignment = await exerciseComplianceService.pauseAssignment(assignmentId, pauseData);

  res.json({
    message: 'Assignment paused successfully',
    data: assignment,
  });
});

/**
 * Resume paused assignment
 * POST /compliance/assignments/:assignmentId/resume
 */
const resumeAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  const assignment = await exerciseComplianceService.resumeAssignment(assignmentId, {
    updatedBy: req.body.updatedBy || req.user.id,
  });

  res.json({
    message: 'Assignment resumed successfully',
    data: assignment,
  });
});

/**
 * Update assignment compliance status
 * POST /compliance/assignments/:assignmentId/update-status
 */
const updateAssignmentCompliance = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;

  const assignment = await exerciseComplianceService.updateComplianceStatus(assignmentId);

  res.json({
    message: 'Assignment compliance status updated successfully',
    data: assignment,
  });
});

/**
 * Get compliance analytics
 * GET /compliance/analytics
 */
const getComplianceAnalytics = catchAsync(async (req, res) => {
  const { centerId } = req.user;
  const dateRange = pick(req.query, ['startDate', 'endDate']);

  // Get compliance summary with more detailed breakdown
  const summary = await exerciseComplianceService.getComplianceSummary([centerId], dateRange);
  const overdueAssignments = await exerciseComplianceService.getOverdueAssignments([centerId]);

  // Calculate additional analytics
  const analytics = {
    ...summary,
    overdueCount: overdueAssignments.length,
    criticalOverdue: overdueAssignments.filter((assignment) => {
      const daysPastDue = assignment.nextDueDate
        ? Math.ceil((new Date() - new Date(assignment.nextDueDate)) / (1000 * 60 * 60 * 24))
        : 0;
      return daysPastDue >= 7; // Critical if overdue by 7+ days
    }).length,
    averageNotificationsPerAssignment:
      overdueAssignments.length > 0
        ? (overdueAssignments.reduce((sum, a) => sum + (a.notificationCount || 0), 0) / overdueAssignments.length).toFixed(2)
        : 0,
  };

  res.json({
    message: 'Compliance analytics retrieved successfully',
    data: analytics,
  });
});

module.exports = {
  getComplianceSummary,
  getOverdueAssignments,
  updateAllCompliance,
  sendReminders,
  pauseAssignment,
  resumeAssignment,
  updateAssignmentCompliance,
  getComplianceAnalytics,
};
