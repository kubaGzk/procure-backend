const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const catalogSchema = new Schema({
  name: { type: String, required: true },
  supplier: { type: mongoose.Types.ObjectId, required: true, ref: "Supplier" },
  contract: { type: mongoose.Types.ObjectId, ref: "Contract" },
  items: [{ type: mongoose.Types.ObjectId, ref: "CatalogItem" }],
  active: { type: Boolean, required: true },
});

module.exports = mongoose.model("Catalog", catalogSchema);
