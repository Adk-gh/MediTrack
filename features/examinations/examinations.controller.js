// C:\Users\HP\MediTrack\features\examinations\examinations.controller.js

const examinationsService = require('./examinations.service');

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

const resolveActorId = (req) => {
  return (
    req.user?.uid ||
    req.user?.id ||
    null
  );
};

const resolveExaminationId = (
  result,
  fallback = null
) => {
  return (
    result?.id ||
    result?.examination?.id ||
    result?.data?.id ||
    fallback
  );
};

const resolveExaminationType = (
  result,
  requestBody = {}
) => {
  return (
    result?.type ||
    result?.examination_type ||
    result?.examinationType ||
    result?.record_type ||
    result?.recordType ||
    requestBody?.type ||
    requestBody?.examination_type ||
    requestBody?.examinationType ||
    requestBody?.record_type ||
    requestBody?.recordType ||
    null
  );
};

const resolvePatientId = (
  result,
  requestBody = {}
) => {
  return (
    result?.patient_id ||
    result?.patientId ||
    result?.user_id ||
    result?.userId ||
    result?.patient?.id ||
    result?.user?.id ||
    requestBody?.patient_id ||
    requestBody?.patientId ||
    requestBody?.user_id ||
    requestBody?.userId ||
    null
  );
};

const resolvePatientName = (
  result,
  requestBody = {}
) => {
  const directName =
    result?.patient_name ||
    result?.patientName ||
    result?.user_name ||
    result?.userName ||
    requestBody?.patient_name ||
    requestBody?.patientName ||
    requestBody?.user_name ||
    requestBody?.userName;

  if (directName) {
    return String(directName).trim();
  }

  const patientObject =
    result?.patient ||
    result?.user ||
    {};

  const fullName = [
    patientObject?.first_name ||
      patientObject?.firstName ||
      result?.first_name ||
      result?.firstName ||
      requestBody?.first_name ||
      requestBody?.firstName,

    patientObject?.middle_name ||
      patientObject?.middleName ||
      result?.middle_name ||
      result?.middleName ||
      requestBody?.middle_name ||
      requestBody?.middleName,

    patientObject?.last_name ||
      patientObject?.lastName ||
      result?.last_name ||
      result?.lastName ||
      requestBody?.last_name ||
      requestBody?.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');

  return fullName || null;
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

const setAuditData = (
  res,
  description,
  details = {}
) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

// ============================================================
// GET ALL EXAMINATIONS
// ============================================================

const getAllExaminations = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await examinationsService.getAllExaminations();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET EXAMINATION BY ID
// ============================================================

const getExaminationById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Examination ID is required.',
      });
    }

    const result =
      await examinationsService.getExaminationById(
        id
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
// CREATE EXAMINATION
// ============================================================

const createExamination = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await examinationsService.createExamination(
        req.body
      );

    const examinationId =
      resolveExaminationId(result);

    const examinationType =
      resolveExaminationType(
        result,
        req.body
      );

    const patientId =
      resolvePatientId(
        result,
        req.body
      );

    const patientName =
      resolvePatientName(
        result,
        req.body
      );

    const readableType =
      examinationType
        ? String(examinationType)
            .replace(/_/g, ' ')
            .trim()
        : 'health';

    let description =
      `Created ${readableType} examination`;

    if (patientName) {
      description += ` for ${patientName}`;
    }

    if (examinationId) {
      description += ` with ID ${examinationId}`;
    }

    description += '.';

    setAuditData(
      res,
      description,
      {
        operation: 'create_examination',
        examinationId,
        examinationType,
        patientId,
        patientName,
        examDate:
          result?.exam_date ||
          result?.examDate ||
          req.body?.exam_date ||
          req.body?.examDate ||
          null,
        status:
          result?.status ||
          req.body?.status ||
          null,
        createdBy: {
          id: resolveActorId(req),
          email: req.user?.email || null,
          name: resolveActorName(req),
        },
      }
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE EXAMINATION
// ============================================================

const updateExamination = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Examination ID is required.',
      });
    }

    const result =
      await examinationsService.updateExamination(
        id,
        req.body
      );

    const examinationId =
      resolveExaminationId(result, id);

    const examinationType =
      resolveExaminationType(
        result,
        req.body
      );

    const patientId =
      resolvePatientId(
        result,
        req.body
      );

    const patientName =
      resolvePatientName(
        result,
        req.body
      );

    const readableType =
      examinationType
        ? String(examinationType)
            .replace(/_/g, ' ')
            .trim()
        : 'health';

    let description =
      `Updated ${readableType} examination with ID ${examinationId}`;

    if (patientName) {
      description += ` for ${patientName}`;
    }

    description += '.';

    setAuditData(
      res,
      description,
      {
        operation: 'update_examination',
        examinationId,
        examinationType,
        patientId,
        patientName,
        updatedFields: Object.keys(
          req.body || {}
        ),
        status:
          result?.status ||
          req.body?.status ||
          null,
        updatedBy: {
          id: resolveActorId(req),
          email: req.user?.email || null,
          name: resolveActorName(req),
        },
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
// DELETE / ARCHIVE EXAMINATION
// ============================================================

const deleteExamination = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Examination ID is required.',
      });
    }

    const result =
      await examinationsService.deleteExamination(
        id
      );

    const examinationId =
      resolveExaminationId(result, id);

    const examinationType =
      resolveExaminationType(result);

    const patientId =
      resolvePatientId(result);

    const patientName =
      resolvePatientName(result);

    const archiveId =
      resolveArchiveId(result);

    const readableType =
      examinationType
        ? String(examinationType)
            .replace(/_/g, ' ')
            .trim()
        : 'health';

    let description =
      archiveId
        ? `Archived ${readableType} examination with ID ${examinationId} under archive ID ${archiveId}`
        : `Archived ${readableType} examination with ID ${examinationId}`;

    if (patientName) {
      description += ` for ${patientName}`;
    }

    description += '.';

    setAuditData(
      res,
      description,
      {
        operation: 'archive_examination',
        examinationId,
        examinationType,
        patientId,
        patientName,
        archiveId,
        tableName:
          examinationType === 'dental'
            ? 'dental_records'
            : examinationType === 'medical'
              ? 'medical_records'
              : 'examinations',
        archivedBy: {
          id: resolveActorId(req),
          email: req.user?.email || null,
          name: resolveActorName(req),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message:
        archiveId
          ? 'Examination moved to archives'
          : 'Examination deleted',
      data:
        result || {
          id: examinationId,
          archiveId,
        },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET MEDICAL EXAMINATIONS
// ============================================================

const getMedicalExaminations = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await examinationsService.getMedicalExaminations();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET DENTAL EXAMINATIONS
// ============================================================

const getDentalExaminations = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await examinationsService.getDentalExaminations();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAllExaminations,
  getExaminationById,
  createExamination,
  updateExamination,
  deleteExamination,
  getMedicalExaminations,
  getDentalExaminations,
};