// C:\Users\HP\MediTrack\features\Records\records.controller.js

const recordsService = require("./records.service");



// ============================================================
// GET ALL RECORDS
// ============================================================

const getAllRecords = async (req, res, next) => {
  try {
    const result = await recordsService.getAllRecords();

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// GET RECORD BY ID
// ============================================================

const getRecordById = async (req, res, next) => {
  try {
    const result =
      await recordsService.getRecordById(req.params.id);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// CREATE RECORD
// ============================================================

const createRecord = async (req, res, next) => {
  try {
    const result =
      await recordsService.createRecord(req.body);

    res.status(201).json({
      success: true,
      message: "User Account Initialized.",
      data: result
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


// ============================================================
// UPDATE RECORD
// ============================================================

const updateRecord = async (req, res, next) => {
  try {
    const result =
      await recordsService.updateRecord(
        req.params.id,
        req.body
      );

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// REQUEST CERTIFICATE
// ============================================================

const requestCertificate = async (req, res, next) => {
  try {
    /*
     * req.user is populated by the authorized middleware.
     *
     * Depending on your authentication middleware,
     * uid should normally be the Supabase Auth UID.
     */

    const requester = {
      uid: req.user?.uid || null,
      id: req.user?.id || null,
      email: req.user?.email || null,
    };

    if (!requester.uid && !requester.id) {
      return res.status(401).json({
        success: false,
        message: "Unable to identify authenticated user."
      });
    }

    const result =
      await recordsService.requestCertificate(
        req.params.id,
        req.body,
        requester
      );

    return res.status(200).json({
      success: true,
      message:
        "Certificate request submitted successfully. Clinic staff have been notified.",
      data: result
    });

  } catch (error) {
    console.error(
      "[RecordsController] Certificate request error:",
      error
    );

    const status =
      error.status ||
      error.statusCode ||
      500;

    return res.status(status).json({
      success: false,
      message:
        error.message ||
        "Failed to submit certificate request."
    });
  }
};


// ============================================================
// DELETE RECORD
// ============================================================

const deleteRecord = async (req, res, next) => {
  try {
    const deletedBy = {
      id: req.user?.uid,
      email: req.user?.email
    };

    await recordsService.deleteRecord(
      req.params.id,
      deletedBy
    );

    res.status(200).json({
      success: true,
      message:
        "User Account & Record moved to archives"
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// AUTO-ARCHIVE
// ============================================================

const autoArchiveRecords = async (req, res, next) => {
  try {
    const { dryRun } = req.query;

    const archivedByName =
      `${req.user?.first_name || ''} ${req.user?.last_name || ''}`
        .trim() ||
      req.user?.email ||
      "system";

    const result =
      await recordsService.autoArchiveOldRecords(
        dryRun === "true",
        archivedByName
      );

    if (dryRun === "true") {
      return res.status(200).json({
        success: true,
        message:
          "Dry run complete - these records would be archived",
        data: result
      });
    }

    return res.status(200).json({
      success: true,
      message:
        `Archived ${result.archived} records`,
      data: result
    });

  } catch (error) {
    next(error);
  }
};


module.exports = {
  getAllRecords,
  getRecordById,
  createRecord,
  requestCertificate,
  updateRecord,
  deleteRecord,
  autoArchiveRecords
};