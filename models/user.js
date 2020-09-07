const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, trim: true, unique: true },
  password: { type: String, required: true },
  active: {type: Boolean, required: true},
  role: [{
    type: String,
    default: "basic",
    enum: ["basic", "contract", "request", "report", "admin"],
  }],
  requests: [{ type: mongoose.Types.ObjectId, required: true, ref: "Request" }],
  contracts: [
    { type: mongoose.Types.ObjectId, required: true, ref: "Contract" },
  ],
  tasks: [{ type: mongoose.Types.ObjectId, required: true, ref: "Task" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
