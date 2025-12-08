const PDFDocument = require("pdfkit");
const asyncHandler = require("../utils/asyncHandler");
const { Enrollment, Course, User, InstructorProfile, Certificate } = require("../models");

const downloadCertificate = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const studentId = req.user.id;

  const enrollment = await Enrollment.findOne({
    where: {
      course_id: courseId,
      student_id: studentId,
      status: "completed",
    },
    include: [
      {
        model: Course,
        as: "course",
        attributes: ["title", "instructor_id"],
        include: [
          {
            model: User,
            as: "instructor",
            attributes: ["full_name"],
          },
        ],
      },
      {
        model: User,
        as: "student",
        attributes: ["full_name"],
      },
      {
        model: Certificate,
        as: "certificate",
      },
    ],
  });

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found or course not completed",
    });
  }

  const doc = new PDFDocument({
    layout: "landscape",
    size: "A4",
  });

  const filename = `Certificate-${enrollment.course.title
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()}.pdf`;

  res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-type", "application/pdf");

  doc.pipe(res);

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f0f9ff");
  doc.lineWidth(20);
  doc.strokeColor("#3b82f6");
  doc.rect(0, 0, doc.page.width, doc.page.height).stroke();

  // Content
  doc.moveDown(2);
  doc.font("Helvetica-Bold").fontSize(40).fillColor("#1e3a8a").text("CERTIFICATE", {
    align: "center",
  });
  
  doc.font("Helvetica").fontSize(20).fillColor("#64748b").text("OF COMPLETION", {
    align: "center",
  });

  doc.moveDown(2);
  doc.font("Helvetica").fontSize(16).fillColor("#334155").text("This is to certify that", {
    align: "center",
  });

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(30).fillColor("#0f172a").text(enrollment.student.full_name, {
    align: "center",
  });

  doc.moveDown(1);
  doc.font("Helvetica").fontSize(16).fillColor("#334155").text("has successfully completed the course", {
    align: "center",
  });

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(25).fillColor("#0f172a").text(enrollment.course.title, {
    align: "center",
  });

  doc.moveDown(2);
  const completedDate = enrollment.certificate?.issued_at
    ? new Date(enrollment.certificate.issued_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : (enrollment.completed_at
      ? new Date(enrollment.completed_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString());

  doc.font("Helvetica").fontSize(14).fillColor("#475569").text(`Date: ${completedDate}`, {
    align: "center",
  });

  if (enrollment.certificate?.certificate_code) {
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#94a3b8").text(`Certificate Code: ${enrollment.certificate.certificate_code}`, {
      align: "center",
    });
  }

  doc.moveDown(3);
  
  // Signatures
  const startY = doc.y;
  
  doc.text("______________________", 100, startY);
  doc.text("______________________", doc.page.width - 300, startY);
  
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text(enrollment.course.instructor.full_name, 100, doc.y, { width: 200, align: 'center' });
  doc.text("EngLearning Platform", doc.page.width - 300, doc.y - 14, { width: 200, align: 'center' }); // -14 to align with instructor name line height
  
  doc.font("Helvetica-Bold");
  doc.text("Instructor", 100, doc.y + 5, { width: 200, align: 'center' });
  doc.text("Director", doc.page.width - 300, doc.y + 5, { width: 200, align: 'center' });

  doc.end();
});

module.exports = {
  downloadCertificate,
};
