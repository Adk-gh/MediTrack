const express = require('express');
const router = express.Router();
const consultationsController = require('./consultations.controller');
const { authorized: authorize } = require('../../middleware/authorized');

router.use(authorize);

// Presence routes MUST come before /:id to avoid being swallowed as a param
router.post('/presence', consultationsController.setPresence);
router.get('/presence/online', consultationsController.getOnlineUsers);
router.get('/presence', consultationsController.getPresence);

// Consultations
router.get('/', consultationsController.getAllConsultations);
router.get('/patient', consultationsController.getConsultationsByPatient);
router.post('/', consultationsController.createConsultation);
router.get('/:id', consultationsController.getConsultationById);
router.put('/:id', consultationsController.updateConsultation);
router.put('/:id/end', consultationsController.endConsultation);   // ← PUT not PATCH
router.patch('/:id/end', consultationsController.endConsultation); // ← keep PATCH too for safety
router.delete('/:id', consultationsController.deleteConsultation);

// Messages
router.get('/:consultationId/messages', consultationsController.getMessages);
router.post('/:consultationId/messages', consultationsController.sendMessage);
router.post('/:consultationId/messages/read', consultationsController.markMessagesAsRead);

module.exports = router;