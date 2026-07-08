require('dotenv').config();
const { Sequelize } = require('sequelize');
const { postgres } = require('./config');

const sequelize = new Sequelize(postgres.database, postgres.username, postgres.password, postgres);

const connectDB = async () => {
  await sequelize.authenticate();
  // Never auto-sync in production — use migrations instead.
  // sync() can silently alter or recreate tables, risking data loss.
  if (process.env.NODE_ENV !== 'production') {
    await sequelize.sync();
  }
};

module.exports = { sequelize, connectDB };
