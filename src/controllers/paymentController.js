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
    const packageId = detail?.package_id;

    // Course Fulfillment
    if (courseId && transaction.student_id) {
      await Enrollment.findOrCreate({
        where: {
          student_id: transaction.student_id,
          course_id: courseId,
        },
        defaults: { status: "active" },
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
    // Package Fulfillment
    else if (packageId && transaction.student_id) {
       const { LiveCoursePackage, UserCredit } = require("../models");
       const pkg = await LiveCoursePackage.findByPk(packageId);
       
       if (pkg) {
          let credit = await UserCredit.findByPk(transaction.student_id);
          if (!credit) {
             credit = await UserCredit.create({ user_id: transaction.student_id, balance: 0 });
          }
          credit.balance += pkg.credits;
          await credit.save();

          await Notification.create({
             user_id: transaction.student_id,
             type: "payment",
             title: "Mua gói Speaking thành công",
             content: `Bạn đã nhận được ${pkg.credits} credits từ gói ${pkg.name}.`,
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
        include: [
           { model: Course, as: "course" },
           { model: require("../models").LiveCoursePackage, as: "package" }
        ],
      },
    ],
  });

  return transaction;
};

const createCheckoutSession = asyncHandler(async (req, res) => {
  const { courseId, packageId } = req.body;
  const studentId = req.user.id;

  let item, price, title, description, imageUrl, type;

  if (courseId) {
    item = await Course.findByPk(courseId);
    if (!item) return res.status(404).json({ success: false, message: "Course not found" });
    
    // Check existing enrollment
    const existingEnrollment = await Enrollment.findOne({
       where: { student_id: studentId, course_id: courseId },
    });
    if (existingEnrollment) {
       return res.status(400).json({ success: false, message: "Already enrolled in this course" });
    }

    type = 'course';
    price = item.discount_price || item.price;
    title = item.title;
    description = item.description?.substring(0, 200);
    imageUrl = item.thumbnail_url;
  } else if (packageId) {
    const { LiveCoursePackage } = require("../models");
    item = await LiveCoursePackage.findByPk(packageId);
    if (!item) return res.status(404).json({ success: false, message: "Package not found" });

    type = 'package';
    price = item.price; 
    title = item.name;
    description = item.description;
    imageUrl = null; 
  } else {
    return res.status(400).json({ success: false, message: "No item specified" });
  }

  console.log("Creating Checkout Session:", { type, price, title, studentId }); // DEBUG LOG

  // Determine currency and unit amount
  const currency = "vnd"; 
  let amountForStripe;
  
  if (currency === "vnd") {
      // VND is a zero-decimal currency, so we pass the amount directly without *100
      amountForStripe = Math.round(parseFloat(price)); 
  } else {
      amountForStripe = Math.round(parseFloat(price) * 100);
  }

  const transactionCode = `TXN-${Date.now()}-${studentId}`;
  
  const transaction = await Transaction.create({
    student_id: studentId,
    transaction_code: transactionCode,
    total_amount: price,
    discount_amount: (type === 'course' && item.discount_price) ? item.price - item.discount_price : 0,
    final_amount: price,
    payment_method: "bank_card",
    payment_gateway: "stripe",
    status: "pending",
  });

  await TransactionDetail.create({
    transaction_id: transaction.transaction_id,
    course_id: type === 'course' ? item.course_id : null,
    package_id: type === 'package' ? item.package_id : null,
    price: item.price,
    discount: (type === 'course' && item.discount_price) ? item.price - item.discount_price : 0,
    final_price: price,
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency, 
          product_data: {
            name: title,
            description: description,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: amountForStripe,
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
      course_id: type === 'course' ? item.course_id : null,
      package_id: type === 'package' ? item.package_id : null,
      type: type 
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
        include: [
           { model: Course, as: "course" },
           { model: require("../models").LiveCoursePackage, as: "package" }
        ],
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

  let item, title, description, imageUrl, type;
  const detail = transaction.details[0];

  if (detail.course_id) {
     item = await Course.findByPk(detail.course_id);
     type = 'course';
     title = item.title;
     description = item.description?.substring(0, 200);
     imageUrl = item.thumbnail_url;
  } else if (detail.package_id) {
     const { LiveCoursePackage } = require("../models");
     item = await LiveCoursePackage.findByPk(detail.package_id);
     type = 'package';
     title = item.name;
     description = item.description;
     imageUrl = null;
  }

  // Determine currency and unit amount (VND support)
  const currency = "vnd"; 
  const price = transaction.final_amount;
  let amountForStripe;
  
  if (currency === "vnd") {
      amountForStripe = Math.round(parseFloat(price)); 
  } else {
      amountForStripe = Math.round(parseFloat(price) * 100);
  }

  session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: title,
            description: description,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: amountForStripe,
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
      course_id: detail.course_id,
      package_id: detail.package_id,
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
