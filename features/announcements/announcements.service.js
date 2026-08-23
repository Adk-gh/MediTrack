const supabase = require('../../configs/database');
const archiveHelper = require('../archives/archiveHelper');
const notificationsService = require('../notifications/notifications.service');

const ARCHIVE_TYPE = 'announcement';

const BUCKET_NAME = 'meditrack-files';
const IMAGE_FOLDER = 'announcements';

// Signed URL lifetime: 1 hour
const SIGNED_URL_TTL = 60 * 60;

let announcementsCache = {
  data: null,
  lastFetch: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================
// CACHE
// ============================================================

const clearCache = () => {
  announcementsCache.data = null;
  announcementsCache.lastFetch = null;
};

// ============================================================
// HELPERS
// ============================================================

const isBase64Image = (value) => {
  return (
    typeof value === 'string' &&
    /^data:image\/[A-Za-z0-9.+-]+;base64,/.test(value)
  );
};

const isFullUrl = (value) => {
  return (
    typeof value === 'string' &&
    /^https?:\/\//i.test(value)
  );
};

const getStoragePathFromValue = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  /*
   * New format:
   * announcements/file.jpg
   */
  if (value.startsWith(`${IMAGE_FOLDER}/`)) {
    return value;
  }

  /*
   * Handle Supabase storage URLs that may already exist
   * from older records.
   *
   * Example:
   * https://xxxxx.supabase.co/storage/v1/object/public/meditrack-files/announcements/file.jpg
   */

  const marker = `/storage/v1/object/`;

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

const createSignedImageUrl = async (storagePath) => {
  if (!storagePath) {
    return null;
  }

  /*
   * If this is already a full URL, try to extract the
   * underlying Supabase storage path.
   */
  const normalizedPath = getStoragePathFromValue(storagePath);

  if (!normalizedPath) {
    /*
     * Unknown old URL.
     *
     * Return it as-is so existing records do not immediately
     * break. New records will always use storage paths.
     */
    if (isFullUrl(storagePath)) {
      return storagePath;
    }

    return null;
  }

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
// ADD SIGNED URL TO ANNOUNCEMENT
// ============================================================

const attachSignedImageUrl = async (announcement) => {
  if (!announcement) {
    return announcement;
  }

  const storageValue = announcement.image_url;

  if (!storageValue) {
    return {
      ...announcement,
      image_url: null,
      image_path: null,
    };
  }

  const storagePath =
    getStoragePathFromValue(storageValue);

  /*
   * Generate a temporary signed URL.
   */
  const signedUrl =
    await createSignedImageUrl(storageValue);

  return {
    ...announcement,

    /*
     * Frontend uses image_url for <img src="">
     */
    image_url: signedUrl || null,

    /*
     * Keep the actual private storage path available
     * internally/for debugging if needed.
     */
    image_path: storagePath || storageValue,
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
    announcements.map(attachSignedImageUrl)
  );
};

// ============================================================
// UPLOAD IMAGE
// ============================================================

const uploadImageToStorage = async (base64String) => {
  if (!base64String) {
    return null;
  }

  if (!isBase64Image(base64String)) {
    throw new Error('Invalid base64 image format');
  }

  const matches = base64String.match(
    /^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/
  );

  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  const buffer = Buffer.from(
    base64Data,
    'base64'
  );

  /*
   * Basic server-side protection against extremely large
   * uploads.
   *
   * Frontend already limits images to 5 MB, but this protects
   * the backend as well.
   */
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(
      'Image must be smaller than 5 MB'
    );
  }

  let extension = 'jpg';

  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      extension = 'jpg';
      break;

    case 'image/png':
      extension = 'png';
      break;

    case 'image/gif':
      extension = 'gif';
      break;

    case 'image/webp':
      extension = 'webp';
      break;

    case 'image/bmp':
      extension = 'bmp';
      break;

    case 'image/svg+xml':
      extension = 'svg';
      break;

    default:
      throw new Error(
        `Unsupported image type: ${mimeType}`
      );
  }

  const fileName =
    `${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)}.${extension}`;

  const filePath =
    `${IMAGE_FOLDER}/${fileName}`;

  const {
    data,
    error,
  } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(
      filePath,
      buffer,
      {
        contentType: mimeType,
        upsert: false,
      }
    );

  if (error) {
    console.error(
      '[Announcements] Storage upload error:',
      error
    );

    throw new Error(
      'Failed to upload announcement image'
    );
  }

  /*
   * IMPORTANT:
   *
   * We DO NOT call getPublicUrl().
   *
   * The bucket is private.
   *
   * Store only the storage path in the database.
   */
  return data?.path || filePath;
};

// ============================================================
// DELETE IMAGE FROM STORAGE
// ============================================================

const deleteImageFromStorage = async (imageValue) => {
  if (!imageValue) {
    return;
  }

  const storagePath =
    getStoragePathFromValue(imageValue);

  if (!storagePath) {
    return;
  }

  try {
    const { error } =
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

    if (error) {
      console.error(
        '[Announcements] Failed to delete image:',
        error
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
   * We can cache the database records and regenerate signed
   * URLs every time.
   */
  let announcements;

  if (
    announcementsCache.data &&
    announcementsCache.lastFetch &&
    now - announcementsCache.lastFetch < CACHE_TTL_MS
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

    announcements = data || [];

    announcementsCache.data =
      announcements;

    announcementsCache.lastFetch = now;
  }

  return attachSignedImageUrls(
    announcements
  );
};

// ============================================================
// GET ANNOUNCEMENT BY ID
// ============================================================

exports.getAnnouncementById = async (id) => {
  let announcement = null;

  if (announcementsCache.data) {
    announcement =
      announcementsCache.data.find(
        a => String(a.id) === String(id)
      );
  }

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

    if (error || !data) {
      const err = new Error(
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

exports.createAnnouncement = async (data) => {
  let imagePath = null;

  /*
   * Frontend sends image_url as a base64 string.
   */
  if (
    data.image_url &&
    isBase64Image(data.image_url)
  ) {
    imagePath =
      await uploadImageToStorage(
        data.image_url
      );
  }

  const newDoc = {
    ...data,

    /*
     * Never store the base64 data in Supabase.
     *
     * Store only:
     * announcements/xxxxx.jpg
     */
    image_url: imagePath,

    created_at:
      data.created_at ||
      new Date().toISOString(),
  };

  /*
   * Remove frontend-only fields if present.
   */
  delete newDoc.image;
  delete newDoc.imageFile;
  delete newDoc.image_path;

  const {
    data: announcement,
    error,
  } = await supabase
    .from('announcements')
    .insert(newDoc)
    .select()
    .single();

  if (error) {
    /*
     * If database insertion fails after image upload,
     * clean up the uploaded image.
     */
    if (imagePath) {
      await deleteImageFromStorage(
        imagePath
      );
    }

    throw error;
  }

  clearCache();

  /*
   * Broadcast notification.
   */
  try {
    await notificationsService.notifyAnnouncement(
      announcement
    );
  } catch (notificationError) {
    console.error(
      '[Announcements] Notification dispatch failed:',
      notificationError
    );
  }

  return attachSignedImageUrl(
    announcement
  );
};

// ============================================================
// UPDATE ANNOUNCEMENT
// ============================================================

exports.updateAnnouncement = async (
  id,
  data
) => {
  /*
   * Get the existing record first so we can preserve its
   * image if the user doesn't upload a replacement.
   */
  const {
    data: existingAnnouncement,
    error: fetchError,
  } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingAnnouncement) {
    const error = new Error(
      'Announcement not found'
    );

    error.statusCode = 404;

    throw error;
  }

  let imagePath =
    existingAnnouncement.image_url ||
    null;

  let newImageUploaded = false;

  /*
   * Only upload when a NEW base64 image is supplied.
   */
  if (
    data.image_url &&
    isBase64Image(data.image_url)
  ) {
    imagePath =
      await uploadImageToStorage(
        data.image_url
      );

    newImageUploaded = true;
  }

  const updateData = {
    ...data,

    image_url: imagePath,

    updated_at:
      new Date().toISOString(),
  };

  /*
   * Do not store these frontend-only properties.
   */
  delete updateData.image;
  delete updateData.imageFile;
  delete updateData.image_path;

  /*
   * Never accidentally store a signed URL.
   *
   * If image_url was supplied as a signed URL instead
   * of a new base64 image, keep the existing database
   * image path.
   */
  if (
    data.image_url &&
    !isBase64Image(data.image_url)
  ) {
    updateData.image_url =
      existingAnnouncement.image_url ||
      null;
  }

  const {
    data: updatedAnnouncement,
    error,
  } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    /*
     * If we uploaded a replacement but the DB update failed,
     * remove the newly uploaded image.
     */
    if (newImageUploaded && imagePath) {
      await deleteImageFromStorage(
        imagePath
      );
    }

    throw error;
  }

  /*
   * If a replacement image was successfully saved,
   * delete the old image.
   */
  if (
    newImageUploaded &&
    existingAnnouncement.image_url &&
    existingAnnouncement.image_url !== imagePath
  ) {
    await deleteImageFromStorage(
      existingAnnouncement.image_url
    );
  }

  clearCache();

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