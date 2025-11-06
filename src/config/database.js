const { Sequelize } = require("sequelize");
const env = require("./env");

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "postgres",
  logging: false,
});

const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    await sequelize.sync({ alter: true });
    console.log("Models synced with database");
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
};

module.exports = { sequelize, initDatabase };
