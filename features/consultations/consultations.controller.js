// C:\Users\HP\MediTrack\features\consultations\consultations.controller.js

const consultationsService = require('./consultations.service');
const { sendNotification } = require('../../utils/notifier');
const supabase = require('../../configs/database');

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

  return (
    fullName ||
    req.user?.email ||
    req.body?.sender_name ||
    'System User'
  );
};

const resolveAuthUid = (req) => {
  return (
    req.user?.sub ||
    req.user?.uid ||
    req.user?.id ||
    null
  );
};

const resolveConsultationId = (result, fallback = null) => {
  return (
    result?.id ||
    result?.consultation?.id ||
    result?.data?.id ||
    fallback
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

const safelySendNotification = async (
  notificationData
) => {
  try {
    await sendNotification(notificationData);
  } catch (error) {
    console.error(
      '[Consultations] Notification failed:',
      error.message
    );
  }
};

// ============================================================
// GET ALL CONSULTATIONS
// ============================================================

const getAllConsultations = async (
  req,
  res,
  next
) => {
  try {
    const { type } = req.query;
    const role = req.user?.role;

    const data =
      await consultationsService.getAllConsultations(
        type,
        role
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CONSULTATION BY ID
// ============================================================

const getConsultationById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const data =
      await consultationsService.getConsultationById(
        id
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CONSULTATIONS BY LOGGED-IN PATIENT
// ============================================================

const getConsultationsByPatient = async (
  req,
  res,
  next
) => {
  try {
    const patientId =
      req.user?.id || req.user?.uid;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'User ID not found',
      });
    }

    const data =
      await consultationsService.getConsultationsByPatient(
        patientId
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE CONSULTATION
// ============================================================

const createConsultation = async (
  req,
  res,
  next
) => {
  try {
    console.log(
      '[Controller] Before createConsultation'
    );

    const data =
      await consultationsService.createConsultation(
        req.body
      );

    console.log(
      '[Controller] After createConsultation, data.status:',
      data?.status
    );

    const consultationId =
      resolveConsultationId(data);

    const targetUserId =
      data?.patient_id ||
      data?.user_id ||
      req.user?.uid;

    if (targetUserId && consultationId) {
      await safelySendNotification({
        userId: targetUserId,
        type: 'consultation',
        title: 'Consultation Started',
        message:
          'Your consultation session has been started.',
        referenceId: consultationId,
        referenceType: 'consultation',
      });
    }

    setAuditData(
      res,
      consultationId
        ? `Created consultation with ID ${consultationId}.`
        : 'Created a new consultation.',
      {
        operation: 'create_consultation',
        consultationId,
        patientId:
          data?.patient_id ||
          data?.user_id ||
          req.body?.patient_id ||
          req.body?.user_id ||
          null,
        consultationType:
          data?.type ||
          req.body?.type ||
          req.body?.consultation_type ||
          null,
        status:
          data?.status ||
          req.body?.status ||
          null,
        createdBy: resolveActorName(req),
      }
    );

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE CONSULTATION
// ============================================================

const updateConsultation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Consultation ID is required.',
      });
    }

    const data =
      await consultationsService.updateConsultation(
        id,
        req.body
      );

    const consultationId =
      resolveConsultationId(data, id);

    const targetUserId =
      data?.patient_id ||
      data?.user_id;

    if (targetUserId) {
      await safelySendNotification({
        userId: targetUserId,
        type: 'consultation',
        title: 'Consultation Updated',
        message:
          'There has been an update to your consultation.',
        referenceId: consultationId,
        referenceType: 'consultation',
      });
    }

    setAuditData(
      res,
      `Updated consultation with ID ${consultationId}.`,
      {
        operation: 'update_consultation',
        consultationId,
        updatedFields: Object.keys(
          req.body || {}
        ),
        patientId:
          data?.patient_id ||
          data?.user_id ||
          null,
        status:
          data?.status ||
          req.body?.status ||
          null,
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// END CONSULTATION
// ============================================================

const endConsultation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Consultation ID is required.',
      });
    }

    const data =
      await consultationsService.endConsultation(id);

    const consultationId =
      resolveConsultationId(data, id);

    const targetUserId =
      data?.patient_id ||
      data?.user_id;

    if (targetUserId) {
      await safelySendNotification({
        userId: targetUserId,
        type: 'consultation_ended',
        title: 'Consultation Completed',
        message:
          'Your consultation session has been marked as completed. Thank you!',
        referenceId: consultationId,
        referenceType: 'consultation',
      });
    }

    setAuditData(
      res,
      `Completed consultation with ID ${consultationId}.`,
      {
        operation: 'end_consultation',
        consultationId,
        patientId: targetUserId || null,
        status:
          data?.status ||
          'completed',
        completedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// REACTIVATE CONSULTATION
// ============================================================

const reactivateConsultation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Consultation ID is required.',
      });
    }

    const data =
      await consultationsService.reactivateConsultation(
        id
      );

    const consultationId =
      resolveConsultationId(data, id);

    const targetUserId =
      data?.patient_id ||
      data?.user_id;

    if (targetUserId) {
      await safelySendNotification({
        userId: targetUserId,
        type: 'consultation',
        title: 'Consultation Reactivated',
        message:
          'Your consultation session has been reactivated.',
        referenceId: consultationId,
        referenceType: 'consultation',
      });
    }

    setAuditData(
      res,
      `Reactivated consultation with ID ${consultationId}.`,
      {
        operation: 'reactivate_consultation',
        consultationId,
        patientId: targetUserId || null,
        status:
          data?.status ||
          'active',
        reactivatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE CONSULTATION
// ============================================================

const deleteConsultation = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Consultation ID is required.',
      });
    }

    const deletedBy = {
      id:
        req.user?.uid ||
        req.user?.id ||
        null,
      email:
        req.user?.email ||
        null,
      name: resolveActorName(req),
    };

    const result =
      await consultationsService.deleteConsultation(
        id,
        deletedBy
      );

    const consultationId =
      resolveConsultationId(result, id);

    const archiveId =
      result?.archiveId ||
      result?.archive_id ||
      result?.archive?.id ||
      result?.archivedItem?.id ||
      null;

    setAuditData(
      res,
      archiveId
        ? `Archived consultation with ID ${consultationId} under archive ID ${archiveId}.`
        : `Archived consultation with ID ${consultationId}.`,
      {
        operation: 'archive_consultation',
        consultationId,
        archiveId,
        tableName: 'consultations',
        archivedBy: deletedBy,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        'Consultation moved to archives',
      data:
        result || {
          id: consultationId,
          archiveId,
        },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET CONSULTATION MESSAGES
// ============================================================

const getMessages = async (
  req,
  res,
  next
) => {
  try {
    const { consultationId } = req.params;

    const data =
      await consultationsService.getMessagesByConsultationId(
        consultationId
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SEND CONSULTATION MESSAGE
// ============================================================

const sendMessage = async (
  req,
  res,
  next
) => {
  try {
    const { consultationId } = req.params;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        message: 'Consultation ID is required.',
      });
    }

    const senderRole =
      req.body.sender_role ||
      req.user?.role;

    const senderId =
      req.user?.uid ||
      req.user?.id ||
      req.body.sender_id;

    const messagePayload = {
      ...req.body,
      sender_id:
        req.body.sender_id ||
        senderId,
      sender_role:
        req.body.sender_role ||
        senderRole,
    };

    const data =
      await consultationsService.sendMessage(
        consultationId,
        messagePayload
      );

    const consultation =
      await consultationsService.getConsultationById(
        consultationId
      );

    const normalizedSenderRole = String(
      senderRole || ''
    )
      .trim()
      .toLowerCase();

    const clinicRoles = [
      'clinic_staff',
      'admin',
      'sysadmin',
      'doctor',
      'dentist',
      'nurse',
    ];

    if (
      clinicRoles.includes(
        normalizedSenderRole
      )
    ) {
      const patientUserId =
        consultation?.patient_id ||
        consultation?.user_id;

      if (patientUserId) {
        const { data: patientProfile, error } =
          await supabase
            .from('users')
            .select('uid')
            .eq('id', patientUserId)
            .maybeSingle();

        if (error) {
          console.error(
            '[Consultations] Patient lookup failed:',
            error.message
          );
        }

        if (patientProfile?.uid) {
          await safelySendNotification({
            userId: patientProfile.uid,
            type: 'consultation_response',
            title:
              'New Message from Clinic Staff',
            message:
              `You have a new message from ${
                req.body.sender_name ||
                'the clinic staff'
              } regarding your consultation.`,
            referenceId: consultationId,
            referenceType: 'consultation',
          });
        }
      }
    }

    const messageId =
      data?.id ||
      data?.message?.id ||
      data?.data?.id ||
      null;

    setAuditData(
      res,
      `Sent a message in consultation ${consultationId}.`,
      {
        operation: 'send_consultation_message',
        consultationId,
        messageId,
        senderId: senderId || null,
        senderRole:
          senderRole || null,
        senderName:
          req.body.sender_name ||
          resolveActorName(req),
      }
    );

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SET PRESENCE
// ============================================================

const setPresence = async (
  req,
  res,
  next
) => {
  try {
    const authUid =
      resolveAuthUid(req);

    if (!authUid) {
      return res.status(400).json({
        success: false,
        message:
          'User ID missing from auth token',
      });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message:
          'Presence status is required.',
      });
    }

    const data =
      await consultationsService.setUserPresence(
        authUid,
        status
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// MARK MESSAGES AS READ
// ============================================================

const markMessagesAsRead = async (
  req,
  res,
  next
) => {
  try {
    const { consultationId } = req.params;

    let readerId =
      req.body.sender_id;

    const readerRole =
      req.user?.role ||
      req.body.sender_role;

    if (
      !readerId &&
      req.user?.uid
    ) {
      const {
        data: userProfile,
        error,
      } = await supabase
        .from('users')
        .select('id')
        .eq('uid', req.user.uid)
        .maybeSingle();

      if (error) {
        console.error(
          '[Consultations] Reader lookup failed:',
          error.message
        );
      }

      if (userProfile?.id) {
        readerId = userProfile.id;
      }
    }

    if (!readerId) {
      return res.status(400).json({
        success: false,
        message: 'Reader ID not found',
      });
    }

    console.log(
      '[Controller] markMessagesAsRead - readerId (internal):',
      readerId
    );

    const data =
      await consultationsService.markMessagesAsRead(
        consultationId,
        readerId,
        readerRole
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PRESENCE
// ============================================================

const getPresence = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await consultationsService.getPresence();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ONLINE USERS
// ============================================================

const getOnlineUsers = async (
  req,
  res,
  next
) => {
  try {
    const data =
      await consultationsService.getOnlineUsers();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAllConsultations,
  getConsultationById,
  getConsultationsByPatient,
  createConsultation,
  updateConsultation,
  endConsultation,
  reactivateConsultation,
  deleteConsultation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  setPresence,
  getPresence,
  getOnlineUsers,
};