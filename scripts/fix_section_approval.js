const { sequelize, Section } = require("../src/models");

async function fixApproval() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Connection successful.");

    console.log("Updating all sections to 'approved'...");
    const [results, metadata] = await sequelize.query(
      "UPDATE sections SET approval_status = 'approved' WHERE approval_status = 'pending'"
    );

    console.log(`Success! Updated ${metadata.rowCount || metadata} sections.`);
  } catch (error) {
    console.error("Error updating sections:", error);
  } finally {
    await sequelize.close();
  }
}

fixApproval();
