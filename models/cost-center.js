const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const costCenterSchema = new Schema({
  owner: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  name: { type: String, required: true },
  budget: { type: Number },
  spend: { type: Number },
  budgetLimited: { type: Boolean, required: true },
  active: { type: Boolean, default: true, required: true },
  requests: [{ type: mongoose.Types.ObjectId, ref: "Request" }],
});

module.exports = mongoose.model("CostCenter", costCenterSchema);
