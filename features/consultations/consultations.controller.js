// C:\Users\HP\MediTrack\features\consultations\consultations.controller.js
const consultationsService = require('./consultations.service');
const { sendNotification } = require('../../utils/notifier');

const getAllConsultations = async (req, res, next) => {
  try {
    const { type } = req.query;
    const role = req.user?.role;
    const data = await consultationsService.getAllConsultations(type, role);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getConsultationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await consultationsService.getConsultationById(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getConsultationsByPatient = async (req, res, next) => {
  try {
    const patientId = req.user?.id;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'User ID not found' });
    }
    const data = await consultationsService.getConsultationsByPatient(patientId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── TRIGGER 1: CREATION ──────────────────────────────────────────────
const createConsultation = async (req, res, next) => {
  try {
    const data = await consultationsService.createConsultation(req.body);

    const targetUserId = data?.patient_id || data?.user_id || req.user?.uid;

    if (targetUserId) {
      await sendNotification({
        userId:        targetUserId,
        type:          'consultation',         // ← fixed
        title:         'Consultation Started',
        message:       'Your consultation session has been started.',
        referenceId:   data.id,
        referenceType: 'consultation',
      });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── TRIGGER 2: UPDATES ───────────────────────────────────────────────
const updateConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await consultationsService.updateConsultation(id, req.body);

    const targetUserId = data?.patient_id || data?.user_id;

    if (targetUserId) {
      await sendNotification({
        userId:        targetUserId,
        type:          'consultation',         // ← fixed
        title:         'Consultation Updated',
        message:       'There has been an update to your consultation.',
        referenceId:   id,
        referenceType: 'consultation',
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── TRIGGER 3: ENDING ────────────────────────────────────────────────
const endConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await consultationsService.endConsultation(id);

    const targetUserId = data?.patient_id || data?.user_id;

    if (targetUserId) {
      await sendNotification({
        userId:        targetUserId,
        type:          'consultation_ended',   // ← fixed
        title:         'Consultation Completed',
        message:       'Your consultation session has been marked as completed. Thank you!',
        referenceId:   id,
        referenceType: 'consultation',
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deleteConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBy = {
      id: req.user?.uid,
      email: req.user?.email
    };
    await consultationsService.deleteConsultation(id, deletedBy);
    res.status(200).json({ success: true, message: 'Consultation moved to archives' });
  } catch (error) {
    next(error);
  }
};

// Messages
const getMessages = async (req, res, next) => {
  try {
    const { consultationId } = req.params;
    const data = await consultationsService.getMessagesByConsultationId(consultationId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { consultationId } = req.params;
    const data = await consultationsService.sendMessage(consultationId, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Presence
const setPresence = async (req, res, next) => {
  try {
    const authUid = req.user?.sub
                 || req.user?.uid
                 || req.user?.id;

    if (!authUid) {
      return res.status(400).json({ success: false, message: 'User ID missing from auth token' });
    }

    const { status } = req.body;
    const data = await consultationsService.setUserPresence(authUid, status);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getPresence = async (req, res, next) => {
  try {
    const data = await consultationsService.getPresence();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getOnlineUsers = async (req, res, next) => {
  try {
    const data = await consultationsService.getOnlineUsers();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllConsultations,
  getConsultationById,
  getConsultationsByPatient,
  createConsultation,
  updateConsultation,
  endConsultation,
  deleteConsultation,
  getMessages,
  sendMessage,
  setPresence,
  getPresence,
  getOnlineUsers,
};