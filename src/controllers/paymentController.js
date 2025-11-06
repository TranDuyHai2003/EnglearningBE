const { randomUUID } = require("crypto");
const { sequelize } = require("../config/database");
const {
  Course,
  Transaction,
  TransactionDetail,
  Enrollment,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");

const addToCart = asyncHandler(async (req, res) => {
  const courseIds = req.body.course_ids || [];
  if (!courseIds.length) {
    return res.status(400).json({ success: false, message: "No course ids" });
  }

  const courses = await Course.findAll({
    where: { course_id: courseIds },
  });
  if (!courses.length) {
    return res.status(404).json({ success: false, message: "Courses not found" });
  }

  const total = courses.reduce(
    (sum, course) => sum + Number(course.discount_price || course.price || 0),
    0
  );

  const transaction = await Transaction.create({
    student_id: req.user.id,
    transaction_code: randomUUID(),
    total_amount: total,
    discount_amount: 0,
    final_amount: total,
    status: "pending",
  });

  const details = courses.map((course) => {
    const price = Number(course.price || 0);
    const salePrice = Number(course.discount_price || price);
    return {
      transaction_id: transaction.transaction_id,
      course_id: course.course_id,
      price,
      discount: Math.max(price - salePrice, 0),
      final_price: salePrice,
    };
  });
  await TransactionDetail.bulkCreate(details);

  res.status(201).json({
    success: true,
    data: {
      transaction,
      details,
    },
  });
});

const listTransactions = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  if (req.user.role === "student") {
    where.student_id = req.user.id;
  } else if (req.query.student_id) {
    where.student_id = req.query.student_id;
  }
  if (req.query.status) {
    where.status = req.query.status;
  }

  const result = await Transaction.findAndCountAll({
    where,
    include: [{ model: TransactionDetail, as: "details" }],
    limit,
    offset,
    order: [["created_at", "DESC"]],
  });

  res.json({
    success: true,
    data: result.rows,
    meta: {
      total: result.count,
      page,
      limit,
      total_pages: Math.ceil(result.count / limit),
    },
  });
});

const checkout = asyncHandler(async (req, res) => {
  const { transaction_id, payment_method, payment_gateway } = req.body;
  const transaction = await Transaction.findByPk(transaction_id, {
    include: [{ model: TransactionDetail, as: "details" }],
  });
  if (
    !transaction ||
    (req.user.role === "student" && transaction.student_id !== req.user.id)
  ) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
  }
  if (transaction.status !== "pending") {
    return res.status(400).json({ success: false, message: "Transaction already processed" });
  }

  await sequelize.transaction(async (t) => {
    await transaction.update(
      {
        status: "completed",
        payment_method,
        payment_gateway,
        payment_at: new Date(),
      },
      { transaction: t }
    );

    for (const detail of transaction.details) {
      await Enrollment.findOrCreate({
        where: {
          student_id: transaction.student_id,
          course_id: detail.course_id,
        },
        defaults: {
          completion_percentage: 0,
          status: "active",
        },
        transaction: t,
      });
    }
  });

  res.json({ success: true, data: transaction });
});

const requestRefund = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id);
  if (
    !transaction ||
    (req.user.role === "student" && transaction.student_id !== req.user.id)
  ) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
  }

  if (transaction.status !== "completed") {
    return res.status(400).json({ success: false, message: "Transaction not completed" });
  }

  await transaction.update({
    status: "refunded",
    refunded_at: new Date(),
  });

  res.json({ success: true, data: transaction });
});

const webhook = asyncHandler(async (req, res) => {
  const { transaction_code, status } = req.body;
  const transaction = await Transaction.findOne({
    where: { transaction_code },
  });
  if (!transaction) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
  }

  await transaction.update({
    status,
  });

  res.json({ success: true });
});

module.exports = {
  addToCart,
  listTransactions,
  checkout,
  requestRefund,
  webhook,
};
