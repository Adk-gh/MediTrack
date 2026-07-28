//C:\Users\HP\MediTrack\features\announcements\announcements.route.js
const express = require("express");
const router = express.Router();
const announcementsController = require("./announcements.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createAnnouncementSchema, updateAnnouncementSchema } = require("./announcements.validation");
const { auditLog } = require('../../middleware/auditLogger');

router.get("/", announcementsController.getAllAnnouncements);
router.get("/:id", announcementsController.getAnnouncementById);
router.post("/", auditLog('create', 'announcement', (req) => `Created announcement: ${req.body.title || 'Untitled'}`), validateData(createAnnouncementSchema), announcementsController.createAnnouncement);
router.put("/:id", auditLog('update', 'announcement', (req) => `Updated announcement ID: ${req.params.id}`), validateData(updateAnnouncementSchema), announcementsController.updateAnnouncement);
router.delete("/:id", authorized, auditLog('delete', 'announcement', (req) => `Archived announcement ID: ${req.params.id}`), announcementsController.deleteAnnouncement);

module.exports = router;