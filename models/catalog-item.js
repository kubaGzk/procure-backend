const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const catalogItemSchema = new Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: mongoose.Types.ObjectId, required: true, ref: "Category" },
  description: { type: String, required: true },
  catalog: { type: mongoose.Types.ObjectId, required: true, ref: "Catalog" },
  supplier: { type: mongoose.Types.ObjectId, required: true, ref: "Supplier" },
});

module.exports = mongoose.model("CatalogItem", catalogItemSchema);
