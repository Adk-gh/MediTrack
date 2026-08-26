// C:\Users\HP\MediTrack\features\announcements\announcements.service.js

const supabase = require('../../configs/database');
const archiveHelper = require('../archives/archiveHelper');
const notificationsService = require('../notifications/notifications.service');

// ============================================================
// CONFIGURATION
// ============================================================

const ARCHIVE_TYPE = 'announcement';

const BUCKET_NAME = 'MediStorage';
const IMAGE_FOLDER = 'announcements';

// Signed URL lifetime: 1 hour
const SIGNED_URL_TTL = 60 * 60;

// Maximum image size: 20 MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

// ============================================================
// CACHE
// ============================================================

let announcementsCache = {
  data: null,
  lastFetch: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000;

const clearCache = () => {
  announcementsCache.data = null;
  announcementsCache.lastFetch = null;
};

// ============================================================
// STORAGE HELPERS
// ============================================================

/**
 * Check whether a value is a full URL.
 */
const isFullUrl = (value) => {
  return (
    typeof value === 'string' &&
    /^https?:\/\//i.test(value)
  );
};

/**
 * Convert a stored image value into a Supabase storage path.
 *
 * New records:
 *   announcements/file.jpg
 *
 * Older records may contain:
 *   https://xxxxx.supabase.co/storage/v1/object/public/MediStorage/announcements/file.jpg
 *
 * This helper normalizes both formats.
 */
const getStoragePathFromValue = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // ----------------------------------------------------------
  // New format:
  //
  // announcements/file.jpg
  // ----------------------------------------------------------

  if (value.startsWith(`${IMAGE_FOLDER}/`)) {
    return value;
  }

  // ----------------------------------------------------------
  // Handle Supabase storage URLs
  // ----------------------------------------------------------

  const marker = '/storage/v1/object/';

  const markerIndex = value.indexOf(marker);

  if (markerIndex !== -1) {
    const afterMarker = value.substring(
      markerIndex + marker.length
    );

    const parts = afterMarker.split('/');

    if (parts.length >= 3) {
      const bucketIndex = parts.findIndex(
        part => part === BUCKET_NAME
      );

      if (bucketIndex !== -1) {
        return parts
          .slice(bucketIndex + 1)
          .join('/');
      }
    }
  }

  return null;
};

// ============================================================
// SIGNED URL
// ============================================================

/**
 * Generate a temporary signed URL for a private image.
 *
 * IMPORTANT:
 * MediStorage is PRIVATE.
 *
 * We intentionally do NOT use getPublicUrl().
 */
const createSignedImageUrl = async (storagePath) => {
  if (!storagePath) {
    return null;
  }

  // Normalize the stored value first.
  const normalizedPath =
    getStoragePathFromValue(storagePath);

  // ----------------------------------------------------------
  // Unknown old URL
  // ----------------------------------------------------------

  if (!normalizedPath) {
    /*
     * If this is an old full URL that we cannot normalize,
     * return it as-is so the record does not immediately
     * disappear from the frontend.
     *
     * New records will always use storage paths.
     */
    if (isFullUrl(storagePath)) {
      return storagePath;
    }

    return null;
  }

  // ----------------------------------------------------------
  // Generate signed URL
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(
      normalizedPath,
      SIGNED_URL_TTL
    );

  if (error) {
    console.error(
      '[Announcements] Failed to create signed image URL:',
      error
    );

    return null;
  }

  return data?.signedUrl || null;
};

// ============================================================
// ATTACH SIGNED URL TO ONE ANNOUNCEMENT
// ============================================================

const attachSignedImageUrl = async (announcement) => {
  if (!announcement) {
    return announcement;
  }

  const storageValue =
    announcement.image_url;

  // ----------------------------------------------------------
  // No image
  // ----------------------------------------------------------

  if (!storageValue) {
    return {
      ...announcement,
      image_url: null,
      image_path: null,
    };
  }

  // ----------------------------------------------------------
  // Get actual private storage path
  // ----------------------------------------------------------

  const storagePath =
    getStoragePathFromValue(storageValue);

  // ----------------------------------------------------------
  // Generate temporary signed URL
  // ----------------------------------------------------------

  const signedUrl =
    await createSignedImageUrl(storageValue);

  return {
    ...announcement,

    /*
     * Frontend uses image_url for:
     *
     * <img src={announcement.image_url} />
     */
    image_url: signedUrl || null,

    /*
     * Keep the actual private storage path available.
     */
    image_path:
      storagePath || storageValue,
  };
};

// ============================================================
// ATTACH SIGNED URLS TO MANY ANNOUNCEMENTS
// ============================================================

const attachSignedImageUrls = async (announcements) => {
  if (!Array.isArray(announcements)) {
    return [];
  }

  return Promise.all(
    announcements.map(
      attachSignedImageUrl
    )
  );
};

// ============================================================
// UPLOAD IMAGE
// ============================================================

/**
 * Upload a Multer file directly to the private
 * Supabase MediStorage bucket.
 *
 * The frontend sends:
 *
 * FormData:
 *   image = File
 *
 * Multer gives us:
 *
 * req.file = {
 *   buffer,
 *   mimetype,
 *   originalname,
 *   size,
 *   ...
 * }
 */
const uploadImageToStorage = async (file) => {
  if (!file) {
    return null;
  }

  // ----------------------------------------------------------
  // Validate buffer
  // ----------------------------------------------------------

  if (
    !file.buffer ||
    !Buffer.isBuffer(file.buffer)
  ) {
    throw new Error(
      'Invalid uploaded image'
    );
  }

  // ----------------------------------------------------------
  // Validate file size
  // ----------------------------------------------------------

  if (
    typeof file.size === 'number' &&
    file.size > MAX_IMAGE_SIZE
  ) {
    throw new Error(
      'Image must be smaller than 20 MB'
    );
  }

  // ----------------------------------------------------------
  // Allowed MIME types
  // ----------------------------------------------------------

  const allowedMimeTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  };

  const extension =
    allowedMimeTypes[file.mimetype];

  if (!extension) {
    throw new Error(
      `Unsupported image type: ${file.mimetype}`
    );
  }

  // ----------------------------------------------------------
  // Generate unique filename
  // ----------------------------------------------------------

  const fileName =
    `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

  const filePath =
    `${IMAGE_FOLDER}/${fileName}`;

  console.log(
    '[Announcements] Uploading image:',
    {
      bucket: BUCKET_NAME,
      path: filePath,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    }
  );

  // ----------------------------------------------------------
  // Upload directly to PRIVATE Supabase Storage
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(
      filePath,
      file.buffer,
      {
        contentType: file.mimetype,
        upsert: false,
      }
    );

  if (error) {
    console.error(
      '[Announcements] Storage upload error:',
      error
    );

    throw new Error(
      error.message ||
      'Failed to upload announcement image'
    );
  }

  const uploadedPath =
    data?.path || filePath;

  console.log(
    '[Announcements] Image uploaded successfully:',
    uploadedPath
  );

  /*
   * IMPORTANT:
   *
   * We DO NOT call:
   *
   * supabase.storage
   *   .from(...)
   *   .getPublicUrl(...)
   *
   * because MediStorage is PRIVATE.
   *
   * We store only:
   *
   * announcements/xxxxx.jpg
   *
   * Later, createSignedImageUrl()
   * generates a temporary signed URL.
   */

  return uploadedPath;
};

// ============================================================
// DELETE IMAGE FROM STORAGE
// ============================================================

const deleteImageFromStorage = async (
  imageValue
) => {
  if (!imageValue) {
    return;
  }

  const storagePath =
    getStoragePathFromValue(
      imageValue
    );

  if (!storagePath) {
    return;
  }

  try {
    console.log(
      '[Announcements] Deleting image:',
      storagePath
    );

    const {
      error,
    } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([
        storagePath
      ]);

    if (error) {
      console.error(
        '[Announcements] Failed to delete image:',
        error
      );
    } else {
      console.log(
        '[Announcements] Image deleted successfully:',
        storagePath
      );
    }

  } catch (error) {
    console.error(
      '[Announcements] Image deletion error:',
      error
    );
  }
};

// ============================================================
// GET ALL ANNOUNCEMENTS
// ============================================================

exports.getAllAnnouncements = async () => {
  const now = Date.now();

  /*
   * Do not return cached data directly because signed URLs
   * expire.
   *
   * We cache the database records and regenerate signed URLs
   * every time.
   */

  let announcements;

  if (
    announcementsCache.data &&
    announcementsCache.lastFetch &&
    now -
      announcementsCache.lastFetch <
      CACHE_TTL_MS
  ) {
    announcements =
      announcementsCache.data;

  } else {
    const {
      data,
      error,
    } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    announcements =
      data || [];

    announcementsCache.data =
      announcements;

    announcementsCache.lastFetch =
      now;
  }

  return attachSignedImageUrls(
    announcements
  );
};

// ============================================================
// GET ANNOUNCEMENT BY ID
// ============================================================

exports.getAnnouncementById = async (
  id
) => {
  let announcement = null;

  // ----------------------------------------------------------
  // Check cache first
  // ----------------------------------------------------------

  if (announcementsCache.data) {
    announcement =
      announcementsCache.data.find(
        a =>
          String(a.id) ===
          String(id)
      );
  }

  // ----------------------------------------------------------
  // Fetch from database if not cached
  // ----------------------------------------------------------

  if (!announcement) {
    const {
      data,
      error,
    } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .eq('is_archived', false)
      .single();

    if (
      error ||
      !data
    ) {
      const err =
        new Error(
          'Announcement not found'
        );

      err.statusCode = 404;

      throw err;
    }

    announcement = data;
  }

  return attachSignedImageUrl(
    announcement
  );
};

// ============================================================
// CREATE ANNOUNCEMENT
// ============================================================

/**
 * Create an announcement.
 *
 * @param {Object} data - Form fields from req.body
 * @param {Object|null} file - Multer req.file
 */
exports.createAnnouncement = async (
  data,
  file
) => {
  let imagePath = null;

  try {
    // --------------------------------------------------------
    // Upload image if supplied
    // --------------------------------------------------------

    if (file) {
      imagePath =
        await uploadImageToStorage(
          file
        );
    }

    // --------------------------------------------------------
    // Build database record
    // --------------------------------------------------------

    const newDoc = {
      ...data,

      /*
       * PRIVATE STORAGE PATH ONLY
       *
       * Example:
       *
       * announcements/1756000000_abcd1234.jpg
       */
      image_url:
        imagePath,

      created_at:
        data.created_at ||
        new Date().toISOString(),
    };

    // --------------------------------------------------------
    // Remove frontend-only properties
    // --------------------------------------------------------

    delete newDoc.image;
    delete newDoc.imageFile;
    delete newDoc.image_path;

    // Prevent legacy Base64 property
    delete newDoc.image_url_base64;

    // Prevent an accidental old Base64 image_url
    //
    // If there is no uploaded file, image_url should
    // remain null instead of accepting a Base64 string.
    if (!file) {
      newDoc.image_url = null;
    }

    // --------------------------------------------------------
    // Insert database record
    // --------------------------------------------------------

    const {
      data: announcement,
      error,
    } = await supabase
      .from('announcements')
      .insert(newDoc)
      .select()
      .single();

    // --------------------------------------------------------
    // Database failure cleanup
    // --------------------------------------------------------

    if (error) {
      if (imagePath) {
        await deleteImageFromStorage(
          imagePath
        );
      }

      throw error;
    }

    clearCache();

    // --------------------------------------------------------
    // Notification
    // --------------------------------------------------------

    try {
      await notificationsService
        .notifyAnnouncement(
          announcement
        );

    } catch (
      notificationError
    ) {
      console.error(
        '[Announcements] Notification dispatch failed:',
        notificationError
      );
    }

    // --------------------------------------------------------
    // Return announcement with signed URL
    // --------------------------------------------------------

    return attachSignedImageUrl(
      announcement
    );

  } catch (error) {
    /*
     * If anything fails after the image upload but before
     * the database record is successfully created, clean up
     * the uploaded image.
     *
     * The database failure block above handles Supabase
     * insert errors. This additional guard handles other
     * unexpected errors.
     */

    if (imagePath) {
      try {
        await deleteImageFromStorage(
          imagePath
        );
      } catch (cleanupError) {
        console.error(
          '[Announcements] Upload cleanup failed:',
          cleanupError
        );
      }
    }

    throw error;
  }
};

// ============================================================
// UPDATE ANNOUNCEMENT
// ============================================================

/**
 * Update an announcement.
 *
 * @param {string|number} id
 * @param {Object} data - Form fields from req.body
 * @param {Object|null} file - Multer req.file
 */
exports.updateAnnouncement = async (
  id,
  data,
  file
) => {
  // ----------------------------------------------------------
  // Get existing announcement
  // ----------------------------------------------------------

  const {
    data: existingAnnouncement,
    error: fetchError,
  } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();

  if (
    fetchError ||
    !existingAnnouncement
  ) {
    const error =
      new Error(
        'Announcement not found'
      );

    error.statusCode = 404;

    throw error;
  }

  // ----------------------------------------------------------
  // Existing image path
  // ----------------------------------------------------------

  const existingImagePath =
    getStoragePathFromValue(
      existingAnnouncement.image_url
    );

  let imagePath =
    existingImagePath || null;

  let newImageUploaded = false;

  // ----------------------------------------------------------
  // Upload replacement image
  // ----------------------------------------------------------

  if (file) {
    imagePath =
      await uploadImageToStorage(
        file
      );

    newImageUploaded = true;
  }

  // ----------------------------------------------------------
  // Build update data
  // ----------------------------------------------------------

  const updateData = {
    ...data,

    /*
     * If there is a new file:
     *    use the new path.
     *
     * If there isn't:
     *    preserve the existing path.
     */
    image_url:
      imagePath,

    updated_at:
      new Date().toISOString(),
  };

  // ----------------------------------------------------------
  // Remove frontend-only fields
  // ----------------------------------------------------------

  delete updateData.image;
  delete updateData.imageFile;
  delete updateData.image_path;

  // ----------------------------------------------------------
  // Remove legacy Base64 fields
  // ----------------------------------------------------------

  delete updateData.image_url_base64;

  /*
   * The frontend should no longer send image_url.
   *
   * If it does accidentally send an old signed URL or
   * Base64 value, never overwrite the database with it.
   *
   * The actual image is controlled by req.file.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      data,
      'image_url'
    )
  ) {
    updateData.image_url =
      imagePath;
  }

  // ----------------------------------------------------------
  // Update database
  // ----------------------------------------------------------

  const {
    data: updatedAnnouncement,
    error,
  } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  // ----------------------------------------------------------
  // Database update failed
  // ----------------------------------------------------------

  if (error) {
    /*
     * If a replacement image was uploaded but the database
     * update failed, delete the new image.
     */
    if (
      newImageUploaded &&
      imagePath
    ) {
      await deleteImageFromStorage(
        imagePath
      );
    }

    throw error;
  }

  // ----------------------------------------------------------
  // Delete old image after successful DB update
  // ----------------------------------------------------------

  if (
    newImageUploaded &&
    existingImagePath &&
    existingImagePath !== imagePath
  ) {
    await deleteImageFromStorage(
      existingImagePath
    );
  }

  clearCache();

  // ----------------------------------------------------------
  // Dispatch Update Notification
  // ----------------------------------------------------------

try {
    /*
     * We pass the updated record to keep the "dept" targeting intact,
     * but we overwrite the title and content to make it explicitly
     * an "Update" notification.
     */
    await notificationsService.notifyAnnouncement({
      ...updatedAnnouncement,
      title: `[UPDATED] ${updatedAnnouncement.title}`,
      content: `There are changes to this announcement... go check it out!`,

      // ADD THIS: Pass an icon identifier for the frontend to consume
      icon: 'megaphone',
      type: 'update'
    });
  } catch (notificationError) {
    console.error(
      '[Announcements] Update notification dispatch failed:',
      notificationError
    );
  }

  // ----------------------------------------------------------
  // Return updated announcement with signed URL
  // ----------------------------------------------------------

  return attachSignedImageUrl(
    updatedAnnouncement
  );
};

// ============================================================
// DELETE / ARCHIVE ANNOUNCEMENT
// ============================================================

exports.deleteAnnouncement = async (
  id,
  deletedBy
) => {
  /*
   * We intentionally archive rather than immediately
   * deleting the database row.
   *
   * The archive helper remains responsible for the
   * announcement archive behavior.
   */

  await archiveHelper.archiveAndDelete(
    {
      type: ARCHIVE_TYPE,
      originalId: id,
      tableName: 'announcements',
      idColumn: 'id',
      deletedBy,
    },
    supabase
  );

  clearCache();

  return {
    id,
  };
};

// ============================================================
// OPTIONAL IMAGE HELPERS
// ============================================================

exports.createSignedImageUrl =
  createSignedImageUrl;

exports.uploadImageToStorage =
  uploadImageToStorage;

exports.deleteImageFromStorage =
  deleteImageFromStorage;