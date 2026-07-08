const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class ScheduleHistory extends Model {}

ScheduleHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    jobCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Job code: all, exam.createSessions, exam.sendReminders, exercise.createSessions, etc.',
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'partial'),
      allowNull: false,
      defaultValue: 'success',
      comment: 'Overall job execution status',
    },
    ranAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when job was executed',
    },
    executionTime: {
      type: DataTypes.INTEGER,
      comment: 'Execution time in milliseconds',
    },
    results: {
      type: DataTypes.JSONB,
      comment: 'Detailed results from job execution',
    },
    error: {
      type: DataTypes.TEXT,
      comment: 'Error message if job failed',
    },
    triggeredBy: {
      type: DataTypes.STRING(50),
      defaultValue: 'manual',
      comment: 'How job was triggered: manual, cron, api',
    },
    userId: {
      type: DataTypes.INTEGER,
      comment: 'User ID if triggered manually via API',
    },
    metadata: {
      type: DataTypes.JSONB,
      comment: 'Additional metadata (IP, user agent, etc.)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'ScheduleHistory',
    tableName: 'ScheduleHistories',
    timestamps: false, // Only createdAt, no updatedAt
    indexes: [{ fields: ['jobCode'] }, { fields: ['status'] }, { fields: ['ranAt'] }, { fields: ['userId'] }],
  }
);

module.exports = ScheduleHistory;
