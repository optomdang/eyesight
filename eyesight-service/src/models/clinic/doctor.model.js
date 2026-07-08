const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class Doctor extends Model {
  /**
   * Check if a doctor code is duplicate within a center
   * @param {string} code - Doctor code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeDoctorId - Doctor ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeDoctorId) {
    const whereClause = { code, centerId };
    if (excludeDoctorId !== undefined && excludeDoctorId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeDoctorId) };
    }
    const doctor = await this.findOne({ where: whereClause });
    return !!doctor;
  }

  /**
   * Check if a user is already assigned as a doctor
   * @param {number} userId - User ID to check
   * @param {number} excludeDoctorId - Doctor ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isUserAssigned(userId, excludeDoctorId) {
    const whereClause = { userId };
    if (excludeDoctorId !== undefined && excludeDoctorId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeDoctorId) };
    }
    const doctor = await this.findOne({ where: whereClause });
    return !!doctor;
  }
}

Doctor.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(255), allowNull: false, trim: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    specialization: { type: DataTypes.STRING(255), allowNull: true },
    licenseNumber: { type: DataTypes.STRING(255), allowNull: true },
    qualification: { type: DataTypes.STRING(255), allowNull: true },
    updatedBy: { type: DataTypes.INTEGER },
    deletedAt: { type: DataTypes.DATE },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'Doctor',
    tableName: 'Doctors',
    timestamps: true,
    indexes: [
      {
        name: 'idx_doctors_center_code',
        fields: ['centerId', 'code'],
        unique: true,
      },
      {
        name: 'idx_doctors_user',
        fields: ['userId'],
        unique: true,
      },
      {
        name: 'idx_doctors_center_deleted',
        fields: ['centerId', 'deleted'],
      },
      {
        name: 'idx_doctors_specialization',
        fields: ['specialization'],
      },
    ],
  }
);

module.exports = Doctor;
