const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { slugify } = require("../utils/slugify");
// const Busboy = require("busboy"); // Xóa dòng này, không cần thiết

const uploadDirs = {
  avatars: path.join(__dirname, "../../uploads/avatars"),
  cvs: path.join(__dirname, "../../uploads/cvs"),
  certificates: path.join(__dirname, "../../uploads/certificates"),
};

// Tạo thư mục nếu chưa tồn tại
Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- HÀM QUAN TRỌNG: Tạo storage và xử lý UTF-8 ---
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const userId = req.user?.id || "anonymous";
      const timestamp = Date.now();

      // --- FIX LỖI FONT TIẾNG VIỆT (UTF-8) TẠI ĐÂY ---
      // Multer thường nhận tên file dưới dạng latin1 (ISO-8859-1),
      // ta cần chuyển nó về Buffer rồi ép sang utf8.
      const originalName = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      );

      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);

      // Slugify tên file để an toàn (vd: "Tài Liệu.pdf" -> "tai-lieu")
      const sanitizedFilename = slugify(baseName);

      const uniqueFilename = `${userId}_${timestamp}_${sanitizedFilename}${extension}`;

      cb(null, uniqueFilename);
    },
  });
};

// --- Các bộ lọc file (Giữ nguyên) ---
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and Word documents are allowed"));
  }
};

// --- Cấu hình Multer ---
const uploadAvatar = multer({
  storage: createStorage(uploadDirs.avatars),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("avatar");

const uploadCV = multer({
  storage: createStorage(uploadDirs.cvs),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("cv");

const uploadCertificate = multer({
  storage: createStorage(uploadDirs.certificates),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array("certificates", 5);

const handleUploadErrors = (uploadMiddleware) => {
  return (req, res, next) => {
    // Gọi middleware upload của multer
    uploadMiddleware(req, res, (err) => {
      // 1. Xử lý lỗi Multer (Giữ nguyên code cũ)
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ success: false, message: "File size exceeds the limit" });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res
            .status(400)
            .json({
              success: false,
              message: "Unexpected field name or too many files",
            });
        }
        return res.status(400).json({ success: false, message: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      // 2. === FIX LỖI FONT DB Ở ĐÂY ===
      // Chuyển đổi tên file trong object req.file để Controller nhận được chuỗi đúng
      if (req.file) {
        req.file.originalname = Buffer.from(
          req.file.originalname,
          "latin1"
        ).toString("utf8");
      }

      // Xử lý trường hợp upload nhiều file (req.files)
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach((file) => {
            file.originalname = Buffer.from(
              file.originalname,
              "latin1"
            ).toString("utf8");
          });
        } else {
          // Trường hợp req.files là object (fields)
          Object.values(req.files)
            .flat()
            .forEach((file) => {
              file.originalname = Buffer.from(
                file.originalname,
                "latin1"
              ).toString("utf8");
            });
        }
      }

      // 3. Chuyển sang Controller xử lý
      next();
    });
  };
};

module.exports = {
  uploadAvatar: handleUploadErrors(uploadAvatar),
  uploadCV: handleUploadErrors(uploadCV),
  uploadCertificate: handleUploadErrors(uploadCertificate),
};
