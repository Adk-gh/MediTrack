// C:\Users\HP\MediTrack\frontend\src\services\archive.service.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// Get current user info for deleted_by field
const getCurrentUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.name || user.email || user.role || 'SysAdmin';
  } catch {
    return 'Admin';
  }
};

/**
 * Archive an item before deletion
 * @param {string} type - archive type (record, announcement, user, consultation, appointment, examination)
 * @param {string} originalId - the ID of the item being deleted
 * @param {object} data - complete data of the item to archive
 */
export const archiveItem = async (type, originalId, data) => {
  try {
    const response = await fetch(`${API_URL}/archives`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        originalId,
        data,
        deletedBy: getCurrentUser(),
      }),
      ...getAuthHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to archive item');
    }

    return result.data;
  } catch (error) {
    console.error('[Archive Service] Error archiving item:', error);
    throw error;
  }
};

/**
 * Get all archives with optional filters
 * @param {object} params - { type, search, page, limit }
 */
export const getArchives = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await fetch(`${API_URL}/archives?${queryParams}`, {
      method: 'GET',
      ...getAuthHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch archives');
    }

    return result.data;
  } catch (error) {
    console.error('[Archive Service] Error fetching archives:', error);
    throw error;
  }
};

/**
 * Get archive statistics
 */
export const getArchiveStats = async () => {
  try {
    const response = await fetch(`${API_URL}/archives/stats`, {
      method: 'GET',
      ...getAuthHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch archive stats');
    }

    return result.data;
  } catch (error) {
    console.error('[Archive Service] Error fetching stats:', error);
    throw error;
  }
};

/**
 * Restore an item from archives
 * @param {string} id - archive entry ID
 */
export const restoreItem = async (id) => {
  try {
    const response = await fetch(`${API_URL}/archives/${id}/restore`, {
      method: 'POST',
      ...getAuthHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to restore item');
    }

    return result.data;
  } catch (error) {
    console.error('[Archive Service] Error restoring item:', error);
    throw error;
  }
};

/**
 * Permanently delete an archive entry
 * @param {string} id - archive entry ID
 */
export const permanentDeleteArchive = async (id) => {
  try {
    const response = await fetch(`${API_URL}/archives/${id}`, {
      method: 'DELETE',
      ...getAuthHeaders(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to permanently delete item');
    }

    return result.data;
  } catch (error) {
    console.error('[Archive Service] Error permanently deleting:', error);
    throw error;
  }
};

export default {
  archiveItem,
  getArchives,
  getArchiveStats,
  restoreItem,
  permanentDeleteArchive,
};