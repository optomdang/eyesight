const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class Exercise extends Model {
  /**
   * Check if an exercise code is duplicate within a center
   * @param {string} code - Exercise code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeExerciseId - Exercise ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeExerciseId) {
    const whereClause = { code, centerId };
    if (excludeExerciseId !== undefined && excludeExerciseId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeExerciseId) };
    }
    const exercise = await this.findOne({ where: whereClause });
    return !!exercise;
  }
}

Exercise.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false, trim: true },
    code: { type: DataTypes.STRING(255), allowNull: false, trim: true },
    description: { type: DataTypes.TEXT },
    exerciseType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of exercise (e.g. visual, memory, 2048)',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      comment: 'Status of the exercise',
    },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    createdBy: { type: DataTypes.INTEGER },
    updatedBy: { type: DataTypes.INTEGER },
    deletedAt: { type: DataTypes.DATE },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'Exercise',
    tableName: 'Exercises',
    timestamps: true,
    indexes: [
      {
        name: 'idx_exercises_center_code',
        fields: ['centerId', 'code'],
        unique: true,
      },
      {
        name: 'idx_exercises_center_deleted',
        fields: ['centerId', 'deleted'],
      },
      {
        name: 'idx_exercises_type',
        fields: ['exerciseType'],
      },
      {
        name: 'idx_exercises_status',
        fields: ['status'],
      },
    ],
  }
);

module.exports = Exercise;
