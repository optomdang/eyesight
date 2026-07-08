const { Model, DataTypes, Op } = require('sequelize');
const { removeAccents } = require('../../utils/common');
const { sequelize } = require('../../config/db');

class CenterModel extends Model {
  /**
   * Check if a center code is duplicate (global check since centers are top-level)
   * @param {string} code - Center code to check
   * @param {number} excludeCenterId - Center ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, excludeCenterId) {
    const whereClause = { code };
    if (excludeCenterId !== undefined && excludeCenterId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeCenterId) };
    }
    const center = await this.findOne({ where: whereClause });
    return !!center;
  }
}

CenterModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, trim: true },
    nameEng: { type: DataTypes.STRING, trim: true },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
      comment: 'Unique center code',
    },
    phoneNumber: { type: DataTypes.STRING, trim: true },
    address: { type: DataTypes.STRING, trim: true },
    logo: { type: DataTypes.STRING, trim: true },
    option: {
      type: DataTypes.JSON,
    },
    updatedBy: { type: DataTypes.INTEGER },
    // Soft delete fields
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Center',
    tableName: 'Centers',
    timestamps: true,
    indexes: [
      {
        name: 'idx_centers_code',
        fields: ['code'],
        unique: true,
      },
      {
        name: 'idx_centers_deleted',
        fields: ['deleted'],
      },
    ],
    hooks: {
      beforeSave: (center) => {
        if (center.changed('name')) {
          center.nameEng = removeAccents(center.name);
        }
      },
    },
  }
);

module.exports = CenterModel;
