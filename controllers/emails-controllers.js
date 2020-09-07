const nodemailer = require("nodemailer");
const pdfGenerator = require("./pdf-controllers");
const fs = require("fs");

const Supplier = require("../models/supplier");

const sendOrder = (orderData) =>
  new Promise(async (resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "procurepurchaseorders@gmail.com",
        pass: "Procure1Admin2",
      },
    });
    const supplier = await Supplier.findById(orderData.supplier.id);
    if (!supplier) {
      reject("Could not find supplier");
    }
    let orderPath;
    let htmlStream;
    try {
      orderPath = pdfGenerator.generateOrder(orderData);
      htmlStream = fs.createReadStream('./email/email.html');
    } catch (err) {
      console.log(err);
    }
    const mailOptions = {
      from: "procurepurchaseorder@gmail.com",
      to: supplier.contact.email,
      subject: `Purchase order ${orderData.orderId}`,
      text: "Your partner is sending you new purchase order. PDF copy attached.",
      html: htmlStream,
      attachments: [
        {
          filename: `Order_${orderData.orderId}.pdf`,
          path: orderPath,
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(`Could not send message. ${err}`);
        fs.unlink(orderPath, (err) => err && console.log(err));
        reject(err);
      } else {
        console.log(`Message has been sent. ${info}`);
        fs.unlink(orderPath, (err) => err && console.log(err));
        resolve(info);
      }
    });
  });

exports.sendOrder = sendOrder;
