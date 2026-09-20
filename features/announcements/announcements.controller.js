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
// HTML / META HELPERS
// ============================================================

const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const stripHtml = (value = '') => {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const truncateText = (value = '', maxLength = 200) => {
  const text = stripHtml(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength - 3).trim()}...`;
};

const formatAnnouncementDate = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
// PUBLIC FACEBOOK / SOCIAL SHARE PAGE
// ============================================================

const getAnnouncementSharePage = async (req, res, next) => {
  try {
    const announcement =
      await announcementsService.getAnnouncementById(
        req.params.id
      );

    if (!announcement) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>Announcement Not Found | MediTrack</title>
          </head>
          <body>
            <h1>Announcement not found</h1>
          </body>
        </html>
      `);
    }

    const frontendBaseUrl =
      process.env.FRONTEND_URL ||
      'https://meditrack-2-tvck.onrender.com';

    const backendBaseUrl =
      process.env.BACKEND_URL ||
      `${req.protocol}://${req.get('host')}`;

    const announcementId =
      announcement.id || req.params.id;

    const title =
      announcement.title || 'MediTrack Announcement';

    const content =
      announcement.content || '';

    const description =
      truncateText(content, 220) ||
      'View this announcement from MediTrack.';

    const imageUrl =
      announcement.image_url || '';

    const category =
      announcement.category || 'General';

    const priority =
      announcement.priority || 'normal';

    const location =
      announcement.location || '';

    const contactPerson =
      announcement.contact_person || '';

    const contactEmail =
      announcement.contact_email || '';

    const createdAt =
      announcement.created_at ||
      announcement.date ||
      '';

    const formattedDate =
      formatAnnouncementDate(createdAt);

    const publicAnnouncementUrl =
      `${frontendBaseUrl}/announcements/${announcementId}`;

    const sharePageUrl =
      `${backendBaseUrl}/api/announcements/share/${announcementId}`;

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImageUrl = escapeHtml(imageUrl);
    const safePublicUrl = escapeHtml(publicAnnouncementUrl);
    const safeSharePageUrl = escapeHtml(sharePageUrl);
    const safeContent = escapeHtml(content);
    const safeCategory = escapeHtml(category);
    const safePriority = escapeHtml(priority);
    const safeLocation = escapeHtml(location);
    const safeContactPerson = escapeHtml(contactPerson);
    const safeContactEmail = escapeHtml(contactEmail);
    const safeDate = escapeHtml(formattedDate);

    return res
      .status(200)
      .type('html')
      .send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${safeTitle} | MediTrack</title>

  <meta
    name="description"
    content="${safeDescription}"
  />

  <!-- ====================================================== -->
  <!-- OPEN GRAPH - FACEBOOK -->
  <!-- ====================================================== -->

  <meta
    property="og:type"
    content="article"
  />

  <meta
    property="og:site_name"
    content="MediTrack"
  />

  <meta
    property="og:title"
    content="${safeTitle}"
  />

  <meta
    property="og:description"
    content="${safeDescription}"
  />

  <meta
    property="og:url"
    content="${safeSharePageUrl}"
  />

  ${
    imageUrl
      ? `
  <meta
    property="og:image"
    content="${safeImageUrl}"
  />

  <meta
    property="og:image:secure_url"
    content="${safeImageUrl}"
  />

  <meta
    property="og:image:alt"
    content="${safeTitle}"
  />
  `
      : ''
  }

  <!-- ====================================================== -->
  <!-- TWITTER / OTHER SOCIAL PREVIEW -->
  <!-- ====================================================== -->

  <meta
    name="twitter:card"
    content="${imageUrl ? 'summary_large_image' : 'summary'}"
  />

  <meta
    name="twitter:title"
    content="${safeTitle}"
  />

  <meta
    name="twitter:description"
    content="${safeDescription}"
  />

  ${
    imageUrl
      ? `
  <meta
    name="twitter:image"
    content="${safeImageUrl}"
  />
  `
      : ''
  }

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: #f8fafc;
      color: #334155;
      font-family:
        Inter,
        Arial,
        Helvetica,
        sans-serif;
    }

    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 760px;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      box-shadow:
        0 20px 50px rgba(15, 23, 42, 0.12);
    }

    .image-wrap {
      width: 100%;
      max-height: 440px;
      overflow: hidden;
      background: #f1f5f9;
    }

    .image-wrap img {
      display: block;
      width: 100%;
      max-height: 440px;
      object-fit: cover;
    }

    .content {
      padding: 30px;
    }

    .brand {
      margin-bottom: 20px;
      color: #466460;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 14px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 11px;
      border-radius: 999px;
      background: #e0eceb;
      color: #466460;
      font-size: 12px;
      font-weight: 700;
    }

    .badge.priority {
      background: #f1f5f9;
      color: #64748b;
    }

    h1 {
      margin: 0 0 12px;
      color: #466460;
      font-size: 30px;
      line-height: 1.25;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      margin-bottom: 20px;
      color: #64748b;
      font-size: 14px;
    }

    .details {
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #475569;
      font-size: 16px;
      line-height: 1.75;
      white-space: pre-wrap;
    }

    .contact {
      display: grid;
      gap: 8px;
      margin-top: 22px;
      padding: 18px;
      border-radius: 16px;
      background: #f8fafc;
      color: #475569;
      font-size: 14px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 20px;
      border-radius: 12px;
      background: #466460;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
    }

    .button:hover {
      opacity: 0.92;
    }

    @media (max-width: 640px) {
      .page {
        padding: 0;
        align-items: stretch;
      }

      .card {
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      .content {
        padding: 22px;
      }

      h1 {
        font-size: 25px;
      }
    }
  </style>
</head>

<body>
  <main class="page">
    <article class="card">

      ${
        imageUrl
          ? `
      <div class="image-wrap">
        <img
          src="${safeImageUrl}"
          alt="${safeTitle}"
        />
      </div>
      `
          : ''
      }

      <div class="content">

        <div class="brand">
          MediTrack Announcement
        </div>

        <div class="badges">
          <span class="badge">
            ${safeCategory}
          </span>

          ${
            priority &&
            String(priority).toLowerCase() !== 'normal'
              ? `
          <span class="badge priority">
            ${safePriority}
          </span>
          `
              : ''
          }
        </div>

        <h1>
          ${safeTitle}
        </h1>

        <div class="meta">

          ${
            formattedDate
              ? `
          <span>
            ${safeDate}
          </span>
          `
              : ''
          }

          ${
            location
              ? `
          <span>
            ${safeLocation}
          </span>
          `
              : ''
          }

        </div>

        <div class="details">
${safeContent}
        </div>

        ${
          contactPerson || contactEmail
            ? `
        <div class="contact">

          ${
            contactPerson
              ? `
          <div>
            <strong>Contact:</strong>
            ${safeContactPerson}
          </div>
          `
              : ''
          }

          ${
            contactEmail
              ? `
          <div>
            <strong>Email:</strong>
            ${safeContactEmail}
          </div>
          `
              : ''
          }

        </div>
        `
            : ''
        }

        <div class="actions">
          <a
            class="button"
            href="${safePublicUrl}"
          >
            Open in MediTrack
          </a>
        </div>

      </div>
    </article>
  </main>
</body>
</html>
      `);
  } catch (error) {
    console.error(
      '[Announcements] Share page error:',
      error
    );

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

        updatedFields:
          Object.keys(req.body || {}),

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
      id:
        req.user?.uid ||
        req.user?.id ||
        null,

      email:
        req.user?.email ||
        null,

      name:
        resolveActorName(req),
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

      data:
        result || {
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
  getAnnouncementSharePage,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};