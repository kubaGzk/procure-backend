const mongoose = require("mongoose");
const { MongooseAutoIncrementID } = require("mongoose-auto-increment-reworked");

const Schema = mongoose.Schema;

const requestSchema = new Schema({
  title: { type: String },
  description: { type: String },
  value: { type: Number, required: true },
  task: { type: mongoose.Types.ObjectId, ref: "Task" },
  requestId: { type: String },
  orders: [{ type: mongoose.Types.ObjectId, ref: "Order" }],
  items: [
    {
      id: { type: mongoose.Types.ObjectId, required: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      category: {
        name: { type: String, required: true },
        id: { type: mongoose.Types.ObjectId, required: true },
      },
      catalog: {
        name: { type: String, required: true },
        id: { type: mongoose.Types.ObjectId, required: true },
      },
      supplier: {
        name: { type: String, required: true },
        id: { type: mongoose.Types.ObjectId, required: true },
        supplierId: { type: String, required: true },
      },
    },
  ],
  creationDate: { type: Date, required: true },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  costCenter: {
    type: mongoose.Types.ObjectId,
    ref: "CostCenter",
  },
  submitDate: { type: Date },
  status: {
    type: String,
    default: "draft",
    enum: ["draft", "submitted", "approved", "declined"],
    required: true,
  },
  history: [
    {
      type: {
        type: String,
        default: "action",
        enum: [
          "action",
          "create",
          "edit",
          "submit",
          "withdraw",
          "approve",
          "decline",
          "order",
    
        ],
      },
      user: { type: mongoose.Types.ObjectId, ref: "User" },
      comments: { type: String },
      date: { type: Date },
    },
  ],
  address: {
    country: { type: String },
    postalCode: { type: String },
    city: { type: String },
    street: { type: String },
    houseNumber: { type: String },
    details: { type: String },
  },
});

MongooseAutoIncrementID.initialise("RequestID");

const plugin = new MongooseAutoIncrementID(requestSchema, "Request", {
  field: "ind",
  unique: true,
  startAt: 1,
});

plugin.applyPlugin().catch((err) => {
  throw new Error("Internal Plugin error, cannot perform action.", err);
});

module.exports = mongoose.model("Request", requestSchema);
