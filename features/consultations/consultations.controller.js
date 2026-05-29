//C:\Users\HP\MediTrack\features\consultations\consultations.controller.js
const consultationsService = require('./consultations.service');

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
    const patientId = req.user?.uid;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'User ID not found' });
    }
    const data = await consultationsService.getConsultationsByPatient(patientId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createConsultation = async (req, res, next) => {
  try {
    const data = await consultationsService.createConsultation(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await consultationsService.updateConsultation(id, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const endConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await consultationsService.endConsultation(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deleteConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await consultationsService.deleteConsultation(id);
    res.status(200).json({ success: true, message: 'Consultation deleted' });
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
    const userId = req.user?.uid;
    const { status } = req.body;
    const data = await consultationsService.setUserPresence(userId, status);
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