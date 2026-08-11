// backend/features/announcements/announcements.service.js
const supabase = require('../../configs/database');
const archiveHelper = require('../archives/archiveHelper');
const notificationsService = require('../notifications/notifications.service');

const ARCHIVE_TYPE = 'announcement';

let announcementsCache = {
  data: null,
  lastFetch: null,
};
const CACHE_TTL_MS = 5 * 60 * 1000;

const clearCache = () => {
  announcementsCache.data = null;
  announcementsCache.lastFetch = null;
};

const uploadImageToStorage = async (base64String) => {
  if (!base64String || base64String.startsWith('http')) {
    return base64String;
  }

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const extension = mimeType.split('/')[1];
  const fileName = `announcements/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

  const { data, error } = await supabase.storage
    .from('meditrack-files')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('>>> [Storage] Upload error:', error);
    throw new Error('Failed to upload image');
  }

  const { data: urlData } = supabase.storage
    .from('meditrack-files')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

exports.getAllAnnouncements = async () => {
  const now = Date.now();

  if (announcementsCache.data && announcementsCache.lastFetch && (now - announcementsCache.lastFetch < CACHE_TTL_MS)) {
    return announcementsCache.data;
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  announcementsCache.data = data;
  announcementsCache.lastFetch = now;

  return data;
};

exports.getAnnouncementById = async (id) => {
  if (announcementsCache.data) {
    const cachedItem = announcementsCache.data.find(a => a.id === id);
    if (cachedItem) return cachedItem;
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('is_archived', false)
    .single();

  if (error || !data) {
    const err = new Error('Announcement not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
};

exports.createAnnouncement = async (data) => {
  let imageUrl = null;

  if (data.image) {
    imageUrl = await uploadImageToStorage(data.image);
  }

  const newDoc = {
    ...data,
    image: imageUrl,
    created_at: new Date().toISOString(),
  };

  const { data: announcement, error } = await supabase
    .from('announcements')
    .insert(newDoc)
    .select()
    .single();

  if (error) throw error;

  clearCache();

  // ── Dispatch Broadcast Notification ──
  await notificationsService.notifyAnnouncement(announcement);

  return announcement;
};

exports.updateAnnouncement = async (id, data) => {
  let imageUrl = data.image;

  if (data.image && data.image.startsWith('data:image')) {
    imageUrl = await uploadImageToStorage(data.image);
  }

  const updateData = {
    ...data,
    image: imageUrl,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;

  clearCache();

  return { id, ...updateData };
};

exports.deleteAnnouncement = async (id, deletedBy) => {
  await archiveHelper.archiveAndDelete({
    type: ARCHIVE_TYPE,
    originalId: id,
    tableName: 'announcements',
    idColumn: 'id',
    deletedBy
  }, supabase);

  clearCache();

  return { id };
};