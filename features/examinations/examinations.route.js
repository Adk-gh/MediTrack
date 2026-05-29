//C:\Users\HP\MediTrack\features\examinations\examinations.route.js
const express = require("express");
const router = express.Router();
const examinationsController = require("./examinations.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createExaminationSchema, updateExaminationSchema } = require("./examinations.validation");

// 1. Base route
router.get("/", authorized, examinationsController.getAllExaminations);

// 2. Specific routes MUST go before /:id
router.get("/medical", authorized, examinationsController.getMedicalExaminations);
router.get("/dental", authorized, examinationsController.getDentalExaminations);

// 3. Dynamic parameter routes go last
router.get("/:id", authorized, examinationsController.getExaminationById);

// 4. Mutations
router.post("/", validateData(createExaminationSchema), examinationsController.createExamination);
router.put("/:id", validateData(updateExaminationSchema), examinationsController.updateExamination);
router.delete("/:id", authorized, examinationsController.deleteExamination);

module.exports = router;