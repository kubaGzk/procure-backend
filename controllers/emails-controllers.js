const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const pdfGenerator = require("./pdf-controllers");
const fs = require("fs");

const Supplier = require("../models/supplier");

const sendOrder = (orderData) =>
  new Promise(async (resolve, reject) => {
    const oauth2Client = new OAuth2(
      process.env.OAUTH2_CLIENT,
      process.env.OAUTH2_CLIENT_SEC,
      process.env.OAUTH2_REDIRECT_URL
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.OAUTH2_REF_TOKEN,
    });
    let accessToken
    try {
      accessToken = await oauth2Client.getAccessToken();
    } catch (err) {
      console.log(err);
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "procurepurchaseorders@gmail.com",
        clientId: process.env.OAUTH2_CLIENT,
        clientSecret: process.env.OAUTH2_CLIENT_SEC,
        refreshToken: process.env.OAUTH2_REF_TOKEN,
        accessToken: accessToken,
      },
      tls: {
        rejectUnauthorized: false,
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
      htmlStream = fs.createReadStream("./email/email.html");
    } catch (err) {
      console.log(err);
    }
    const mailOptions = {
      from: "procurepurchaseorder@gmail.com",
      to: supplier.contact.email,
      subject: `Purchase order ${orderData.orderId}`,
      text:
        "Your partner is sending you new purchase order. PDF copy attached.",
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
