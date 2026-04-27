const mongoose = require("mongoose");

const examinationsSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    middleName: String,
    suffix: String,
    studentId: String,
    schoolYear: String,
    course: String,
    yearSection: String,
    address: String,
    birthday: String,
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },
    age: Number,
    contactNo: String,
    email: String,
    civilStatus: {
      type: String,
      enum: ["Single", "Married", "Widowed", "Divorced"],
      default: "Single",
    },
    emergencyName: String,
    emergencyRelation: String,
    emergencyPhone: String,
    medicalConditions: [String],
    surgicalHistory: [{
      name: String,
      date: String,
    }],
    bp: String,
    pr: String,
    rr: String,
    temp: String,
    wt: String,
    ht: String,
    waist: String,
    lmp: String,
    nurse: String,
    physician: String,
    remarks: String,
    logs: [{
      date: String,
      vitals: String,
      bodyMeasure: String,
      staff: String,
      remarks: String,
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Examination", examinationsSchema);