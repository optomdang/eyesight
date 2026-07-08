const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const logger = require('../../config/logger');
const { updatePatientCompliance } = require('../../services/clinic/compliance.service');
const { Patient } = require('../../models');
const { applyCompletedExamToPatientCache, isFull } = require('../../utils/examResultsBackfill');

class ExamResult extends Model {
  /**
   * Check if a result code is duplicate within a center
   * @param {string} code - Result code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeResultId - Result ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeResultId) {
    const whereClause = { code, centerId };
    if (excludeResultId !== undefined && excludeResultId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeResultId) };
    }
    const result = await this.findOne({ where: whereClause });
    return !!result;
  }
}

ExamResult.init(
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
    examSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false, // REQUIRED - all exams must start from session
      comment: 'Link to ExamSession - matches Exercise pattern',
      references: {
        model: 'ExamSessions',
        key: 'id',
      },
    },
    examType: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    rawData: {
      type: DataTypes.JSONB,
    },
    distance: {
      type: DataTypes.FLOAT,
    },
    charType: {
      type: DataTypes.STRING(20),
    },
    accuracy: {
      type: DataTypes.FLOAT,
    },
    leftEyeLevel: {
      type: DataTypes.SMALLINT,
    },
    rightEyeLevel: {
      type: DataTypes.SMALLINT,
    },
    bothEyeLevel: {
      type: DataTypes.SMALLINT,
    },
    leftEyeAccuracy: {
      type: DataTypes.FLOAT,
    },
    rightEyeAccuracy: {
      type: DataTypes.FLOAT,
    },
    bothEyeAccuracy: {
      type: DataTypes.FLOAT,
    },
    startedAt: {
      type: DataTypes.DATE,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reviewedBy: {
      type: DataTypes.INTEGER,
    },
    reviewedAt: {
      type: DataTypes.DATE,
    },
    reviewNotes: {
      type: DataTypes.TEXT,
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
    modelName: 'ExamResult',
    tableName: 'ExamResults',
    timestamps: true,
    indexes: [
      {
        name: 'idx_patient_created',
        fields: ['patientId', 'createdAt'],
      },
      {
        name: 'idx_examresults_status_created',
        fields: ['status', 'createdAt'],
      },
      {
        name: 'idx_examresults_type_status',
        fields: ['examType', 'status'],
      },
      {
        name: 'idx_examresults_patient_type_created',
        fields: ['patientId', 'examType', 'createdAt'],
      },
    ],
    hooks: {
      afterCreate: async (examResult) => {
        try {
          // Update compliance for this patient and exam type
          await updatePatientCompliance(examResult.patientId, examResult);
        } catch (error) {
          logger.error('Error updating compliance after ExamResult creation', {
            examResultId: examResult.id,
            patientId: examResult.patientId,
            error: error.message,
          });
          // Don't throw error to avoid breaking the main operation
        }
      },
      afterUpdate: async (examResult) => {
        try {
          // Update compliance for this patient and exam type
          await updatePatientCompliance(examResult.patientId, examResult);
        } catch (error) {
          logger.error('Error updating compliance after ExamResult update', {
            examResultId: examResult.id,
            patientId: examResult.patientId,
            error: error.message,
          });
          // Don't throw error to avoid breaking the main operation
        }

        try {
          if (examResult.status === 'completed' && isFull(examResult)) {
            const patient = await Patient.findByPk(examResult.patientId);
            if (patient) {
              const { examResults, changed } = applyCompletedExamToPatientCache(
                patient.examResults,
                examResult.get({ plain: true })
              );
              if (changed) {
                await patient.update({ examResults });
              }
            }
          }
        } catch (error) {
          logger.error('Error syncing patient examResults cache after ExamResult update', {
            examResultId: examResult.id,
            patientId: examResult.patientId,
            error: error.message,
          });
        }
      },
    },
  }
);

module.exports = ExamResult;
