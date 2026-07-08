const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class Configuration extends Model {
  /**
   * Check if a configuration code is duplicate within a center
   * @param {string} code - Configuration code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeConfigId - Configuration ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeConfigId) {
    const whereClause = { code, centerId };
    if (excludeConfigId !== undefined && excludeConfigId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeConfigId) };
    }
    const config = await this.findOne({ where: whereClause });
    return !!config;
  }
}

Configuration.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(255), allowNull: false, trim: true },
    key: { type: DataTypes.STRING(50), allowNull: false },
    value: { type: DataTypes.JSONB },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'Configuration',
    tableName: 'Configurations',
    timestamps: true,
  }
);

module.exports = Configuration;
