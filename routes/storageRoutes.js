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
// GET: LIST ALL STORAGE BUCKETS
// ==========================================

router.get('/buckets', authorized, allowDynamicAdmin, async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log('\n========== STORAGE BUCKET DEBUG ==========');
    console.log('[Storage] Request received');
    console.log('[Storage] SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log(
      '[Storage] Service key configured:',
      Boolean(process.env.SUPABASE_SERVICE_KEY)
    );
    console.log(
      '[Storage] Service key length:',
      process.env.SUPABASE_SERVICE_KEY?.length || 0
    );

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('[Storage] Missing Supabase configuration');

      return res.status(500).json({
        success: false,
        error: 'Supabase credentials are not fully configured on the backend.'
      });
    }

    const { data, error } = await withTimeout(
      supabase.storage.listBuckets(),
      10000
    );

    console.log('[Storage] Raw listBuckets data:', data);
    console.log('[Storage] Raw listBuckets error:', error);

    if (error) {
      console.error(
        '[Storage] listBuckets() failed:',
        getErrorMessage(error)
      );

      return res.status(502).json({
        success: false,
        error: 'Failed to retrieve storage buckets from Supabase.',
        details: getErrorMessage(error)
      });
    }

    if (!Array.isArray(data)) {
      console.error('[Storage] Unexpected bucket response:', data);

      return res.status(502).json({
        success: false,
        error: 'Supabase returned an invalid bucket list.'
      });
    }

    console.log(`[Storage] Found ${data.length} bucket(s)`);

    data.forEach((bucket, index) => {
      console.log(
        `[Storage] ${index + 1}. ${bucket.name} | public: ${bucket.public}`
      );
    });

    console.log('==========================================\n');

    return res.status(200).json({
      success: true,
      buckets: data,
      count: data.length
    });

  } catch (error) {
    console.error(
      '[Storage] Unexpected error loading buckets:',
      error
    );

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

// ==========================================
// GET: GENERATE TEMPORARY FILE VIEW URL
// ==========================================
router.get(
  '/buckets/:bucketId/view',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      const { bucketId } = req.params;
      const { path } = req.query;

      if (!bucketId) {
        return res.status(400).json({
          success: false,
          error: 'Bucket ID is required.'
        });
      }

      if (!path || typeof path !== 'string' || !path.trim()) {
        return res.status(400).json({
          success: false,
          error: 'File path is required.'
        });
      }

      const filePath = path.trim();

      console.log(
        `[Storage] Creating signed URL for ${bucketId}/${filePath}`
      );

      // URL is valid for 5 minutes.
      // The file itself remains private in Supabase.
      const { data, error } = await withTimeout(
        supabase.storage
          .from(bucketId)
          .createSignedUrl(filePath, 300),
        10000
      );

      if (error) {
        console.error(
          '[Storage] Failed to create signed URL:',
          error
        );

        return res.status(502).json({
          success: false,
          error: 'Failed to generate file preview URL.',
          details: getErrorMessage(error)
        });
      }

      if (!data?.signedUrl) {
        return res.status(502).json({
          success: false,
          error: 'Supabase did not return a signed URL.'
        });
      }

      return res.status(200).json({
        success: true,
        url: data.signedUrl,
        expiresIn: 300
      });

    } catch (error) {
      console.error(
        '[Storage] Unexpected error generating signed URL:',
        error
      );

      return res.status(500).json({
        success: false,
        error: 'Unexpected error while preparing file preview.',
        details: error.message
      });
    }
  }
);

module.exports = router;