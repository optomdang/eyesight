const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class ExamMetric extends Model {
  static async isDuplicateMetric(examResultId, examType, excludeMetricId) {
    const whereClause = { examResultId, examType };
    if (excludeMetricId !== undefined && excludeMetricId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeMetricId) };
    }
    const metric = await this.findOne({ where: whereClause });
    return !!metric;
  }
}

ExamMetric.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    examResultId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    examSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    examType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    rightEyeLevel: {
      type: DataTypes.STRING(50),
    },
    leftEyeLevel: {
      type: DataTypes.STRING(50),
    },
    stereopsisLevel: {
      type: DataTypes.STRING(50),
    },
    averageResponseTime: {
      type: DataTypes.INTEGER,
    },
    correctAnswersCount: {
      type: DataTypes.INTEGER,
    },
    totalQuestionsCount: {
      type: DataTypes.INTEGER,
    },
    contrastSensitivity: {
      type: DataTypes.FLOAT,
    },
    previousScore: {
      type: DataTypes.STRING(50),
    },
    scoreChange: {
      type: DataTypes.FLOAT,
    },
    additionalMetrics: {
      type: DataTypes.JSONB,
    },
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ExamMetric',
    tableName: 'ExamMetrics',
    timestamps: true,
    indexes: [
      {
        name: 'idx_exam_metrics_patient_exam_created',
        fields: ['patientId', 'examType', 'createdAt'],
      },
    ],
  }
);

module.exports = ExamMetric;
