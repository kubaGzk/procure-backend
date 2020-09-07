const { v4: uuid } = require("uuid");
const multer = require("multer");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "text/csv": "csv",
  "application/vnd.ms-excel": "csv",
};

const fileUpload = multer({
  limits: 50000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.mimetype === "text/csv") {
        cb(null, "temp/csv");
      } else {
        cb(null, "uploads/images");
      }
    },
    filename: (req, file, cb) => {
      cb(null, uuid() + "." + MIME_TYPE_MAP[file.mimetype]);
    },
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type!");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
