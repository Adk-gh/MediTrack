// C:\Users\HP\MediTrack\features/announcements/announcements.service.js
const supabase = require('../../configs/database');

// ── In-Memory Cache Setup ──────────────────────────────────────────────
let announcementsCache = {
  data: null,
  lastFetch: null,
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const clearCache = () => {
  announcementsCache.data = null;
  announcementsCache.lastFetch = null;
};
// ───────────────────────────────────────────────────────────────────────

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

  // 1. Check if cache is valid and not expired
  if (announcementsCache.data && announcementsCache.lastFetch && (now - announcementsCache.lastFetch < CACHE_TTL_MS)) {
    console.log('>>> [Announcements] Serving from Node memory cache');
    return announcementsCache.data;
  }

  // 2. If no cache or expired, fetch from Supabase
  console.log('>>> [Announcements] Cache empty/expired. Fetching from Supabase DB...');
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // 3. Save the fresh data to the cache
  announcementsCache.data = data;
  announcementsCache.lastFetch = now;

  return data;
};

exports.getAnnouncementById = async (id) => {
  // Try to grab it from the cache first for instant load
  if (announcementsCache.data) {
    const cachedItem = announcementsCache.data.find(a => a.id === id);
    if (cachedItem) return cachedItem;
  }

  // Fallback to database if not in cache
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    const error = new Error('Announcement not found');
    error.statusCode = 404;
    throw error;
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

  // Clear cache so all students see the new announcement instantly
  clearCache();

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

  // Clear cache so edits propagate instantly
  clearCache();

  return { id, ...updateData };
};

exports.deleteAnnouncement = async (id) => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Clear cache so the deleted item vanishes instantly
  clearCache();

  return { id };
};