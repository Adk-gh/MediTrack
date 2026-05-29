const express = require('express');
const router = express.Router();
const consultationsController = require('./consultations.controller');
const { authorized: authorize } = require('../../middleware/authorized');

// Public routes - authentication required for all
router.use(authorize);

// Consultations
router.get('/', consultationsController.getAllConsultations);
router.get('/patient', consultationsController.getConsultationsByPatient);
router.get('/:id', consultationsController.getConsultationById);
router.post('/', consultationsController.createConsultation);
router.put('/:id', consultationsController.updateConsultation);
router.patch('/:id/end', consultationsController.endConsultation);
router.delete('/:id', consultationsController.deleteConsultation);

// Messages
router.get('/:consultationId/messages', consultationsController.getMessages);
router.post('/:consultationId/messages', consultationsController.sendMessage);

// Presence
router.post('/presence', consultationsController.setPresence);
router.get('/presence', consultationsController.getPresence);
router.get('/presence/online', consultationsController.getOnlineUsers);

module.exports = router;