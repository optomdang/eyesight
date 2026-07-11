const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class ExerciseSession extends Model {}

ExerciseSession.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    exerciseAssignmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'incomplete',
      comment: 'Session status: incomplete (not done yet), completed (done)',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endedAt: {
      type: DataTypes.DATE,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
    duration: {
      type: DataTypes.INTEGER,
      comment: 'Session duration in seconds',
    },
    // Focus tracking fields
    pauseCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times patient paused during this session',
    },
    inactivityCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of 30-second inactivity events during this session',
    },
    focusScore: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      comment: 'Focus score: 100 - pauseCount - inactivityCount (min 0)',
    },

    // Snapshot độ khó của buổi tập (mức thị lực), server resolve lúc tạo result đầu tiên.
    // NULL nếu bệnh nhân không có exam result và assignment không override.
    visionLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Snapshot độ khó (mức thị lực) lúc thực hiện buổi tập',
    },

    // Snapshot of the assigned target at session-creation time (frozen — không đổi khi config sửa sau).
    // "Số lần được giao" / "thời gian được giao" cho buổi tập này.
    executionCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Số lần được giao trong buổi (snapshot từ ExerciseConfig.executionCount lúc tạo)',
    },
    executionDuration: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Phút/lượt được giao (snapshot từ ExerciseConfig.duration lúc tạo)',
    },

    // Statistics fields for performance optimization
    executionsCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of executions completed in this session',
    },
    validExecutions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of valid executions (passed validation)',
    },
    totalScore: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      comment: 'Total score accumulated in this session',
    },
    averageScore: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Average score per execution in this session',
    },
    bestScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Best score achieved in this session',
    },
    validityPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Percentage of valid executions (validExecutions/executionsCompleted * 100)',
    },
    deviceInfo: {
      type: DataTypes.JSONB,
    },
    dichopticSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Snapshot of DichopticConfig from ExerciseConfig at session start',
    },
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.INTEGER,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    modelName: 'ExerciseSession',
    tableName: 'ExerciseSessions',
    timestamps: true,
    indexes: [
      {
        fields: ['exerciseAssignmentId', 'status'],
      },
      {
        fields: ['patientId', 'startedAt'],
      },
      {
        unique: true,
        fields: ['exerciseAssignmentId', 'startedAt'],
        name: 'unique_exercise_assignment_started_at',
      },
    ],
  }
);

module.exports = ExerciseSession;
