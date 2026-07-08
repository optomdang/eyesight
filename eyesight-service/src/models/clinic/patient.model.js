const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class Patient extends Model {
  /**
   * Check if a patient code is duplicate within a center
   * @param {string} code - Patient code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludePatientId - Patient ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludePatientId) {
    const whereClause = { code, centerId };
    if (excludePatientId !== undefined && excludePatientId !== null) {
      whereClause.id = { [Op.ne]: Number(excludePatientId) };
    }
    const patient = await this.findOne({ where: whereClause });
    return !!patient;
  }

  /**
   * Check if a user is already assigned as a patient
   * @param {number} userId - User ID to check
   * @param {number} excludePatientId - Patient ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isUserAssigned(userId, excludePatientId) {
    const whereClause = { userId };
    if (excludePatientId !== undefined && excludePatientId !== null) {
      whereClause.id = { [Op.ne]: Number(excludePatientId) };
    }
    const patient = await this.findOne({ where: whereClause });
    return !!patient;
  }
}

Patient.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(255), allowNull: false, trim: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    doctorId: { type: DataTypes.INTEGER },
    clinicId: { type: DataTypes.INTEGER },
    centerId: { type: DataTypes.INTEGER, allowNull: false },

    // Treatment Status & License Period
    treatmentStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Treatment status enum: not_started | active | paused | completed (P4)',
    },
    activeFrom: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Treatment start date (license start)',
    },
    activeTo: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Treatment end date',
    },

    // Severity Classification (set by doctor)
    severityLevel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Vision problem severity classified by doctor',
    },

    // Medical Record (Bệnh án)
    medicalHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Patient medical history - rich text format (Bệnh sử)',
    },
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes and information (Thông tin khác - renamed from severityNotes)',
    },
    medicalImages: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Medical record images stored as base64 - max 1MB each (Ảnh bệnh án)',
    },
    causes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false,
      comment: 'List of diagnosis causes for this patient',
    },

    // Compliance data for each exam type
    compliance: {
      type: DataTypes.JSONB,
      defaultValue: {
        far: {
          performanceRate: 0,
          status: 'poor',
          completedExams: 0,
          requiredExams: 0,
          lastCalculatedAt: null,
        },
        near: {
          performanceRate: 0,
          status: 'poor',
          completedExams: 0,
          requiredExams: 0,
          lastCalculatedAt: null,
        },
        contrast: {
          performanceRate: 0,
          status: 'poor',
          completedExams: 0,
          requiredExams: 0,
          lastCalculatedAt: null,
        },
        stereopsis: {
          performanceRate: 0,
          status: 'poor',
          completedExams: 0,
          requiredExams: 0,
          lastCalculatedAt: null,
        },
      },
    },
    // Exam results data for each exam type
    examResults: {
      type: DataTypes.JSONB,
      defaultValue: {
        far: {
          initialResult: { leftEye: null, rightEye: null, bothEye: null },
          currentResult: { leftEye: null, rightEye: null, bothEye: null },
          lastExamDate: null,
        },
        near: {
          initialResult: { leftEye: null, rightEye: null, bothEye: null },
          currentResult: { leftEye: null, rightEye: null, bothEye: null },
          lastExamDate: null,
        },
        contrast: {
          initialResult: { leftEye: null, rightEye: null, bothEye: null },
          currentResult: { leftEye: null, rightEye: null, bothEye: null },
          lastExamDate: null,
        },
        stereopsis: {
          initialResult: { leftEye: null, rightEye: null, bothEye: null },
          currentResult: { leftEye: null, rightEye: null, bothEye: null },
          lastExamDate: null,
        },
      },
    },
    updatedBy: { type: DataTypes.INTEGER },
    deletedAt: { type: DataTypes.DATE },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'Patient',
    tableName: 'Patients',
    timestamps: true,
    indexes: [
      {
        name: 'idx_patients_center_treatment',
        fields: ['centerId', 'treatmentStatus'],
      },
      {
        name: 'idx_patients_doctor',
        fields: ['doctorId'],
      },
      {
        name: 'idx_patients_user',
        fields: ['userId'],
      },
      {
        name: 'idx_patients_deleted',
        fields: ['deleted'], // Most queries filter by deleted=false
      },
      {
        name: 'idx_patients_active_dates',
        fields: ['activeFrom', 'activeTo'], // Status filters use these
      },
      {
        name: 'idx_patients_center_deleted',
        fields: ['centerId', 'deleted'], // Composite for common query pattern
      },
      {
        name: 'idx_patients_center_deleted_status',
        fields: ['centerId', 'deleted', 'treatmentStatus'],
      },
      // Additional performance indexes
      {
        name: 'idx_patients_severity_center',
        fields: ['severityLevel', 'centerId'], // For severity filtering
      },
      {
        name: 'idx_patients_treatment_active_dates',
        fields: ['treatmentStatus', 'activeFrom', 'activeTo'], // For status calculations
      },
      {
        name: 'idx_patients_created_center',
        fields: ['createdAt', 'centerId'], // For default sorting with multi-tenant
      },
    ],
  }
);

module.exports = Patient;
