const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class ExamAssignment extends Model {
  static async isDuplicateAssignment(patientId, examType, excludeConfigId) {
    const whereClause = { patientId, examType };
    if (excludeConfigId !== undefined && excludeConfigId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeConfigId) };
    }
    const config = await this.findOne({ where: whereClause });
    return !!config;
  }
}

ExamAssignment.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    patientId: { type: DataTypes.INTEGER, allowNull: false },
    examType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    frequency: {
      type: DataTypes.STRING(20),
      defaultValue: 'weekly',
      allowNull: false,
      comment: 'Frequency of exam schedule: daily, weekly, monthly, quarterly, yearly',
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this exam type is enabled for the patient',
    },
    notificationSettings: {
      type: DataTypes.JSONB,
      defaultValue: {
        enabled: true,
        templateId: null, // NotificationTemplate ID to use
        beforeDays: 1, // Nhắc trước bao nhiêu ngày
        time: '09:00', // HH:mm format
        methods: ['email'], // ['email', 'zalo']
      },
      comment: 'Notification settings for this exam type',
    },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'ExamAssignment',
    tableName: 'ExamAssignments',
    timestamps: true,
    indexes: [
      {
        name: 'unique_patient_exam_type',
        unique: true,
        fields: ['patientId', 'examType'],
      },
      {
        name: 'idx_patient_exam_enabled',
        fields: ['isEnabled', 'frequency'],
      },
    ],
  }
);

module.exports = ExamAssignment;
