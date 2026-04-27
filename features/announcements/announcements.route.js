const express = require("express");
const router = express.Router();
const announcementsController = require("./announcements.controller");
const { authorized } = require("../../middleware/authorized");
const validateData = require("../../validation/validate-data");
const { createAnnouncementSchema, updateAnnouncementSchema } = require("./announcements.validation");

router.get("/", announcementsController.getAllAnnouncements);
router.get("/:id", announcementsController.getAnnouncementById);
router.post("/", validateData(createAnnouncementSchema), announcementsController.createAnnouncement);
router.put("/:id", validateData(updateAnnouncementSchema), announcementsController.updateAnnouncement);
router.delete("/:id", authorized, announcementsController.deleteAnnouncement);

module.exports = router;