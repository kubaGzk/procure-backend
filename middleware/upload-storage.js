const fs = require("fs");
const { v4: uuid } = require("uuid");
const aws = require("aws-sdk");
const path = require("path");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const getDestination = (req, file, cb) => {
  cb(null, "temp/null");
};

const getFileName = (req, file, cb) => {
  cb(null, uuid());
};

const getS3 = (req, file, cb) => {
  cb("No S3 Data");
};

function CustomStorage(opts) {
  this.getDestination = opts.destination || getDestination;
  this.getFileName = opts.filename || getFileName;
  this.getS3 = opts.s3 || getS3;
}

CustomStorage.prototype._handleFile = function _handleFile(req, file, cb) {
  const that = this;

  that.getDestination(req, file, (err, destination) => {
    if (err) return cb(err);

    console.log(destination);

    that.getFileName(req, file, (err, filename) => {
      if (err) return cb(err);

      if (MIME_TYPE_MAP.hasOwnProperty(file.mimetype)) {
        //S3

        console.log("S3")

        that.getS3(req, file, (err, credentials) => {
          if (err) return cb(err);

          aws.config.setPromisesDependency();

          aws.config.update({
            accessKeyId: credentials.accessKey,
            secretAccessKey: credentials.secretKey,
            region: credentials.region,
          });

          const s3 = new aws.S3();

          const s3Stream = require("s3-upload-stream")(s3);

          const upload = s3Stream.upload({
            Bucket: credentials.bucketName,
            ACL: "public-read-write",
            Key: filename,
          });

          upload.maxPartSize(20971520);
          upload.concurrentParts(5);

          file.stream.pipe(upload);

          upload.on("error", (err) => {
            console.log(err);
            cb(err);
          });

          upload.on("part", (details) => {
            console.log(details);
          });

          upload.on("uploaded", (resp) => {
            console.log(resp), cb(null, resp);
          });
        });
      } else {
        //Local

        console.log("Local")

        const finalPath = path.join(destination, filename);
        const outStream = fs.createWriteStream(finalPath);

        file.stream.pipe(outStream);
        outStream.on("error", cb);
        outStream.on("finish", () => {
          cb(null, {
            destination: destination,
            filename: filename,
            path: finalPath,
            size: outStream.bytesWritten,
          });
        });
      }
    });
  });
};

CustomStorage.prototype._removeFile = function _removeFile(req, file, cb) {
  fs.unlink(file.path, cb);
};

module.exports = (opts) => new CustomStorage(opts);
