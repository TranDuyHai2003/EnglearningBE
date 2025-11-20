const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { slugify } = require("../utils/slugify");
const Busboy = require("busboy");
const uploadDirs = {
  avatars: path.join(__dirname, "../../uploads/avatars"),
  cvs: path.join(__dirname, "../../uploads/cvs"),
  certificates: path.join(__dirname, "../../uploads/certificates"),
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const fixUtf8 = (req, res, next) => {
  if (!req.headers["content-type"]?.includes("multipart/form-data")) {
    return next();
  }

  const busboy = Busboy({ headers: req.headers });

  busboy.on("field", (fieldname, val) => {
    if (!req.body) req.body = {};
    req.body[fieldname] = val;
  });

  busboy.on("file", (fieldname, file, G) => {
    // filenameInfo.filename chứa tên file đã được decode đúng UTF-8
    const { filename, encoding, mimeType } = G;
    // Gán lại tên file đã được decode đúng vào stream của file
    // để multer có thể đọc được
    file.hapi = {
      filename: filename,
      headers: {
        "content-disposition": `form-data; name="${fieldname}"; filename="${filename}"`,
      },
    };

    // Đẩy file stream này vào request để multer có thể bắt được
    if (!req.files) req.files = [];
    if (!req.file) req.file = file;
    req.files.push(file);
  });

  busboy.on("finish", () => {
    next();
  });

  req.pipe(busboy);
};

const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const userId = req.user?.id || "anonymous";
      const timestamp = Date.now();

      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);

      const sanitizedFilename = slugify(baseName);

      const uniqueFilename = `${userId}_${timestamp}_${sanitizedFilename}${extension}`;

      cb(null, uniqueFilename);
    },
  });
};

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

const uploadAvatar = multer({
  storage: createStorage(uploadDirs.avatars),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("avatar");

const uploadCV = multer({
  storage: createStorage(uploadDirs.cvs),
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("cv");

const uploadCertificate = multer({
  storage: createStorage(uploadDirs.certificates),
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).array("certificates", 5);

const handleUploadErrors = (uploadMiddleware) => {
  return (req, res, next) => {
    fixUtf8(req, res, () => {
      uploadMiddleware(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              message: "File size exceeds the limit",
            });
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
              success: false,
              message: "Unexpected field name",
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
        next();
      });
    });
  };
};

module.exports = {
  uploadAvatar: handleUploadErrors(uploadAvatar),
  uploadCV: handleUploadErrors(uploadCV),
  uploadCertificate: handleUploadErrors(uploadCertificate),
};
