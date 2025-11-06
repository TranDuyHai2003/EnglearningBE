const { sequelize } = require("../config/database");
const {
  Course,
  User,
  Enrollment,
  Transaction,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");

const healthCheck = asyncHandler(async (req, res) => {
  let dbStatus = "ok";
  try {
    await sequelize.authenticate();
  } catch (error) {
    dbStatus = "error";
  }

  res.json({
    success: true,
    data: {
      service: "englearning-api",
      status: "ok",
      uptime: process.uptime(),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

const metrics = asyncHandler(async (req, res) => {
  const [courses, users, enrollments, revenue] = await Promise.all([
    Course.count(),
    User.count(),
    Enrollment.count(),
    Transaction.sum("final_amount", { where: { status: "completed" } }),
  ]);

  res.json({
    success: true,
    data: {
      courses,
      users,
      enrollments,
      revenue: Number(revenue || 0),
    },
  });
});

module.exports = {
  healthCheck,
  metrics,
};
