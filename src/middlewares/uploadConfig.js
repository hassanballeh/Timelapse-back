const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { UPLOAD_DIR } = require("../utils/directories");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"), false);
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

module.exports = upload;
