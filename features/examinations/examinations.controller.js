// C:\Users\HP\MediTrack\features\examinations\examinations.controller.js
const examinationsService = require("./examinations.service");

const getAllExaminations = async (req, res, next) => {
  try {
    const result = await examinationsService.getAllExaminations();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getExaminationById = async (req, res, next) => {
  try {
    const result = await examinationsService.getExaminationById(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const createExamination = async (req, res, next) => {
  try {
    const result = await examinationsService.createExamination(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateExamination = async (req, res, next) => {
  try {
    const result = await examinationsService.updateExamination(req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const deleteExamination = async (req, res, next) => {
  try {
    await examinationsService.deleteExamination(req.params.id);
    res.status(200).json({ success: true, message: "Examination deleted" });
  } catch (error) {
    next(error);
  }
};

// --- NEW DASHBOARD CONTROLLERS ---
const getMedicalExaminations = async (req, res, next) => {
  try {
    const result = await examinationsService.getMedicalExaminations();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getDentalExaminations = async (req, res, next) => {
  try {
    const result = await examinationsService.getDentalExaminations();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// --- EXPORTS MUST BE AT THE VERY BOTTOM ---
module.exports = {
  getAllExaminations,
  getExaminationById,
  createExamination,
  updateExamination,
  deleteExamination,
  getMedicalExaminations,
  getDentalExaminations
};