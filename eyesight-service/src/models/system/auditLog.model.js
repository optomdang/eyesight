const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Center context for the action when available',
    },
    actorUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who triggered the action, if identified',
    },
    actorUserType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Snapshot of actor userType at action time',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Action code, e.g. auth.login, patient.update',
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'partial'),
      allowNull: false,
      defaultValue: 'success',
      comment: 'Outcome of the action',
    },
    entityType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Target entity type, e.g. user, patient, exerciseAssignment',
    },
    entityId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Target entity id as string for cross-entity compatibility',
    },
    ipAddress: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Client IP address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Client user-agent header',
    },
    requestMethod: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'HTTP request method',
    },
    requestPath: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'HTTP request path',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional structured metadata for the action',
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the action happened',
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'AuditLogs',
    timestamps: false,
    indexes: [
      { fields: ['centerId'] },
      { fields: ['actorUserId'] },
      { fields: ['actorUserType'] },
      { fields: ['action'] },
      { fields: ['status'] },
      { fields: ['occurredAt'] },
      { fields: ['entityType', 'entityId'] },
      { fields: ['action', 'status', 'occurredAt'] },
    ],
  }
);

module.exports = AuditLog;
