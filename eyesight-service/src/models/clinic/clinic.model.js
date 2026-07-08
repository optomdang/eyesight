const { Model, DataTypes, Op } = require('sequelize');
const { removeAccents } = require('../../utils/common');
const { sequelize } = require('../../config/db');

class Clinic extends Model {
  /**
   * Check if a clinic code is duplicate within a center
   * @param {string} code - Clinic code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeClinicId - Clinic ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeClinicId) {
    const whereClause = { code, centerId };
    if (excludeClinicId !== undefined && excludeClinicId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeClinicId) };
    }
    const clinic = await this.findOne({ where: whereClause });
    return !!clinic;
  }
}

Clinic.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, trim: true },
    nameEng: { type: DataTypes.STRING, trim: true },
    code: { type: DataTypes.STRING, allowNull: false, trim: true },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, trim: true },
    address: { type: DataTypes.STRING, trim: true },
    updatedBy: { type: DataTypes.INTEGER },
    // Soft delete fields
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Clinic',
    tableName: 'Clinics',
    timestamps: true,
    indexes: [
      {
        name: 'idx_clinics_center_code',
        fields: ['centerId', 'code'],
        unique: true,
      },
      {
        name: 'idx_clinics_center_deleted',
        fields: ['centerId', 'deleted'],
      },
    ],
    hooks: {
      beforeSave: (clinic) => {
        if (clinic.changed('name')) {
          clinic.nameEng = removeAccents(clinic.name);
        }
      },
    },
  }
);

module.exports = Clinic;
