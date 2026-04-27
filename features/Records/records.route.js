const express = require("express");
const router = express.Router();
const recordsController = require("./records.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createRecordSchema, updateRecordSchema } = require("./records.validation");

router.get("/", authorized, recordsController.getAllRecords);
router.get("/:id", authorized, recordsController.getRecordById);
router.post("/", validateData(createRecordSchema), recordsController.createRecord);
router.put("/:id", validateData(updateRecordSchema), recordsController.updateRecord);
router.delete("/:id", authorized, recordsController.deleteRecord);

module.exports = router;