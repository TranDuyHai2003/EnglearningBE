const asyncHandler = require("../utils/asyncHandler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  Transaction,
  TransactionDetail,
  Course,
  Enrollment,
  User,
  Notification,
} = require("../models");

const finalizeStripeTransaction = async (transaction, session) => {
  if (!transaction) {
    return null;
  }

  if (transaction.status !== "completed") {
    await transaction.update({
      status: "completed",
      stripe_payment_intent: session.payment_intent,
      payment_at: new Date(),
    });

    const detail = transaction.details?.[0];
    const courseId = detail?.course_id;

    if (courseId && transaction.student_id) {
      await Enrollment.findOrCreate({
        where: {
          student_id: transaction.student_id,
          course_id: courseId,
        },
        defaults: {
          status: "active",
        },
      });

      let courseTitle = detail?.course?.title;
      if (!courseTitle) {
        const course = await Course.findByPk(courseId);
        courseTitle = course?.title;
      }

      if (courseTitle) {
        await Notification.create({
          user_id: transaction.student_id,
          type: "payment",
          title: "Thanh toán thành công",
          content: `Bạn đã thanh toán thành công khóa học ${courseTitle}. Chúc bạn học tốt!`,
          is_read: false,
        });
      }
    }
  }

  await transaction.reload({
    include: [
      {
        model: TransactionDetail,
        as: "details",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  return transaction;
};

const createCheckoutSession = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user.id;

  const course = await Course.findByPk(courseId);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  const existingEnrollment = await Enrollment.findOne({
    where: { student_id: studentId, course_id: courseId },
  });

  if (existingEnrollment) {
    return res.status(400).json({
      success: false,
      message: "Already enrolled in this course",
    });
  }

  const price = course.discount_price || course.price;
  const amountInCents = Math.round(parseFloat(price) * 100);

  const transactionCode = `TXN-${Date.now()}-${studentId}`;
  const transaction = await Transaction.create({
    student_id: studentId,
    transaction_code: transactionCode,
    total_amount: price,
    discount_amount: course.discount_price
      ? course.price - course.discount_price
      : 0,
    final_amount: price,
    payment_method: "bank_card",
    payment_gateway: "stripe",
    status: "pending",
  });

  await TransactionDetail.create({
    transaction_id: transaction.transaction_id,
    course_id: courseId,
    price: course.price,
    discount: course.discount_price ? course.price - course.discount_price : 0,
    final_price: price,
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: course.title,
            description: course.description?.substring(0, 200),
            images: course.thumbnail_url ? [course.thumbnail_url] : [],
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?transaction_id=${transaction.transaction_id}`,
    client_reference_id: transaction.transaction_id.toString(),
    customer_email: req.user.email,
    metadata: {
      transaction_id: transaction.transaction_id,
      student_id: studentId,
      course_id: courseId,
    },
  });

  await transaction.update({
    stripe_session_id: session.id,
  });

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      url: session.url,
    },
  });
});

const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const transaction = await Transaction.findOne({
      where: { stripe_session_id: session.id },
      include: [
        {
          model: TransactionDetail,
          as: "details",
          include: [{ model: Course, as: "course" }],
        },
      ],
    });

    if (!transaction) {
      console.error("Transaction not found for session:", session.id);
      return res.status(200).json({ received: true });
    }

    await finalizeStripeTransaction(transaction, session);
  }

  res.json({ received: true });
});

const getSessionStatus = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  let transaction = await Transaction.findOne({
    where: { stripe_session_id: sessionId },
    include: [
      {
        model: TransactionDetail,
        as: "details",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  if (session.payment_status === "paid" && transaction) {
    transaction = await finalizeStripeTransaction(transaction, session);
  }

  res.json({
    success: true,
    data: {
      status: session.payment_status,
      transaction,
    },
  });
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;

  const where = {};

  if (req.user.role !== "system_admin" && req.user.role !== "support_admin") {
    where.student_id = req.user.id;
  } else {
    if (req.query.student_id) {
      where.student_id = req.query.student_id;
    }
  }

  if (status) {
    where.status = status;
  } else {
    where.status = {
      [require("sequelize").Op.in]: ["completed", "refunded"],
    };
  }

  const transactions = await Transaction.findAndCountAll({
    where,
    include: [
      {
        model: TransactionDetail,
        as: "details",
        include: [{ model: Course, as: "course" }],
      },
      {
        model: User,
        as: "student",
        attributes: ["full_name", "email"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    success: true,
    data: transactions.rows,
    meta: {
      total: transactions.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(transactions.count / limit),
    },
  });
});

const requestRefund = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id, {
    include: [{ model: TransactionDetail, as: "details" }],
  });

  if (!transaction) {
    return res
      .status(404)
      .json({ success: false, message: "Transaction not found" });
  }

  if (transaction.status !== "completed") {
    return res
      .status(400)
      .json({ success: false, message: "Transaction not completed" });
  }

  if (
    transaction.payment_gateway === "stripe" &&
    transaction.stripe_payment_intent
  ) {
    try {
      await stripe.refunds.create({
        payment_intent: transaction.stripe_payment_intent,
      });
    } catch (error) {
      console.error("Stripe refund failed:", error);
      return res
        .status(500)
        .json({ success: false, message: "Stripe refund failed" });
    }
  }

  await transaction.update({
    status: "refunded",
    refunded_at: new Date(),
  });

  const courseId = transaction.details[0].course_id;
  const studentId = transaction.student_id;

  await Enrollment.update(
    { status: "dropped" },
    {
      where: {
        student_id: studentId,
        course_id: courseId,
      },
    }
  );

  res.json({ success: true, data: transaction });
});

const cancelTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id);

  if (!transaction) {
    return res
      .status(404)
      .json({ success: false, message: "Transaction not found" });
  }

  if (transaction.student_id !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (transaction.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Transaction is ${transaction.status}`,
    });
  }

  if (transaction.stripe_session_id) {
    try {
      await stripe.checkout.sessions.expire(transaction.stripe_session_id);
    } catch (error) {
      console.log("Stripe session expire failed:", error.message);
    }
  }

  await transaction.update({
    status: "failed",
  });

  res.json({ success: true, message: "Transaction cancelled" });
});

const resumePayment = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id, {
    include: [{ model: TransactionDetail, as: "details" }],
  });

  if (!transaction) {
    return res
      .status(404)
      .json({ success: false, message: "Transaction not found" });
  }

  if (transaction.student_id !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (transaction.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: `Transaction is ${transaction.status}`,
    });
  }

  let session;
  if (transaction.stripe_session_id) {
    try {
      session = await stripe.checkout.sessions.retrieve(
        transaction.stripe_session_id
      );
      if (session.status === "open") {
        return res.json({ success: true, data: { url: session.url } });
      }
    } catch (error) {
      console.log("Stripe session retrieval failed, creating new one");
    }
  }

  const course = await Course.findByPk(transaction.details[0].course_id);
  const amountInCents = Math.round(parseFloat(transaction.final_amount) * 100);

  session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: course.title,
            description: course.description?.substring(0, 200),
            images: course.thumbnail_url ? [course.thumbnail_url] : [],
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?transaction_id=${transaction.transaction_id}`,
    client_reference_id: transaction.transaction_id.toString(),
    customer_email: req.user.email,
    metadata: {
      transaction_id: transaction.transaction_id,
      student_id: req.user.id,
      course_id: course.course_id,
    },
  });

  await transaction.update({
    stripe_session_id: session.id,
  });

  res.json({ success: true, data: { url: session.url } });
});

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSessionStatus,
  getTransactions,
  requestRefund,
  resumePayment,
  cancelTransaction,
};
