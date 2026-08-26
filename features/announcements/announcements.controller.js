// C:\Users\HP\MediTrack\features\announcements\announcements.controller.js

const announcementsService = require('./announcements.service');

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
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ');

  return fullName || req.user?.email || 'System User';
};

const resolveAnnouncementId = (result, fallback = null) => {
  return (
    result?.id ||
    result?.announcement?.id ||
    result?.data?.id ||
    fallback
  );
};

const resolveAnnouncementTitle = (result, reqBody = {}) => {
  return (
    result?.title ||
    result?.announcement?.title ||
    result?.data?.title ||
    reqBody?.title ||
    'Untitled announcement'
  );
};

const setAuditData = (res, description, details = {}) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

// ============================================================
// GET ALL ANNOUNCEMENTS
// ============================================================

const getAllAnnouncements = async (req, res, next) => {
  try {
    const result =
      await announcementsService.getAllAnnouncements();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ANNOUNCEMENT BY ID
// ============================================================

const getAnnouncementById = async (req, res, next) => {
  try {
    const result =
      await announcementsService.getAnnouncementById(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE ANNOUNCEMENT
// ============================================================

const createAnnouncement = async (req, res, next) => {
  try {
    console.log('==========================================');
    console.log('=== NEW ANNOUNCEMENT DEBUG ===');
    console.log('==========================================');

    console.log(
      '[Announcements] Body fields:',
      Object.keys(req.body || {})
    );

    console.log(
      '[Announcements] Uploaded file:',
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : 'NO FILE'
    );

    console.log('==========================================');

    const result =
      await announcementsService.createAnnouncement(
        req.body,
        req.file
      );

    const announcementId =
      resolveAnnouncementId(result);

    const announcementTitle =
      resolveAnnouncementTitle(result, req.body);

    setAuditData(
      res,
      announcementId
        ? `Created announcement "${announcementTitle}" with ID ${announcementId}.`
        : `Created announcement "${announcementTitle}".`,
      {
        operation: 'create_announcement',
        announcementId,
        title: announcementTitle,
        category:
          result?.category ||
          req.body?.category ||
          null,
        priority:
          result?.priority ||
          req.body?.priority ||
          null,
        department:
          result?.dept ||
          result?.department ||
          req.body?.dept ||
          req.body?.department ||
          null,
        hasImage: Boolean(req.file),
        uploadedFile: req.file
          ? {
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
            }
          : null,
        createdBy: resolveActorName(req),
      }
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      'CREATE ANNOUNCEMENT ERROR:',
      error
    );

    next(error);
  }
};

// ============================================================
// UPDATE ANNOUNCEMENT
// ============================================================

const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Announcement ID is required.',
      });
    }

    console.log('==========================================');
    console.log('=== UPDATE ANNOUNCEMENT DEBUG ===');
    console.log('==========================================');

    console.log(
      '[Announcements] ID:',
      id
    );

    console.log(
      '[Announcements] Body fields:',
      Object.keys(req.body || {})
    );

    console.log(
      '[Announcements] Replacement file:',
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : 'NO NEW FILE'
    );

    console.log('==========================================');

    const result =
      await announcementsService.updateAnnouncement(
        id,
        req.body,
        req.file
      );

    const announcementId =
      resolveAnnouncementId(result, id);

    const announcementTitle =
      resolveAnnouncementTitle(result, req.body);

    setAuditData(
      res,
      `Updated announcement "${announcementTitle}" with ID ${announcementId}.`,
      {
        operation: 'update_announcement',
        announcementId,
        title: announcementTitle,
        updatedFields: Object.keys(req.body || {}),
        category:
          result?.category ||
          req.body?.category ||
          null,
        priority:
          result?.priority ||
          req.body?.priority ||
          null,
        imageReplaced: Boolean(req.file),
        replacementFile: req.file
          ? {
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
            }
          : null,
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      'UPDATE ANNOUNCEMENT ERROR:',
      error
    );

    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE ANNOUNCEMENT
// ============================================================

const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Announcement ID is required.',
      });
    }

    const deletedBy = {
      id: req.user?.uid || req.user?.id || null,
      email: req.user?.email || null,
      name: resolveActorName(req),
    };

    const result =
      await announcementsService.deleteAnnouncement(
        id,
        deletedBy
      );

    const announcementId =
      resolveAnnouncementId(result, id);

    const announcementTitle =
      resolveAnnouncementTitle(result);

    const archiveId =
      result?.archiveId ||
      result?.archive_id ||
      result?.archive?.id ||
      result?.archivedItem?.id ||
      null;

    setAuditData(
      res,
      announcementTitle !== 'Untitled announcement'
        ? `Archived announcement "${announcementTitle}" with ID ${announcementId}.`
        : `Archived announcement with ID ${announcementId}.`,
      {
        operation: 'archive_announcement',
        announcementId,
        announcementTitle:
          announcementTitle !== 'Untitled announcement'
            ? announcementTitle
            : null,
        archiveId,
        tableName: 'announcements',
        archivedBy: deletedBy,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Announcement moved to archives',
      data: result || {
        id: announcementId,
        archiveId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};