const { v4: uuid } = require("uuid");
const multer = require("multer");
const uploadStorage = require("./upload-storage");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "text/csv": "csv",
  "application/vnd.ms-excel": "csv",
};

const fileUpload = multer({
  limits: 50000,
  storage: uploadStorage({
    destination: (req, file, cb) => {
        cb(null, "temp/csv");

    },
    filename: (req, file, cb) => {
      cb(null, uuid() + "." + MIME_TYPE_MAP[file.mimetype]);
    },
    s3: (req, file, cb) => {
      cb(null, {
        accessKey: process.env.AWS_ACC_KEY,
        secretKey: process.env.AWS_SEC_KEY,
        bucketName: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION,
      });
    },
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type!");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
