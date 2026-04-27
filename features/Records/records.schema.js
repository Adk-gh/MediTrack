const mongoose = require("mongoose");

const recordsSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["student", "instructor", "staff"],
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    history: [{
      type: String,
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Record", recordsSchema);