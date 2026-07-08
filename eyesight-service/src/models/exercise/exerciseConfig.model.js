const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class ExerciseConfig extends Model {
  /**
   * Check if an exercise config name is duplicate for a specific exercise within a center
   * @param {number} exerciseId - Exercise ID
   * @param {string} name - Config name to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeExerciseConfigId - ExerciseConfig ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateName(exerciseId, name, centerId, excludeExerciseConfigId) {
    const whereClause = { exerciseId, name, centerId };
    if (excludeExerciseConfigId !== undefined && excludeExerciseConfigId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeExerciseConfigId) };
    }
    const exerciseConfig = await this.findOne({ where: whereClause });
    return !!exerciseConfig;
  }
}

ExerciseConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    exerciseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Foreign key to Exercise',
    },
    configType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Type of config: system (admin), doctor (doctor-created), patient (patient-specific)',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Name of the configuration for easy identification',
    },
    eye: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Eye training: right (MP), left (MT), both (cả hai)',
    },
    distance: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Distance in meters (3.00, 0.40, etc.)',
    },
    duration: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Duration per session in minutes (supports 0.5 increments)',
    },
    frequency: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Frequency period: daily, weekly, monthly, quarterly, yearly',
    },
    executionCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Number of executions per session',
    },
    // Visual Settings
    fontSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 16,
      comment: 'Font size in pixels (8-110)',
    },
    contrast: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 100,
      comment: 'Contrast level (0-100)',
    },
    colorScheme: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: { textColor: '#000000', backgroundColor: '#FFFFFF' },
      comment: 'Color scheme: { textColor: string, backgroundColor: string }',
    },
    // Vision Level Configuration
    visionType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Vision exercise type for level calculation (far/near/contrast)',
    },
    levelOverride: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Use visionLevel as default difficulty when true',
    },
    visionLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Default vision level when levelOverride is true',
    },
    configReferentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Parent template ID for inheritance (renamed from inheritedFrom)',
    },
    inactivityThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30,
      comment: 'Seconds of no game moves before an inactivity event is recorded. Defaults to 30s.',
    },

    // Difficulty progression
    difficultyBaselineSource: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'current_exam',
      comment: "How starting difficulty is determined: 'current_exam' (latest exam result) | 'latest_achieved' (highest level reached in this assignment)",
    },

    // VT Quest game configuration
    vtSettings: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment:
        'VT Quest configuration: modalities, staircase params, stimulus params, gamification theme',
    },

    // Notification Settings - configurable reminder behavior
    notificationSettings: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Notification settings for exercise reminders',
      defaultValue: {
        enabled: true,
        templateId: null, // NotificationTemplate ID to use
        methods: ['email'], // ['email', 'zalo', 'sms']
        maxReminders: 3, // Max number of reminders per overdue assignment
        reminderInterval: 24, // Hours between reminders (24 = once per day)
      },
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
    deletedAt: {
      type: DataTypes.DATE,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ExerciseConfig',
    tableName: 'ExerciseConfigs',
    timestamps: true,
    indexes: [
      // Index for efficient configType queries
      {
        name: 'idx_exercise_config_config_type',
        fields: ['configType'],
      },
      // Composite index for configType + centerId (multi-tenant queries)
      {
        name: 'idx_exercise_config_config_type_center',
        fields: ['configType', 'centerId'],
      },
      // Index for exerciseId queries
      {
        name: 'idx_exercise_config_exercise_id',
        fields: ['exerciseId'],
      },
      // Composite index for exerciseId + centerId
      {
        name: 'idx_exercise_config_exercise_center',
        fields: ['exerciseId', 'centerId'],
      },
    ],
  }
);

module.exports = ExerciseConfig;
