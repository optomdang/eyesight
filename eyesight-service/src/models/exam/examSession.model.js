const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class ExamSession extends Model {
  /**
   * Check if an exam session code is duplicate within a center
   * @param {string} code - Session code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeSessionId - Session ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeSessionId) {
    const whereClause = { code, centerId };
    if (excludeSessionId !== undefined && excludeSessionId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeSessionId) };
    }
    const session = await this.findOne({ where: whereClause });
    return !!session;
  }
}

ExamSession.init(
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
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    doctorId: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'incomplete',
      comment: 'Session status: incomplete (scheduled/in progress), completed (exam finished)',
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      comment: 'Date when the exam is scheduled',
    },
    examType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Type of exam for this session - required for individual exam sessions',
    },
    startedAt: {
      type: DataTypes.DATE,
    },
    endedAt: {
      type: DataTypes.DATE,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
    notes: {
      type: DataTypes.TEXT,
    },
    deviceInfo: {
      type: DataTypes.JSONB,
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
  },
  {
    sequelize,
    modelName: 'ExamSession',
    tableName: 'ExamSessions',
    timestamps: true,
    indexes: [
      {
        name: 'idx_exam_sessions_code',
        fields: ['code'],
        unique: true,
      },
      {
        name: 'idx_exam_sessions_patient_exam_status',
        fields: ['patientId', 'examType', 'status'],
      },
      {
        name: 'idx_exam_sessions_center_deleted',
        fields: ['centerId', 'deleted'],
      },
      {
        name: 'idx_exam_sessions_scheduled_date',
        fields: ['scheduledDate'],
      },
      {
        name: 'idx_exam_sessions_doctor',
        fields: ['doctorId'],
      },
      {
        name: 'idx_exam_sessions_status',
        fields: ['status'],
      },
      // Additional performance indexes
      {
        name: 'idx_exam_sessions_patient_scheduled',
        fields: ['patientId', 'scheduledDate', 'deleted'], // For cycle queries
      },
      {
        name: 'idx_exam_sessions_exam_type_center',
        fields: ['examType', 'centerId', 'deleted'], // For exam type filtering
      },
      {
        name: 'idx_exam_sessions_created_center',
        fields: ['createdAt', 'centerId'], // For default sorting with multi-tenant
      },
    ],
  }
);

module.exports = ExamSession;
