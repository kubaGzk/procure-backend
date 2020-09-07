const fs = require("fs");
const PDFDocument = require("pdfkit");

const generateOrder = (orderData) => {
  let order = new PDFDocument({ size: "A4", margin: 50 });
  generateHeader(order, orderData);
  generateCreatorInformation(order, orderData);
  generateItemsTable(order, orderData);

  order.end();

  const path = "./temp/pdf/" + orderData.orderId + ".pdf";

  try {
    order.pipe(fs.createWriteStream(path));
  } catch (err) {
    console.log(err);
  }
  return path;
};

const generateHeader = (order, orderData) => {
  order
    .fontSize(40)
    .text("ProCure", 50, 50)
    .fontSize(20)
    .text(orderData.supplier.name, 200, 50, { align: "right" })
    .text(`Internal ID: ${orderData.supplier.supplierId}`, 200, 75, {
      align: "right",
    })
    .moveDown();
};
const generateCreatorInformation = (order, orderData) => {
  const address = orderData.address;

  order
    .fillColor("#444444")
    .fontSize(20)
    .text(`Purchase order ${orderData.orderId}`, 50, 160);

  generateHr(order, 185);

  order
    .fontSize(10)
    .text(`Orderer: ${orderData.creator.name}`, 50, 200)
    .text(`Order title: ${orderData.title}`, 50, 215)
    .text(`Order date: ${formatDate(orderData.orderDate)}`, 50, 230)
    .text(`Order value: ${orderData.value.toFixed(2)}`, 50, 245)

    .text("Delivery address:", 330, 200)
    .text(`${address.street} ${address.houseNumber}`, 330, 215)
    .text(`${address.postalCode} ${address.city}`, 330, 230)
    .text(address.country, 330, 245)
    .moveDown();

  generateHr(order, 265);

  order.text(`Description: ${orderData.description}`, 50, 275).moveDown();
};

const generateItemsTable = (order, orderData) => {
  order.font("Helvetica-Bold");

  let tableTop = 360;
  generateTableRow(
    order,
    tableTop,
    "Name",
    "Description",
    "Price",
    "Quantity",
    "Line Total"
  );

  generateHr(order, tableTop + 20);
  order.font("Helvetica");

  tableTop += 30;

  for (let item of orderData.items) {
    generateTableRow(
      order,
      tableTop,
      item.name,
      item.description,
      item.price,
      item.quantity,
      (item.price * item.quantity).toFixed(2)
    );

    tableTop = Math.round(
      tableTop + calculateLines(item.name, item.description) + 30
    );

    generateHr(order, tableTop - 10);
  }

  generateTableRow(
    order,
    tableTop,
    "",
    "",
    "Subtotal",
    "",
    orderData.value.toFixed(2)
  );
};

function generateTableRow(doc, y, name, description, price, quantity, total) {
  doc
    .fontSize(10)
    .text(name, 50, y, { width: 125 })
    .text(description, 180, y, { width: 145 })
    .text(price, 330, y, { width: 60, align: "right" })
    .text(quantity, 390, y, { width: 60, align: "right" })
    .text(total, 0, y, { align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return year + "/" + month + "/" + day;
}

function calculateLines(name, description) {
  const namePoints = Math.floor(name.length / 25) * 20;
  const descPoints = Math.floor(description.length / 30) * 20;

  return namePoints > descPoints ? namePoints : descPoints;
}

exports.generateOrder = generateOrder;
