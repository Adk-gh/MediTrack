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
    const deletedBy = {
      id: req.user?.uid,
      email: req.user?.email
    };
    await recordsService.deleteRecord(req.params.id, deletedBy);
    res.status(200).json({ success: true, message: "User Account & Record moved to archives" });
  } catch (error) {
    next(error);
  }
};

// Auto-archive old records based on retention policy
const autoArchiveRecords = async (req, res, next) => {
  try {
    const { dryRun } = req.query; // Optional: pass ?dryRun=true to see what would be archived

    const archivedByName = `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() || req.user?.email || 'system';

    const result = await recordsService.autoArchiveOldRecords(dryRun === 'true', archivedByName);

    if (dryRun === 'true') {
      res.status(200).json({
        success: true,
        message: 'Dry run complete - these records would be archived',
        data: result
      });
    } else {
      res.status(200).json({
        success: true,
        message: `Archived ${result.archived} records`,
        data: result
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRecords, getRecordById, createRecord, updateRecord, deleteRecord, autoArchiveRecords };