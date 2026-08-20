// C:\Users\HP\MediTrack\routes\storageRoutes.js

const express = require('express');
const supabase = require('../configs/database');

const { authorized } = require('../middleware/authorized');
const { getSystemConfig } = require('../services/systemConfig.service');

const router = express.Router();

// ==========================================
// HELPERS
// ==========================================

const withTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Supabase request timed out after ${ms}ms`));
      }, ms);
    })
  ]);
};

const getErrorMessage = (error) => {
  if (!error) return 'Unknown error';
  return (
    error.message ||
    error.error_description ||
    error.details ||
    error.hint ||
    'Unknown Supabase error'
  );
};

// =========================================================
// DYNAMIC ROLE MIDDLEWARES
// =========================================================

const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();
    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    const allowedRoles = [
      ...adminRoles,
      "sysadmin",
      "doctor",
      "dentist",
      "nurse"
    ];

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. Admin privileges required."
    });
  } catch (error) {
    console.error("[DynamicRoleCheck] Admin verification failed:", error);
    return res.status(500).json({ message: "Internal server error during role validation." });
  }
};

// ==========================================
// GET: LIST ALL STORAGE BUCKETS (Guaranteed)
// ==========================================

router.get('/buckets', authorized, allowDynamicAdmin, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Supabase credentials are not fully configured on the backend.'
      });
    }

    let buckets = [];

    // 1. Primary Attempt: Standard Storage API
    try {
      const { data, error } = await withTimeout(supabase.storage.listBuckets(), 8000);
      if (!error && Array.isArray(data) && data.length > 0) {
        buckets = data;
      }
    } catch (err) {
      console.warn('[Storage] listBuckets() attempt failed or timed out:', err.message);
    }

    // 2. Secondary Fallback: Query storage schema directly via database client
    if (buckets.length === 0) {
      try {
        const { data: dbBuckets, error: dbErr } = await supabase
          .schema('storage')
          .from('buckets')
          .select('*');

        if (!dbErr && Array.isArray(dbBuckets) && dbBuckets.length > 0) {
          buckets = dbBuckets;
        }
      } catch (err) {
        console.warn('[Storage] Database query for storage.buckets failed:', err.message);
      }
    }

    // 3. Tertiary Safety Net: Fallback to predefined application buckets
    if (buckets.length === 0) {
      const KNOWN_BUCKETS = ['MediStorage'];

      for (const bucketName of KNOWN_BUCKETS) {
        try {
          const { error } = await supabase.storage.from(bucketName).list('', { limit: 1 });
          if (!error) {
            buckets.push({
              id: bucketName,
              name: bucketName,
              public: true,
              created_at: new Date().toISOString()
            });
          }
        } catch {}
      }
    }

    return res.status(200).json({
      success: true,
      buckets
    });

  } catch (error) {
    console.error('[Storage] Unexpected error loading buckets:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected error while loading storage buckets.',
      details: error.message
    });
  }
});

// ==========================================
// GET: LIST FOLDERS / FILES
// ==========================================

router.get('/buckets/:bucketId/list', authorized, allowDynamicAdmin, async (req, res) => {
  try {
    const { bucketId } = req.params;
    const prefix = req.query.prefix || '';

    if (!bucketId) {
      return res.status(400).json({
        success: false,
        error: 'Bucket ID is required.'
      });
    }

    const { data, error } = await withTimeout(
      supabase.storage.from(bucketId).list(prefix, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      }),
      10000
    );

    if (error) {
      return res.status(502).json({
        success: false,
        error: 'Failed to list objects from Supabase Storage.',
        details: getErrorMessage(error)
      });
    }

    const items = (data || [])
      .filter(item => item.name !== '.emptyFolderPlaceholder')
      .map(item => {
        const isFolder = item.id === null;
        return {
          name: item.name,
          path: prefix ? `${prefix}/${item.name}` : item.name,
          type: isFolder ? 'folder' : 'file',
          size: item.metadata?.size ?? null,
          updated_at: item.updated_at || item.created_at || null,
          mime_type: item.metadata?.mimetype || null
        };
      });

    return res.status(200).json({
      success: true,
      items,
      prefix
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Unexpected error while listing storage objects.',
      details: error.message
    });
  }
});

// ==========================================
// HELPER: RECURSIVELY COLLECT FILE PATHS
// ==========================================

async function collectFilePaths(bucketId, prefix) {
  const { data, error } = await withTimeout(
    supabase.storage.from(bucketId).list(prefix, { limit: 1000 }),
    10000
  );

  if (error) throw error;

  let paths = [];

  for (const item of data || []) {
    if (item.name === '.emptyFolderPlaceholder') continue;

    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      const nestedPaths = await collectFilePaths(bucketId, itemPath);
      paths = paths.concat(nestedPaths);
    } else {
      paths.push(itemPath);
    }
  }

  return paths;
}

// ==========================================
// DELETE: REMOVE SPECIFIC FILES
// ==========================================

router.delete('/buckets/:bucketId/objects', authorized, allowDynamicAdmin, async (req, res) => {
  try {
    const { bucketId } = req.params;
    const { paths } = req.body;

    if (!bucketId) {
      return res.status(400).json({ success: false, error: 'Bucket ID is required.' });
    }

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ success: false, error: 'paths must be a non-empty array.' });
    }

    const validPaths = paths.filter(path => typeof path === 'string' && path.trim().length > 0);

    if (validPaths.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid file paths were provided.' });
    }

    const { data, error } = await withTimeout(
      supabase.storage.from(bucketId).remove(validPaths),
      15000
    );

    if (error) {
      return res.status(502).json({
        success: false,
        error: 'Failed to delete storage objects.',
        details: getErrorMessage(error)
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Objects deleted successfully.',
      deleted: data || [],
      deletedCount: validPaths.length
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Unexpected error while deleting storage objects.',
      details: error.message
    });
  }
});

// ==========================================
// DELETE: REMOVE ENTIRE FOLDER
// ==========================================

router.delete('/buckets/:bucketId/folder', authorized, allowDynamicAdmin, async (req, res) => {
  try {
    const { bucketId } = req.params;
    const { prefix } = req.body;

    if (!bucketId || typeof prefix !== 'string' || !prefix.trim()) {
      return res.status(400).json({ success: false, error: 'Bucket ID and prefix are required.' });
    }

    const cleanPrefix = prefix.trim();
    const allPaths = await collectFilePaths(bucketId, cleanPrefix);

    if (allPaths.length === 0) {
      return res.status(200).json({
        success: true,
        deletedCount: 0,
        message: 'Folder was already empty.'
      });
    }

    const chunkSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < allPaths.length; i += chunkSize) {
      const chunk = allPaths.slice(i, i + chunkSize);
      const { error } = await withTimeout(
        supabase.storage.from(bucketId).remove(chunk),
        15000
      );

      if (error) {
        return res.status(502).json({
          success: false,
          error: 'Failed to delete folder contents.',
          details: getErrorMessage(error),
          deletedCount
        });
      }

      deletedCount += chunk.length;
    }

    return res.status(200).json({
      success: true,
      message: 'Folder deleted successfully.',
      deletedCount
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Unexpected error while deleting folder.',
      details: error.message
    });
  }
});

module.exports = router;