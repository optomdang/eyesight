// src/models/token.js
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db'); // Adjust path

class Token extends Model {
  toJSON() {
    // Optionally exclude userId if sensitive
    // delete values.userId;
    return { ...this.get() };
  }
}

Token.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    blacklisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Token',
    tableName: 'Tokens',
    timestamps: true,
    indexes: [
      { fields: ['token'] },
      { fields: ['userId'] }, // Optional performance boost
    ],
  }
);

// Token.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Token;
