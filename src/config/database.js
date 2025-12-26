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

    // HOTFIX: Force course_id/package_id to be nullable for Speaking Club
    try {
       await sequelize.query(`ALTER TABLE "transaction_details" ALTER COLUMN "course_id" DROP NOT NULL;`);
       // Check if package_id exists or add it if needed? Sync should have added it.
    } catch (e) {
       console.log("Auto-fix schema warning:", e.message);
    }
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
};


module.exports = { sequelize, initDatabase };
