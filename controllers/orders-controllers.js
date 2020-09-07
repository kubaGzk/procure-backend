const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Request = require("../models/request");
const Order = require("../models/order");
const pdfGenerator = require("../controllers/pdf-controllers");
const process = require("process");
const fs = require("fs");
const archiver = require("archiver");

const getOrdersPdf = async (req, res, next) => {
  let searchedRequest;

  const pdfPaths = [];
  try {
    searchedRequest = await Request.findById(req.params.rid)
      .populate("orders")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!searchedRequest) {
    return next(new HttpError("Could not find request for provided ID.", 404));
  }

  if (
    searchedRequest.owner !== req.user.id &&
    req.user.role.indexOf("admin") === -1 &&
    req.user.role.indexOf("report") === -1
  ) {
    return next(
      new HttpError("You are not authorized to view this data.", 401)
    );
  }

  try {
    //generating orders

    for (let order of searchedRequest.orders) {
      const address = pdfGenerator.generateOrder(order);
      pdfPaths.push(address);
    }
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  let fileToSend;

  try {
    if (pdfPaths.length > 1) {
      let fileName = "";

      for (const path of pdfPaths) {
        fileName += path.slice(path.length - 10, path.length - 4);
      }

      fileToSend = "/temp/zip/" + fileName + ".zip";

      const output = fs.createWriteStream(process.cwd() + "" + fileToSend);
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          console.log(err);
        } else {
          throw err;
        }
      });

      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(output);

      for (const path of pdfPaths) {
        archive.append(fs.createReadStream(path), {
          name: path.slice(path.length - 10, path.length - 4) + ".pdf",
        });
      }

      archive.finalize();
    } else {
      fileToSend = pdfPaths[0];
    }

    console.log(fileToSend);

    const options = {
      root: process.cwd(),
      headers: { "Content-Type": "application/pdf" },
    };

    res
      .type("application/pdf")
      .status(200)
      .download(fileToSend, "Order.pdf", options);
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }
};

const getOrderPdf = async (req, res, next) => {
  const orderId = req.params.oid;
  let searchedOrder;
  try {
    searchedOrder = await Order.findById(orderId).exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!searchedOrder) {
    return next(new HttpError("Could not find order for provided ID.", 404));
  }

  if (
    searchedOrder.creator !== req.user.id &&
    req.user.role.indexOf("admin") === -1 &&
    req.user.role.indexOf("report") === -1
  ) {
    return next(
      new HttpError("You are not authorized to view this data.", 401)
    );
  }

  let address;

  try {
    //generating order
    address = pdfGenerator.generateOrder(searchedOrder);
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  const options = {
    headers: {
      root: process.cwd(),
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${searchedOrder.orderId}.pdf`,
      "Content-Transfer-Encoding": "Binary",
    },
  };

  res.status(200).download(address, "name.pdf", options, (err) => {
    if (err) {
      return next(
        new HttpError(
          `Could not perform this action, please check your data and try again later. ${err}`,
          500
        )
      );
    } else {
      console.log("File sent");
    }
  });
};

const markSent = async (req, res, next) => {
  const orderId = req.params.oid;

  let searchedOrder;

  try {
    searchedOrder = await Order.findById(orderId)
      .populate("creator", "name id")
      .exec();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  if (!searchedOrder) {
    return next(new HttpError("Could not find order for provided ID.", 404));
  }

  if (searchedOrder.orderSent) {
    return next(
      new HttpError("Cannot perform this action on already sent order.", 406)
    );
  }

  if (
    searchedOrder.creator !== req.user.id &&
    req.user.role.indexOf("admin") === -1
  ) {
    return next(
      new HttpError("You are not authorized to view this data.", 401)
    );
  }

  try {
    searchedOrder.orderSent = true;
    await searchedOrder.save();
  } catch (err) {
    return next(
      new HttpError(
        `Could not perform this action, please check your data and try again later. ${err}`,
        500
      )
    );
  }

  res.json({
    message: `Order ${searchedOrder.orderId} has been marked as sent.`,
  });
};

exports.getOrderPdf = getOrderPdf;
exports.getOrdersPdf = getOrdersPdf;
exports.markSent = markSent;
