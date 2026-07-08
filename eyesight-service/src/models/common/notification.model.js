const { Model, DataTypes, Op } = require('sequelize');
const { sequelize } = require('../../config/db');

class Notification extends Model {
  /**
   * Check if a notification code is duplicate within a center
   * @param {string} code - Notification code to check
   * @param {number} centerId - Center ID for multi-tenant check
   * @param {number} excludeNotificationId - Notification ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isDuplicateCode(code, centerId, excludeNotificationId) {
    const whereClause = { code, centerId };
    if (excludeNotificationId !== undefined && excludeNotificationId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeNotificationId) };
    }
    const notification = await this.findOne({ where: whereClause });
    return !!notification;
  }
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: false,
      trim: true,
    },
    type: {
      type: DataTypes.STRING(20),
      defaultValue: 'info',
    },
    category: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      trim: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      trim: true,
    },
    senderId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      trim: true,
    },
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }, // Thay cho userId, đồng nhất với receiver trong Mongoose
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    scheduledAt: {
      type: DataTypes.DATE,
    },
    sent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    referenceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'FK to ExamSession.id or ExerciseSession.id',
    },
    channel: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Notification delivery channel',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Actual send timestamp',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if notification send failed',
    },
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Soft-delete flag (added by migration 20260301)',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'Notifications',
    timestamps: true,
  }
);

module.exports = Notification;
