const asyncHandler = require("express-async-handler");
const {
  ContentReport,
  User,
  QaDiscussion,
  QaReply,
  Review,
} = require("../models");

const reportContent = asyncHandler(async (req, res) => {
  const { content_type, content_id, reason } = req.body;

  if (!["discussion", "reply", "review"].includes(content_type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid content type",
    });
  }

  let contentExists = false;
  switch (content_type) {
    case "discussion":
      contentExists = await QaDiscussion.findByPk(content_id);
      break;
    case "reply":
      contentExists = await QaReply.findByPk(content_id);
      break;
    case "review":
      contentExists = await Review.findByPk(content_id);
      break;
  }

  if (!contentExists) {
    return res.status(404).json({
      success: false,
      message: "Content not found",
    });
  }

  const existingReport = await ContentReport.findOne({
    where: {
      reporter_id: req.user.id,
      content_type,
      content_id,
    },
  });

  if (existingReport) {
    return res.status(400).json({
      success: false,
      message: "Bạn đã báo cáo nội dung này rồi",
    });
  }

  const report = await ContentReport.create({
    reporter_id: req.user.id,
    content_type,
    content_id,
    reason,
  });

  res.status(201).json({ success: true, data: report });
});

const getReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, content_type } = req.query;
  const offset = (page - 1) * limit;

  const where = {};
  if (status) where.status = status;
  if (content_type) where.content_type = content_type;

  const reports = await ContentReport.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "reporter",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [
      ["status", "ASC"],
      ["created_at", "DESC"],
    ],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    success: true,
    data: reports.rows,
    meta: {
      total: reports.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(reports.count / limit),
    },
  });
});

const updateReport = asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.reportId);
  const { status, admin_note } = req.body;

  const report = await ContentReport.findByPk(reportId);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Report not found",
    });
  }

  await report.update({
    status: status || report.status,
    admin_note: admin_note || report.admin_note,
  });

  res.json({ success: true, data: report });
});

const deleteReportedContent = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const contentId = parseInt(id);

  let content;
  let modelName;

  switch (type) {
    case "discussion":
      content = await QaDiscussion.findByPk(contentId);
      modelName = "Discussion";
      break;
    case "reply":
      content = await QaReply.findByPk(contentId);
      modelName = "Reply";
      break;
    case "review":
      content = await Review.findByPk(contentId);
      modelName = "Review";
      break;
    default:
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
      });
  }

  if (!content) {
    return res.status(404).json({
      success: false,
      message: `${modelName} not found`,
    });
  }

  await content.destroy();

  await ContentReport.update(
    { status: "resolved", admin_note: "Content deleted by admin" },
    {
      where: {
        content_type: type,
        content_id: contentId,
        status: { [require("sequelize").Op.ne]: "resolved" },
      },
    }
  );

  res.json({ success: true, message: `${modelName} deleted successfully` });
});

module.exports = {
  reportContent,
  getReports,
  updateReport,
  deleteReportedContent,
};
