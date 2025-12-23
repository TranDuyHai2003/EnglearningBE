const { sequelize } = require("../src/config/database");
const { Review } = require("../src/models");

async function approveAllReviews() {
  try {
    const [updated] = await Review.update(
      { status: "approved" },
      { where: {} }
    );
    console.log(`Updated ${updated} reviews to 'approved'.`);
  } catch (error) {
    console.error("Error updating reviews:", error);
  } finally {
    await sequelize.close();
  }
}

approveAllReviews();
