const express = require('express');
const router = express.Router();
const consultationsController = require('./consultations.controller');
const { authorized: authorize } = require('../../middleware/authorized');
const { auditLog } = require('../../middleware/auditLogger');

router.use(authorize);

// Presence routes MUST come before /:id to avoid being swallowed as a param
router.post('/presence', consultationsController.setPresence);
router.get('/presence/online', consultationsController.getOnlineUsers);
router.get('/presence', consultationsController.getPresence);

// Consultations
router.get('/', consultationsController.getAllConsultations);
router.get('/patient', consultationsController.getConsultationsByPatient);
router.post('/', auditLog('create', 'consultation', (req) => `Created new consultation: ${req.body.consultation_type || 'Unknown'}`), consultationsController.createConsultation);
router.get('/:id', consultationsController.getConsultationById);
router.put('/:id', auditLog('update', 'consultation', (req) => `Updated consultation ID: ${req.params.id}`), consultationsController.updateConsultation);
router.put('/:id/reactivate', auditLog('update', 'consultation', (req) => `Reactivated consultation ID: ${req.params.id}`), consultationsController.reactivateConsultation);
router.put('/:id/end', auditLog('end', 'consultation', (req) => `Ended consultation ID: ${req.params.id}`), consultationsController.endConsultation);
router.patch('/:id/end', auditLog('end', 'consultation', (req) => `Ended consultation ID: ${req.params.id}`), consultationsController.endConsultation);
router.delete('/:id', auditLog('delete', 'consultation', (req) => `Archived consultation ID: ${req.params.id}`), consultationsController.deleteConsultation);

// Messages
router.get('/:consultationId/messages', consultationsController.getMessages);
router.post('/:consultationId/messages', auditLog('create', 'message', (req) => `Sent message in consultation: ${req.params.consultationId}`), consultationsController.sendMessage);
router.post('/:consultationId/messages/read', consultationsController.markMessagesAsRead);

module.exports = router;