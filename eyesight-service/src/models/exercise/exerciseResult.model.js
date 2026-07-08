const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

/**
 * ExerciseResult Model
 *
 * Stores individual exercise execution results for patients.
 * Supports pause/resume with exerciseState and audit trail with exerciseConfig snapshot.
 *
 * Status values (post-D1: pass/fail removed):
 * - 'incomplete': Exercise started but not finished (paused, abandoned, in progress)
 * - 'completed': Exercise finished (no pass/fail judgement)
 */
class ExerciseResult extends Model {}

ExerciseResult.init(
  {
    // === PRIMARY KEY ===
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // === FOREIGN KEYS ===
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    exerciseSessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Link to ExerciseSession for frequency tracking',
    },
    exerciseAssignmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Link to ExerciseAssignment for modern architecture',
    },
    exerciseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // === STATUS (replaces completed + passedLevel) ===
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'incomplete',
      allowNull: false,
      comment: 'Exercise completion status: incomplete (in progress/paused) or completed',
    },

    // === METRICS ===
    level: {
      type: DataTypes.INTEGER,
      comment: 'Visual difficulty level at which the exercise was performed',
    },
    score: {
      type: DataTypes.INTEGER,
      comment: 'Score achieved in the exercise',
    },
    duration: {
      type: DataTypes.INTEGER,
      comment: 'Duration of the exercise in seconds',
    },
    movesCount: {
      type: DataTypes.INTEGER,
      comment: 'Number of moves or interactions made in the exercise',
    },
    accuracy: {
      type: DataTypes.FLOAT,
      comment: 'Accuracy of interactions (0-1)',
    },

    // === FOCUS TRACKING (cumulative from session start up to this execution) ===
    pauseCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cumulative pause count from session start up to this execution',
    },
    inactivityCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cumulative inactivity count from session start up to this execution',
    },
    focusScore: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      comment:
        'Cumulative focus score at this point: max(0, 100 - pauseCount - inactivityCount). Only the last result in a session reflects the final session-level value.',
    },

    // === GAME STATE (for pause/resume) ===
    exerciseState: {
      type: DataTypes.JSONB,
      comment: 'Saved state of the exercise for resuming (e.g., grid, score for 2048)',
    },

    // === CLINICAL METRICS (permanent, exercise-type specific) ===
    resultMetrics: {
      type: DataTypes.JSONB,
      comment:
        'VT Quest clinical results: per-modality threshold/trials/accuracy. Persisted permanently unlike exerciseState.',
    },

    // === CONFIG SNAPSHOT (audit trail) ===
    exerciseConfig: {
      type: DataTypes.JSONB,
      comment: 'Snapshot of exercise config at start time for audit trail',
    },
    visualSettings: {
      type: DataTypes.JSONB,
      comment: 'Visual settings used for this particular exercise session',
    },

    // === TIMESTAMPS ===
    startedAt: {
      type: DataTypes.DATE,
      comment: 'When the exercise was started',
    },
    completedAt: {
      type: DataTypes.DATE,
      comment: 'When the exercise was completed',
    },

    // === METADATA ===
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

    // === REVIEW (kept for future use) ===
    reviewedBy: {
      type: DataTypes.INTEGER,
      comment: 'Doctor who reviewed this result',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      comment: 'When the result was reviewed',
    },
    reviewNotes: {
      type: DataTypes.TEXT,
      comment: 'Notes from doctor review',
    },

    // === SOFT DELETE ===
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    modelName: 'ExerciseResult',
    tableName: 'ExerciseResults',
    timestamps: true,
    indexes: [
      {
        name: 'idx_exerciseresults_patient_created',
        fields: ['patientId', 'createdAt'],
      },
      {
        name: 'idx_exerciseresults_session',
        fields: ['exerciseSessionId'],
      },
      {
        name: 'idx_exerciseresults_assignment',
        fields: ['exerciseAssignmentId'],
      },
      {
        name: 'idx_exerciseresults_status',
        fields: ['status'],
      },
      {
        name: 'idx_exerciseresults_session_status',
        fields: ['exerciseSessionId', 'status'],
      },
      {
        name: 'idx_exerciseresults_center',
        fields: ['centerId'],
      },
    ],
  }
);

module.exports = ExerciseResult;
