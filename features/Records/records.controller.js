// C:\Users\HP\MediTrack\features\Records\records.controller.js
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
    res.status(201).json({ success: true, message: 'User Account Initialized.', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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
    res.status(200).json({ success: true, message: "User Account & Record deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRecords, getRecordById, createRecord, updateRecord, deleteRecord };