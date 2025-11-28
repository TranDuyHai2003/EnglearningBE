const asyncHandler = require("../utils/asyncHandler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { Transaction, TransactionDetail, Course, Enrollment, User, Notification } = require("../models");

// @desc    Create Stripe checkout session
// @route   POST /api/payments/create-checkout
// @access  Private (Student)
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user.id;

  // Get course
  const course = await Course.findByPk(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  // Check if already enrolled
  const existingEnrollment = await Enrollment.findOne({
    where: { student_id: studentId, course_id: courseId },
  });

  if (existingEnrollment) {
    return res.status(400).json({
      success: false,
      message: "Already enrolled in this course",
    });
  }

  // Calculate price (use discount_price if available)
  const price = course.discount_price || course.price;
  const amountInCents = Math.round(parseFloat(price) * 100); // Convert to cents

  // Create transaction record
  const transactionCode = `TXN-${Date.now()}-${studentId}`;
  const transaction = await Transaction.create({
    student_id: studentId,
    transaction_code: transactionCode,
    total_amount: price,
    discount_amount: course.discount_price ? course.price - course.discount_price : 0,
    final_amount: price,
    payment_method: "bank_card",
    payment_gateway: "stripe",
    status: "pending",
  });

  // Create transaction detail
  await TransactionDetail.create({
    transaction_id: transaction.transaction_id,
    course_id: courseId,
    price: course.price,
    discount: course.discount_price ? course.price - course.discount_price : 0,
    final_price: price,
  });

  // Create Stripe checkout session
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

  // Update transaction with Stripe session ID
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

// @desc    Stripe webhook handler
// @route   POST /api/payments/webhook
// @access  Public (Stripe only)
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

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Get transaction
    const transaction = await Transaction.findOne({
      where: { stripe_session_id: session.id },
      include: [{ model: TransactionDetail, as: "details" }],
    });

    if (!transaction) {
      console.error("Transaction not found for session:", session.id);
      return res.status(404).send("Transaction not found");
    }

    // Update transaction status
    await transaction.update({
      status: "completed",
      stripe_payment_intent: session.payment_intent,
      payment_at: new Date(),
    });

    // Auto-enroll student
    const courseId = transaction.details[0].course_id;
    const studentId = transaction.student_id;

    await Enrollment.create({
      student_id: studentId,
      course_id: courseId,
      status: "active",
    });

    // Create notification
    await Notification.create({
      user_id: studentId,
      type: "payment",
      title: "Thanh toán thành công",
      content: `Bạn đã thanh toán thành công khóa học ${transaction.details[0].course.title}. Chúc bạn học tốt!`,
      is_read: false,
    });

    // console.log(`✅ Auto-enrolled student ${studentId} in course ${courseId}`);
  }

  res.json({ received: true });
});

// @desc    Get payment session status
// @route   GET /api/payments/session/:sessionId
// @access  Private
const getSessionStatus = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const transaction = await Transaction.findOne({
    where: { stripe_session_id: sessionId },
    include: [
      {
        model: TransactionDetail,
        as: "details",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  res.json({
    success: true,
    data: {
      status: session.payment_status,
      transaction,
    },
  });
});

// @desc    Get user's transactions (or all for admin)
// @route   GET /api/payments/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;

  const where = {};

  // If NOT admin, force filter by student_id
  if (req.user.role !== "system_admin" && req.user.role !== "support_admin") {
    where.student_id = req.user.id;
  } else {
    // If Admin, allow filtering by student_id if provided
    if (req.query.student_id) {
      where.student_id = req.query.student_id;
    }
  }

  if (status) {
    where.status = status;
  } else {
    // Default: Only show completed and refunded
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

// @desc    Request refund for a transaction
// @route   POST /api/payments/transactions/:id/refund
// @access  Private (Admin)
const requestRefund = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id, {
    include: [{ model: TransactionDetail, as: "details" }],
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
  }

  if (transaction.status !== "completed") {
    return res.status(400).json({ success: false, message: "Transaction not completed" });
  }

  // Process refund with Stripe if applicable
  if (transaction.payment_gateway === "stripe" && transaction.stripe_payment_intent) {
    try {
      await stripe.refunds.create({
        payment_intent: transaction.stripe_payment_intent,
      });
    } catch (error) {
      console.error("Stripe refund failed:", error);
      return res.status(500).json({ success: false, message: "Stripe refund failed" });
    }
  }

  // Update transaction status
  await transaction.update({
    status: "refunded",
    refunded_at: new Date(),
  });

  // Deactivate enrollment
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

// @desc    Cancel a pending transaction
// @route   POST /api/payments/transactions/:id/cancel
// @access  Private (Student)
const cancelTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id);

  if (!transaction) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
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

  // Expire Stripe session if exists
  if (transaction.stripe_session_id) {
    try {
      await stripe.checkout.sessions.expire(transaction.stripe_session_id);
    } catch (error) {
      // Ignore error if session already expired or invalid
      console.log("Stripe session expire failed:", error.message);
    }
  }

  await transaction.update({
    status: "failed", // Or 'cancelled' if enum supports it, but 'failed' is fine for now or we can add 'cancelled'
  });

  res.json({ success: true, message: "Transaction cancelled" });
});

const resumePayment = asyncHandler(async (req, res) => {
  // ... existing resumePayment logic ...
  // Actually, user wants to remove resume feature?
  // "xem lại logic thanh toán, hủy thanh toán, có nhất thiết cần phải có đơn đang thanh toán dở không"
  // "chỉnh sửa logic đúng với các trang web hiện đại"
  // Modern sites often just let you create a new cart/checkout.
  // But keeping resumePayment doesn't hurt if we just hide the button.
  // However, the user explicitly asked to "refactor payment logic (hide pending, handle cancel)".
  // So I will keep resumePayment for now in case they want it back, but I won't expose it in the UI.
  // Wait, I am replacing the file content. I should keep resumePayment if I want to avoid deleting it,
  // OR I can delete it if I want to be clean.
  // The user said "có nhất thiết cần phải có đơn đang thanh toán dở không" (is it necessary to have pending orders).
  // Implies they don't want them.
  // I will keep resumePayment code for now but it won't be used.
  
  // Re-pasting the resumePayment code here to ensure it's not lost if I am replacing the block.
  // Wait, the block I am replacing includes resumePayment?
  // The StartLine is 195 (getTransactions) and EndLine is 381 (module.exports).
  // So yes, I am replacing everything from getTransactions down.
  
  const transaction = await Transaction.findByPk(req.params.id, {
    include: [{ model: TransactionDetail, as: "details" }],
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
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

  // Check if session is still valid
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

  // Create new session if old one expired or missing
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
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?transaction_id=${transaction.transaction_id}`, // Update cancel URL to include transaction ID
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
