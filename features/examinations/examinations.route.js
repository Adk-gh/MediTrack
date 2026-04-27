const express = require("express");
const router = express.Router();
const examinationsController = require("./examinations.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createExaminationSchema, updateExaminationSchema } = require("./examinations.validation");

router.get("/", authorized, examinationsController.getAllExaminations);
router.get("/:id", authorized, examinationsController.getExaminationById);
router.post("/", validateData(createExaminationSchema), examinationsController.createExamination);
router.put("/:id", validateData(updateExaminationSchema), examinationsController.updateExamination);
router.delete("/:id", authorized, examinationsController.deleteExamination);

module.exports = router;