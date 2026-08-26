// C:\Users\HP\MediTrack\features\announcements\announcements.route.js

const express = require('express');
const multer = require('multer');

const router = express.Router();

const announcementsController = require('./announcements.controller');

const {
  authorized,
} = require('../../middleware/authorized');

const {
  getSystemConfig,
} = require('../../services/systemConfig.service');

const validateData = require('../../validation/validate-data');

const {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} = require('./announcements.validation');

const {
  auditLog,
} = require('../../middleware/auditLogger');

// =========================================================
// HELPERS
// =========================================================

const normalizeRole = (role) => {
  return String(role || '')
    .trim()
    .toLowerCase();
};

const normalizeConfiguredRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map(normalizeRole)
    .filter(Boolean);
};

// =========================================================
// MULTER CONFIGURATION
// =========================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Invalid image type. Allowed types: JPEG, PNG, WEBP, GIF, BMP, SVG.'
        )
      );
    }

    return cb(null, true);
  },
});

// =========================================================
// DYNAMIC ROLE MIDDLEWARE
// =========================================================

const allowDynamicClinicStaffs = async (
  req,
  res,
  next
) => {
  try {
    const userRole = normalizeRole(
      req.user?.role
    );

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config = await getSystemConfig();

    const clinicRoles =
      normalizeConfiguredRoles(
        config?.clinic_roles
      );

    const adminRoles =
      normalizeConfiguredRoles(
        config?.admin_roles
      );

    const allowedRoles = [
      ...new Set([
        ...clinicRoles,
        ...adminRoles,
        'sysadmin',
        'doctor',
        'dentist',
        'nurse',
      ]),
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Clinic staff or Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[DynamicRoleCheck] Clinic staffs verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// =========================================================
// READ ANNOUNCEMENTS
// =========================================================

// Anyone can view all announcements.
router.get(
  '/',
  announcementsController.getAllAnnouncements
);

// Anyone can view a specific announcement.
router.get(
  '/:id',
  announcementsController.getAnnouncementById
);

// =========================================================
// CREATE ANNOUNCEMENT
// =========================================================

router.post(
  '/',
  authorized,
  allowDynamicClinicStaffs,

  // Multer must run before validation and audit callbacks
  // so multipart fields are available in req.body.
  upload.single('image'),

  validateData(createAnnouncementSchema),

  auditLog(
    'Create Announcement',
    'ANNOUNCEMENT',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Created announcement "${
          req.body?.title || 'Untitled'
        }".`
      );
    }
  ),

  announcementsController.createAnnouncement
);

// =========================================================
// UPDATE ANNOUNCEMENT
// =========================================================

router.put(
  '/:id',
  authorized,
  allowDynamicClinicStaffs,

  upload.single('image'),

  validateData(updateAnnouncementSchema),

  auditLog(
    'Update Announcement',
    'ANNOUNCEMENT',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated announcement with ID ${req.params.id}.`
      );
    }
  ),

  announcementsController.updateAnnouncement
);

// Optional PATCH support for partial updates.
router.patch(
  '/:id',
  authorized,
  allowDynamicClinicStaffs,

  upload.single('image'),

  auditLog(
    'Update Announcement',
    'ANNOUNCEMENT',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Updated announcement with ID ${req.params.id}.`
      );
    }
  ),

  announcementsController.updateAnnouncement
);

// =========================================================
// DELETE / ARCHIVE ANNOUNCEMENT
// =========================================================

router.delete(
  '/:id',
  authorized,
  allowDynamicClinicStaffs,

  auditLog(
    'Archive Announcement',
    'ARCHIVE',
    (req, res) => {
      return (
        res.locals.auditDescription ||
        `Archived announcement with ID ${req.params.id}.`
      );
    }
  ),

  announcementsController.deleteAnnouncement
);

// =========================================================
// MULTER ERROR HANDLER
// =========================================================

// Handles invalid file type and file-size errors cleanly.
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message:
          'Announcement image must not exceed 20 MB.',
      });
    }

    return res.status(400).json({
      success: false,
      message:
        error.message || 'File upload failed.',
    });
  }

  if (
    error?.message?.startsWith(
      'Invalid image type'
    )
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
});

module.exports = router;