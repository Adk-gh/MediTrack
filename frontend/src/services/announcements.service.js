// C:\Users\HP\MediTrack\frontend\src\services\announcements.service.js
import { supabase } from '../supabase';

// ── FRONTEND CACHE STATE ──────────────────────────────────────────────
let announcementsCache = {
  data: null,
  lastFetch: null,
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const clearAnnouncementsCache = () => {
  announcementsCache.data = null;
  announcementsCache.lastFetch = null;
};
// ──────────────────────────────────────────────────────────────────────

const uploadImageToStorage = async (base64String) => {
  if (!base64String || base64String.startsWith('http')) {
    return base64String;
  }

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image format');
  }

  const mimeType = matches[1];
  const buffer = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
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

export const getAllAnnouncements = async (forceRefresh = false) => {
  const now = Date.now();

  // 1. Check if we have valid, unexpired data in the browser's memory
  if (!forceRefresh && announcementsCache.data && announcementsCache.lastFetch && (now - announcementsCache.lastFetch < CACHE_TTL_MS)) {
    console.log('[Announcements] Loaded instantly from browser cache ⚡');
    return announcementsCache.data;
  }

  // 2. Otherwise, fetch from Supabase
  console.log('[Announcements] Fetching fresh data from Supabase...');
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Failed to fetch announcements');

  // 3. Save the result to the cache
  announcementsCache.data = data;
  announcementsCache.lastFetch = now;

  return data;
};

export const getAnnouncementById = async (id) => {
  // Try to grab it from the cache first for instant load
  if (announcementsCache.data) {
    const cachedItem = announcementsCache.data.find(a => a.id === id);
    if (cachedItem) return cachedItem;
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message || 'Failed to fetch announcement');
  return data;
};

export const createAnnouncement = async (announcementData) => {
  let imageUrl = null;

  if (announcementData.image) {
    imageUrl = await uploadImageToStorage(announcementData.image);
  }

  const newDoc = {
    ...announcementData,
    image: imageUrl,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('announcements')
    .insert(newDoc)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to create announcement');

  // Clear cache so the next fetch gets the new item
  clearAnnouncementsCache();
  return data;
};

export const updateAnnouncement = async (id, announcementData) => {
  let imageUrl = announcementData.image;

  if (announcementData.image && announcementData.image.startsWith('data:image')) {
    imageUrl = await uploadImageToStorage(announcementData.image);
  }

  const updateData = {
    ...announcementData,
    image: imageUrl,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to update announcement');

  // Clear cache so the edits show up immediately
  clearAnnouncementsCache();
  return data;
};

export const deleteAnnouncement = async (id) => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message || 'Failed to delete announcement');

  // Clear cache to remove the deleted item
  clearAnnouncementsCache();
  return { id };
};

export default {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  clearAnnouncementsCache,
};