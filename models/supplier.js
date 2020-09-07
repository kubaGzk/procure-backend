const mongoose = require("mongoose");
const { MongooseAutoIncrementID } = require("mongoose-auto-increment-reworked");

const Schema = mongoose.Schema;

const supplierSchema = new Schema({
  name: { type: String, required: true },
  address: {
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    houseNumber: { type: String, required: true },
    details: { type: String },
  },
  contact: {
    email: { type: String, required: true, trim: true },
    phone: { type: String },
  },
  active: { type: Boolean, required: true },
  orders: [{ type: mongoose.Types.ObjectId, required: true, ref: "Order" }],
  contracts: [
    { type: mongoose.Types.ObjectId, required: true, ref: "Contract" },
  ],
  catalogs: [{ type: mongoose.Types.ObjectId, required: true, ref: "Catalog" }],
  supplierId: { type: String },
});

MongooseAutoIncrementID.initialise("SupplierID");

const plugin = new MongooseAutoIncrementID(supplierSchema, "Supplier", {
  field: "ind",
  unique: true,
  startAt: 1
});

plugin
  .applyPlugin()
  .catch((err) => {
    throw new Error("Internal Plugin error, cannot perform action.", err);
  });

module.exports = mongoose.model("Supplier", supplierSchema);
