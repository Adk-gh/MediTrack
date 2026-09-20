// C:\Users\HP\MediTrack\features\examinations\examinations.controller.js

const examinationsService =
  require('./examinations.service');

const {
  sendNotification,
} = require('../../utils/notifier');

// ============================================================
// HELPERS
// ============================================================

const resolveActorName = (req) => {
  const fullName = [
    req.user?.first_name ||
      req.user?.firstName,

    req.user?.middle_name ||
      req.user?.middleName,

    req.user?.last_name ||
      req.user?.lastName,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value).trim()
    )
    .filter(Boolean)
    .join(' ');

  return (
    fullName ||
    req.user?.email ||
    'System User'
  );
};

const resolveActorId = (req) => {
  return (
    req.user?.uid ||
    req.user?.id ||
    null
  );
};

const resolvePatientId = (
  result,
  requestBody = {}
) => {
  return (
    result?.user_id ||
    result?.patient_id ||
    result?.patientId ||
    requestBody?.user_id ||
    requestBody?.patient_id ||
    requestBody?.patientId ||
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
    requestBody?.patient_name ||
    requestBody?.patientName;

  if (directName) {
    return String(directName).trim();
  }

  const fullName = [
    result?.first_name ||
      requestBody?.first_name ||
      requestBody?.firstName,

    result?.middle_name ||
      requestBody?.middle_name ||
      requestBody?.middleName,

    result?.last_name ||
      requestBody?.last_name ||
      requestBody?.lastName,
  ]
    .filter(Boolean)
    .map((value) =>
      String(value).trim()
    )
    .filter(Boolean)
    .join(' ');

  return fullName || null;
};

const setAuditData = (
  res,
  description,
  details = {}
) => {
  res.locals.auditDescription =
    description;

  res.locals.auditDetails =
    details;
};

const buildAuditDetails = ({
  req,
  result,
  type,
  operation,
  extra = {},
}) => {
  return {
    operation,
    examinationId:
      result?.id || req.params?.id || null,
    examinationType: type,
    patientId:
      resolvePatientId(
        result,
        req.body
      ),
    patientName:
      resolvePatientName(
        result,
        req.body
      ),
    status:
      result?.status ||
      req.body?.status ||
      null,

    performedBy: {
      id: resolveActorId(req),
      email:
        req.user?.email || null,
      name: resolveActorName(req),
    },

    ...extra,
  };
};

const sendApprovalNotification =
  async ({
    patientId,
    type,
    examinationId,
  }) => {
    if (!patientId) return;

    try {
      await sendNotification({
        userId: patientId,
        type: 'approval',
        title: 'Record Approved',
        message:
          `Your ${type} examination record has been verified and approved by the clinic.`,
        referenceId:
          examinationId,
        referenceType:
          type === 'dental'
            ? 'dental_record'
            : 'medical_record',
      });
    } catch (error) {
      // Approval must not fail just because notification delivery failed.
      console.error(
        '[Examinations] Approval notification failed:',
        error
      );
    }
  };

const sendCertificateNotification =
  async ({
    patientId,
    type,
    examinationId,
  }) => {
    if (!patientId) return;

    try {
      await sendNotification({
        userId: patientId,
        type: 'certificate',
        title:
          type === 'dental'
            ? 'Dental Certificate Issued'
            : 'Medical Certificate Issued',
        message:
          `Your ${type} certificate has been issued by the clinic.`,
        referenceId:
          examinationId,
        referenceType:
          type === 'dental'
            ? 'dental_record'
            : 'medical_record',
      });
    } catch (error) {
      console.error(
        '[Examinations] Certificate notification failed:',
        error
      );
    }
  };

// ============================================================
// READ
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

const getMedicalExaminations =
  async (req, res, next) => {
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

const getDentalExaminations =
  async (req, res, next) => {
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

const getMedicalExaminationById =
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.getTypedExaminationById(
          'medical',
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

const getDentalExaminationById =
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.getTypedExaminationById(
          'dental',
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

const getExaminationById =
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.getExaminationById(
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
// CREATE / SUBMIT
// ============================================================

const createTypedExamination =
  (type) =>
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.createExamination(
          type,
          req.body
        );

      const patientName =
        resolvePatientName(
          result,
          req.body
        );

      const patientSuffix =
        patientName
          ? ` for ${patientName}`
          : '';

      setAuditData(
        res,
        `Submitted ${type} examination${patientSuffix} with ID ${result.id}.`,
        buildAuditDetails({
          req,
          result,
          type,
          operation:
            `submit_${type}_examination`,
          extra: {
            examDate:
              result?.exam_date ||
              req.body?.exam_date ||
              null,
          },
        })
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

const createMedicalExamination =
  createTypedExamination('medical');

const createDentalExamination =
  createTypedExamination('dental');

// ============================================================
// UPDATE
// ============================================================

const updateTypedExamination =
  (type) =>
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.updateExamination(
          type,
          req.params.id,
          req.body
        );

      const patientName =
        resolvePatientName(
          result,
          req.body
        );

      const patientSuffix =
        patientName
          ? ` for ${patientName}`
          : '';

      setAuditData(
        res,
        `Updated ${type} examination with ID ${result.id}${patientSuffix}.`,
        buildAuditDetails({
          req,
          result,
          type,
          operation:
            `update_${type}_examination`,
          extra: {
            updatedFields:
              Object.keys(
                req.body || {}
              ),
          },
        })
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

const updateMedicalExamination =
  updateTypedExamination('medical');

const updateDentalExamination =
  updateTypedExamination('dental');

// ============================================================
// APPROVAL
// ============================================================

const approveTypedExamination =
  (type) =>
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.approveExamination(
          type,
          req.params.id,
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

      const patientSuffix =
        patientName
          ? ` for ${patientName}`
          : '';

      setAuditData(
        res,
        `Approved ${type} examination with ID ${result.id}${patientSuffix}.`,
        buildAuditDetails({
          req,
          result,
          type,
          operation:
            `approve_${type}_examination`,
          extra: {
            approvedAt:
              result?.approved_at ||
              null,
            updatedFields:
              Object.keys(
                req.body || {}
              ),
          },
        })
      );

      await sendApprovalNotification({
        patientId,
        type,
        examinationId:
          result.id,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

const approveMedicalExamination =
  approveTypedExamination('medical');

const approveDentalExamination =
  approveTypedExamination('dental');

// ============================================================
// CERTIFICATE
// ============================================================

const issueTypedCertificate =
  (type) =>
  async (req, res, next) => {
    try {
      const result =
        await examinationsService.issueCertificate(
          type,
          req.params.id,
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

      const certificateLabel =
        type === 'dental'
          ? 'dental certificate'
          : 'medical certificate';

      const patientSuffix =
        patientName
          ? ` for ${patientName}`
          : '';

      setAuditData(
        res,
        `Issued ${certificateLabel}${patientSuffix} from examination ${result.id}.`,
        buildAuditDetails({
          req,
          result,
          type,
          operation:
            `issue_${type}_certificate`,
          extra: {
            issueCert: true,
            certificateIssuedAt:
              new Date().toISOString(),
          },
        })
      );

      await sendCertificateNotification({
        patientId,
        type,
        examinationId:
          result.id,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

const issueMedicalCertificate =
  issueTypedCertificate('medical');

const issueDentalCertificate =
  issueTypedCertificate('dental');

// ============================================================
// ARCHIVE
// ============================================================

const deleteTypedExamination =
  (type) =>
  async (req, res, next) => {
    try {
      const deletedBy = {
        id: resolveActorId(req),
        email:
          req.user?.email || null,
        name: resolveActorName(req),
      };

      const result =
        await examinationsService.archiveExamination(
          type,
          req.params.id,
          deletedBy.name
        );

      const patientName =
        resolvePatientName(
          result,
          {}
        );

      const patientSuffix =
        patientName
          ? ` for ${patientName}`
          : '';

      setAuditData(
        res,
        `Archived ${type} examination with ID ${result.id}${patientSuffix}.`,
        buildAuditDetails({
          req,
          result,
          type,
          operation:
            `archive_${type}_examination`,
          extra: {
            archivedBy:
              deletedBy,
          },
        })
      );

      return res.status(200).json({
        success: true,
        message:
          'Examination archived successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

const deleteMedicalExamination =
  deleteTypedExamination('medical');

const deleteDentalExamination =
  deleteTypedExamination('dental');

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAllExaminations,

  getMedicalExaminations,
  getDentalExaminations,

  getMedicalExaminationById,
  getDentalExaminationById,
  getExaminationById,

  createMedicalExamination,
  createDentalExamination,

  updateMedicalExamination,
  updateDentalExamination,

  approveMedicalExamination,
  approveDentalExamination,

  issueMedicalCertificate,
  issueDentalCertificate,

  deleteMedicalExamination,
  deleteDentalExamination,
};
