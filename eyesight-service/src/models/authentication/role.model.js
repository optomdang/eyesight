const { Model, DataTypes, Op } = require('sequelize');
const { removeAccents } = require('../../utils/common');
const { sequelize } = require('../../config/db');

class Role extends Model {
  /**
   * Check if a role code is duplicate within a center
   * @param {string} code - Role code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeRoleId - Role ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeRoleId) {
    const whereClause = { code, centerId };
    if (excludeRoleId !== undefined && excludeRoleId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeRoleId) };
    }
    const role = await this.findOne({ where: whereClause });
    return !!role;
  }
}

Role.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, trim: true },
    nameEng: { type: DataTypes.STRING, trim: true },
    code: { type: DataTypes.STRING, allowNull: false, trim: true },
    rights: { type: DataTypes.JSON, allowNull: true },
    // rights: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING },
    updatedBy: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'Roles',
    timestamps: true,
    indexes: [
      {
        name: 'idx_roles_center_code',
        fields: ['centerId', 'code'],
        unique: true,
      },
      {
        name: 'idx_roles_center',
        fields: ['centerId'],
      },
    ],
    hooks: {
      beforeSave: (role) => {
        if (role.changed('name')) {
          role.set('nameEng', removeAccents(role.name));
        }
      },
    },
  }
);

module.exports = Role;
