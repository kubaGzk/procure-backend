const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const taskSchema = new Schema({
  type: { type: String, enum: ["approve", "addFile"], default: "approve" },
  owner: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
  request: { type: mongoose.Types.ObjectId, ref: "Request" },
  contract: { type: mongoose.Types.ObjectId, ref: "Contract" },
  submitDate: { type: Date },
  status: {
    type: String,
    default: "draft",
    enum: ["draft", "pending", "approved", "declined"],
  },
  completionDate: { type: Date },
});

module.exports = mongoose.model("Task", taskSchema);
