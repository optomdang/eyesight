const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');
/**
 * ExerciseAssignment - Junction table for N:N relationship
 * Handles assignment of exercise configurations to patients
 */
class ExerciseAssignment extends Model {
  /**
   * Check if a patient already has this exercise config assigned
   * @param {number} patientId - Patient ID
   * @param {number} exerciseConfigId - Exercise config ID
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeAssignmentId - Assignment ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateAssignment(patientId, exerciseConfigId, centerId, excludeAssignmentId) {
    const whereClause = { patientId, exerciseConfigId, centerId };
    if (excludeAssignmentId !== undefined && excludeAssignmentId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeAssignmentId) };
    }
    const assignment = await this.findOne({ where: whereClause });
    return !!assignment;
  }
}

ExerciseAssignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Patient who is assigned this config',
    },
    exerciseConfigId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Exercise configuration assigned to patient',
    },

    // Assignment metadata
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Doctor/Admin who made the assignment',
    },
    assignedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When the assignment was made',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      comment: 'Current status of the assignment',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Special instructions or notes for this assignment',
    },

    // Progress tracking
    sessionsCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of sessions completed by patient',
    },
    lastSessionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When patient last completed a session',
    },

    // Compliance tracking for frequency-based assignments
    nextDueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next scheduled session date based on frequency',
    },
    complianceStatus: {
      type: DataTypes.STRING(20),
      defaultValue: 'on_track',
      comment: 'Compliance status based on frequency requirements',
    },
    lastNotificationAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When last reminder notification was sent',
    },
    notificationCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of reminder notifications sent',
    },

    // Personal settings
    currentLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Current difficulty level for this patient',
    },
    personalSettings: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Patient-specific visual settings and preferences',
    },
    autoAdjustLevel: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether to automatically adjust difficulty level',
    },

    // Difficulty progression — highest vision level reached in this assignment.
    // Null means never played. Updated by completeExercise.
    lastAchievedVisionLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Highest vision level the patient has achieved in this assignment (null = not yet played)',
    },

    // Patient-specific vision configuration
    visionLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Patient-specific vision level override (1-20 for far, 1-6 for near, 1-16 for contrast)',
    },
    levelOverride: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Whether patient has custom vision level override',
    },
    trainingEye: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Per-patient training eye: right, left, or both. Overrides exerciseConfig.eye when set.',
    },

    // Multi-tenant
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Center this assignment belongs to',
    },
  },
  {
    sequelize,
    modelName: 'ExerciseAssignment',
    tableName: 'ExerciseAssignments',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['patientId', 'exerciseConfigId', 'centerId'],
        name: 'unique_patient_config_assignment',
      },
      {
        fields: ['patientId', 'centerId', 'status'],
      },
      {
        fields: ['exerciseConfigId', 'centerId', 'status'],
      },
      {
        fields: ['assignedBy', 'centerId'],
      },
      // Additional performance indexes
      {
        name: 'idx_exercise_assignments_next_due',
        fields: ['nextDueDate', 'status', 'centerId'], // For compliance tracking
      },
      {
        name: 'idx_exercise_assignments_compliance',
        fields: ['complianceStatus', 'centerId'], // For compliance filtering
      },
      {
        name: 'idx_exercise_assignments_last_session',
        fields: ['lastSessionAt', 'centerId'], // For activity tracking
      },
      {
        name: 'idx_exercise_assignments_created_center',
        fields: ['createdAt', 'centerId'], // For default sorting with multi-tenant
      },
    ],
  }
);

module.exports = ExerciseAssignment;
