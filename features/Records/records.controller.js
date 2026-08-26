// C:\Users\HP\MediTrack\features\Records\records.controller.js

const recordsService = require('./records.service');

// ============================================================
// HELPERS
// ============================================================

const resolveActorName = (req) => {
  const fullName = [
    req.user?.first_name || req.user?.firstName,
    req.user?.middle_name || req.user?.middleName,
    req.user?.last_name || req.user?.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');

  return fullName || req.user?.email || 'System User';
};

const resolveUserId = (req) => {
  return req.user?.uid || req.user?.id || null;
};

const resolveRecordId = (result, fallback = null) => {
  return (
    result?.id ||
    result?.record?.id ||
    result?.data?.id ||
    result?.user?.id ||
    result?.uid ||
    fallback
  );
};

const resolveArchiveId = (result) => {
  return (
    result?.archiveId ||
    result?.archive_id ||
    result?.archive?.id ||
    result?.archivedItem?.id ||
    null
  );
};

const setAuditData = (res, description, details = {}) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

// ============================================================
// GET ALL RECORDS
// ============================================================

const getAllRecords = async (req, res, next) => {
  try {
    const result = await recordsService.getAllRecords();

    return res.status(200).json({
      success: true,
      data: result,
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
    const result = await recordsService.getRecordById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data: result,
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
    const result = await recordsService.createRecord(
      req.body
    );

    const recordId = resolveRecordId(result);

    const userName = [
      result?.first_name || result?.firstName || req.body?.first_name || req.body?.firstName,
      result?.middle_name || result?.middleName || req.body?.middle_name || req.body?.middleName,
      result?.last_name || result?.lastName || req.body?.last_name || req.body?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    setAuditData(
      res,
      recordId
        ? `Created user record${userName ? ` for ${userName}` : ''} with ID ${recordId}.`
        : `Created a new user record${userName ? ` for ${userName}` : ''}.`,
      {
        operation: 'create_record',
        recordId,
        userName: userName || null,
        email:
          result?.email ||
          req.body?.email ||
          null,
        universityId:
          result?.university_id ||
          result?.universityId ||
          req.body?.university_id ||
          req.body?.universityId ||
          null,
        role:
          result?.role ||
          req.body?.role ||
          null,
        createdBy: resolveActorName(req),
      }
    );

    return res.status(201).json({
      success: true,
      message: 'User Account Initialized.',
      data: result,
    });
  } catch (error) {
    return res.status(
      error.status || error.statusCode || 400
    ).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================
// UPDATE RECORD
// ============================================================

const updateRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recordType } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Record ID is required.',
      });
    }

    if (!recordType) {
      return res.status(400).json({
        success: false,
        message: 'Record type is required.',
      });
    }

    const result = await recordsService.updateRecord(
      id,
      recordType,
      req.body
    );

    const resolvedRecordId = resolveRecordId(
      result,
      id
    );

    setAuditData(
      res,
      `Updated ${recordType} record with ID ${resolvedRecordId}.`,
      {
        operation: 'update_record',
        recordId: resolvedRecordId,
        recordType,
        updatedFields: Object.keys(req.body || {}).filter(
          (field) => field !== 'recordType'
        ),
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      data: result,
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
    const requester = {
      uid: req.user?.uid || null,
      id: req.user?.id || null,
      email: req.user?.email || null,
    };

    if (!requester.uid && !requester.id) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify authenticated user.',
      });
    }

    const result = await recordsService.requestCertificate(
      req.params.id,
      req.body,
      requester
    );

    const recordId = resolveRecordId(
      result,
      req.params.id
    );

    const recordType =
      result?.recordType ||
      result?.record_type ||
      req.body?.recordType ||
      req.body?.record_type ||
      req.body?.type ||
      null;

    setAuditData(
      res,
      `Submitted a certificate request for${recordType ? ` ${recordType}` : ''} record ${recordId}.`,
      {
        operation: 'request_certificate',
        recordId,
        recordType,
        requesterId:
          requester.uid ||
          requester.id,
        requesterEmail: requester.email,
        requestReason:
          req.body?.reason ||
          req.body?.purpose ||
          null,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        'Certificate request submitted successfully. Clinic staff have been notified.',
      data: result,
    });
  } catch (error) {
    console.error(
      '[RecordsController] Certificate request error:',
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
        'Failed to submit certificate request.',
    });
  }
};

// ============================================================
// DELETE / ARCHIVE USER RECORD
// ============================================================

const deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Record ID is required.',
      });
    }

    const deletedBy = {
      id: resolveUserId(req),
      email: req.user?.email || null,
      name: resolveActorName(req),
    };

    const result = await recordsService.deleteRecord(
      id,
      deletedBy
    );

    const recordId = resolveRecordId(result, id);
    const archiveId = resolveArchiveId(result);

    setAuditData(
      res,
      archiveId
        ? `Archived user account and record with ID ${recordId} under archive ID ${archiveId}.`
        : `Archived user account and record with ID ${recordId}.`,
      {
        operation: 'archive_user_record',
        recordId,
        archiveId,
        tableName: 'users',
        archivedBy: deletedBy,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'User Account & Record moved to archives',
      data:
        result || {
          id: recordId,
          archiveId,
        },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// AUTO-ARCHIVE RECORDS
// ============================================================

const autoArchiveRecords = async (req, res, next) => {
  try {
    const dryRun = req.query.dryRun === 'true';

    const archivedByName =
      resolveActorName(req) || 'system';

    const result =
      await recordsService.autoArchiveOldRecords(
        dryRun,
        archivedByName
      );

    const affectedCount =
      result?.archived ??
      result?.count ??
      result?.records?.length ??
      0;

    if (dryRun) {
      setAuditData(
        res,
        `Performed an auto-archive dry run that identified ${affectedCount} record${affectedCount === 1 ? '' : 's'}.`,
        {
          operation: 'auto_archive_dry_run',
          dryRun: true,
          affectedCount,
          performedBy: archivedByName,
        }
      );

      return res.status(200).json({
        success: true,
        message:
          'Dry run complete - these records would be archived',
        data: result,
      });
    }

    setAuditData(
      res,
      `Automatically archived ${affectedCount} record${affectedCount === 1 ? '' : 's'}.`,
      {
        operation: 'auto_archive_records',
        dryRun: false,
        archivedCount: affectedCount,
        archivedBy: archivedByName,
        archivedRecordIds: Array.isArray(result?.records)
          ? result.records
              .map((record) => record?.id)
              .filter(Boolean)
          : [],
      }
    );

    return res.status(200).json({
      success: true,
      message: `Archived ${affectedCount} records`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ARCHIVE MEDICAL RECORD
// ============================================================

const archiveMedicalRecord = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Medical record ID is required.',
      });
    }

    const result =
      await recordsService.archiveRecord(
        id,
        'medical'
      );

    const recordId = resolveRecordId(result, id);
    const archiveId = resolveArchiveId(result);

    setAuditData(
      res,
      archiveId
        ? `Archived medical record with ID ${recordId} under archive ID ${archiveId}.`
        : `Archived medical record with ID ${recordId}.`,
      {
        operation: 'archive_medical_record',
        recordId,
        archiveId,
        recordType: 'medical',
        tableName: 'medical_records',
        archivedBy: {
          id: resolveUserId(req),
          email: req.user?.email || null,
          name: resolveActorName(req),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Medical record archived successfully',
      data: result,
    });
  } catch (error) {
    console.error(
      '[RecordsController] Error archiving medical record:',
      error
    );

    next(error);
  }
};

// ============================================================
// ARCHIVE DENTAL RECORD
// ============================================================

const archiveDentalRecord = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Dental record ID is required.',
      });
    }

    const result =
      await recordsService.archiveRecord(
        id,
        'dental'
      );

    const recordId = resolveRecordId(result, id);
    const archiveId = resolveArchiveId(result);

    setAuditData(
      res,
      archiveId
        ? `Archived dental record with ID ${recordId} under archive ID ${archiveId}.`
        : `Archived dental record with ID ${recordId}.`,
      {
        operation: 'archive_dental_record',
        recordId,
        archiveId,
        recordType: 'dental',
        tableName: 'dental_records',
        archivedBy: {
          id: resolveUserId(req),
          email: req.user?.email || null,
          name: resolveActorName(req),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Dental record archived successfully',
      data: result,
    });
  } catch (error) {
    console.error(
      '[RecordsController] Error archiving dental record:',
      error
    );

    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAllRecords,
  getRecordById,
  createRecord,
  requestCertificate,
  updateRecord,
  deleteRecord,
  autoArchiveRecords,
  archiveMedicalRecord,
  archiveDentalRecord,
};