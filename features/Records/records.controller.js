const recordsService = require("./records.service");

const getAllRecords = async (req, res, next) => {
  try {
    const result = await recordsService.getAllRecords();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getRecordById = async (req, res, next) => {
  try {
    const result = await recordsService.getRecordById(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const createRecord = async (req, res, next) => {
  try {
    const result = await recordsService.createRecord(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateRecord = async (req, res, next) => {
  try {
    const result = await recordsService.updateRecord(req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const deleteRecord = async (req, res, next) => {
  try {
    await recordsService.deleteRecord(req.params.id);
    res.status(200).json({ success: true, message: "Record deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRecords, getRecordById, createRecord, updateRecord, deleteRecord };