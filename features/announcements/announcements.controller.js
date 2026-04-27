const announcementsService = require("./announcements.service");

const getAllAnnouncements = async (req, res, next) => {
  try {
    const result = await announcementsService.getAllAnnouncements();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getAnnouncementById = async (req, res, next) => {
  try {
    const result = await announcementsService.getAnnouncementById(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const result = await announcementsService.createAnnouncement(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const result = await announcementsService.updateAnnouncement(req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    await announcementsService.deleteAnnouncement(req.params.id);
    res.status(200).json({ success: true, message: "Announcement deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement };