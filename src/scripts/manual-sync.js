const { sequelize } = require("../models");

async function sync() {
  try {
    console.log("Syncing database...");
    await sequelize.sync({ alter: true });
    console.log("Database synced successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Database sync failed:", err);
    process.exit(1);
  }
}

sync();
