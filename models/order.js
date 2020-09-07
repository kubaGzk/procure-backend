const mongoose = require("mongoose");
const { MongooseAutoIncrementID } = require("mongoose-auto-increment-reworked");

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  value: { type: Number, required: true },
  orderId: { type: String },
  request: { type: mongoose.Types.ObjectId, ref: "Request", required: true },
  items: [
    {
      catalogItemId: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
    },
  ],
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  orderDate: { type: Date, required: true },
  address: {
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    houseNumber: { type: String, required: true },
    details: { type: String },
  },
  supplier: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    supplierId: { type: String, required: true },
  },
  orderSent: { type: Boolean, required: true },
});

MongooseAutoIncrementID.initialise("OrderID");

const plugin = new MongooseAutoIncrementID(orderSchema, "Order", {
  field: "ind",
  unique: true,
  startAt: 1,
});

plugin.applyPlugin().catch((err) => {
  throw new Error("Internal Plugin error, cannot perform action.", err);
});

module.exports = mongoose.model("Order", orderSchema);
