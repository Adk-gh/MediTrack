// C:\Users\HP\MediTrack\routes\storageRoutes.js

const express = require('express');
const supabase = require('../configs/database');

const { authorized } = require('../middleware/authorized');
const { getSystemConfig } = require('../services/systemConfig.service');

const router = express.Router();

// ==========================================
// HELPERS
// ==========================================

/**
 * Prevent Supabase requests from hanging indefinitely.
 */
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

/**
 * Safely return a useful error message.
 */
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

// Allows Admin Roles ONLY (for managing raw storage buckets)
const allowDynamicAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (!userRole) {
      return res.status(403).json({ message: "Access denied. No role found." });
    }

    const config = await getSystemConfig();

    const adminRoles = (config.admin_roles || []).map(r => r.toLowerCase());

    // Safety net: Keep sysadmin and core clinical roles as hardcoded fallbacks
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
// STORAGE MANAGER ROUTES
// ==========================================
//
// This router uses the server-side Supabase client
// from ../configs/database.
//
// Make sure that database.js is configured with:
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY
//
// NEVER expose SUPABASE_SERVICE_KEY to the frontend.
// ==========================================


// ==========================================
// GET: LIST ALL STORAGE BUCKETS
// ==========================================

router.get('/buckets', authorized, allowDynamicAdmin, async (req, res, next) => {
  try {
    // Prevent browser/proxy caching.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    console.log('[Storage] Loading Supabase storage buckets...');

    // Check server configuration without exposing the actual secret.
    if (!process.env.SUPABASE_URL) {
      console.error('[Storage] SUPABASE_URL is not configured.');

      return res.status(500).json({
        success: false,
        error: 'Supabase URL is not configured on the backend.'
      });
    }

    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('[Storage] SUPABASE_SERVICE_KEY is not configured.');

      return res.status(500).json({
        success: false,
        error: 'Supabase service key is not configured on the backend.'
      });
    }

    const { data, error } = await withTimeout(
      supabase.storage.listBuckets(),
      10000
    );

    // ------------------------------------------
    // SUPABASE ERROR
    // ------------------------------------------

    if (error) {
      console.error('[Storage] Supabase listBuckets error:', {
        message: getErrorMessage(error),
        status: error.status || null,
        name: error.name || null
      });

      return res.status(502).json({
        success: false,
        error: 'Failed to retrieve storage buckets from Supabase.',
        details: getErrorMessage(error)
      });
    }

    // ------------------------------------------
    // NORMALIZE RESULT
    // ------------------------------------------

    const buckets = Array.isArray(data) ? data : [];

    console.log(
      `[Storage] Successfully loaded ${buckets.length} bucket(s):`,
      buckets.map(bucket => bucket.name)
    );

    // ------------------------------------------
    // SUCCESS
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      buckets
    });

  } catch (error) {
    console.error('[Storage] Unexpected error while loading buckets:', {
      message: error.message,
      stack: error.stack
    });

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
// Query:
//   ?prefix=some/folder
//
// Returns only one level deep.
// ==========================================

router.get('/buckets/:bucketId/list', authorized, allowDynamicAdmin, async (req, res, next) => {
  try {
    const { bucketId } = req.params;
    const prefix = req.query.prefix || '';

    if (!bucketId) {
      return res.status(400).json({
        success: false,
        error: 'Bucket ID is required.'
      });
    }

    console.log(
      `[Storage] Listing bucket "${bucketId}" with prefix "${prefix}"`
    );

    const { data, error } = await withTimeout(
      supabase.storage.from(bucketId).list(prefix, {
        limit: 1000,
        sortBy: {
          column: 'name',
          order: 'asc'
        }
      }),
      10000
    );

    if (error) {
      console.error('[Storage] Supabase list error:', {
        bucket: bucketId,
        prefix,
        message: getErrorMessage(error),
        status: error.status || null
      });

      return res.status(502).json({
        success: false,
        error: 'Failed to list objects from Supabase Storage.',
        details: getErrorMessage(error)
      });
    }

    const items = (data || [])
      // Supabase creates this placeholder for an otherwise-empty folder.
      .filter(
        item => item.name !== '.emptyFolderPlaceholder'
      )
      .map(item => {
        // Supabase uses id === null for virtual folders.
        const isFolder = item.id === null;

        return {
          name: item.name,
          path: prefix
            ? `${prefix}/${item.name}`
            : item.name,
          type: isFolder ? 'folder' : 'file',
          size: item.metadata?.size ?? null,
          updated_at:
            item.updated_at ||
            item.created_at ||
            null,
          mime_type:
            item.metadata?.mimetype ||
            null
        };
      });

    console.log(
      `[Storage] Returned ${items.length} item(s) from "${bucketId}/${prefix}"`
    );

    return res.status(200).json({
      success: true,
      items,
      prefix
    });

  } catch (error) {
    console.error('[Storage] Unexpected list error:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Unexpected error while listing storage objects.',
      details: error.message
    });
  }
});


// ==========================================
// HELPER:
// RECURSIVELY COLLECT FILE PATHS
// ==========================================
//
// Supabase Storage does not have real folders.
// Folders are represented by object path prefixes.
//
// Example:
//
// documents/
//   2026/
//     report.pdf
//
// To delete "documents", we must first collect:
//
// documents/2026/report.pdf
// ==========================================

async function collectFilePaths(bucketId, prefix) {
  const { data, error } = await withTimeout(
    supabase.storage.from(bucketId).list(prefix, {
      limit: 1000
    }),
    10000
  );

  if (error) {
    throw error;
  }

  let paths = [];

  for (const item of data || []) {
    // Ignore Supabase's empty-folder placeholder.
    if (item.name === '.emptyFolderPlaceholder') {
      continue;
    }

    const itemPath = prefix
      ? `${prefix}/${item.name}`
      : item.name;

    // Virtual folder.
    if (item.id === null) {
      const nestedPaths = await collectFilePaths(
        bucketId,
        itemPath
      );

      paths = paths.concat(nestedPaths);
    } else {
      // Real file.
      paths.push(itemPath);
    }
  }

  return paths;
}


// ==========================================
// DELETE: REMOVE SPECIFIC FILES
// ==========================================
// Body:
//
// {
//   "paths": [
//     "folder/file1.jpg",
//     "folder/file2.jpg"
//   ]
// }
// ==========================================

router.delete('/buckets/:bucketId/objects', authorized, allowDynamicAdmin, async (req, res, next) => {
  try {
    const { bucketId } = req.params;
    const { paths } = req.body;

    if (!bucketId) {
      return res.status(400).json({
        success: false,
        error: 'Bucket ID is required.'
      });
    }

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'paths must be a non-empty array.'
      });
    }

    // Remove invalid values.
    const validPaths = paths.filter(
      path => typeof path === 'string' && path.trim().length > 0
    );

    if (validPaths.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid file paths were provided.'
      });
    }

    console.log(
      `[Storage] Deleting ${validPaths.length} object(s) from "${bucketId}"`
    );

    const { data, error } = await withTimeout(
      supabase.storage
        .from(bucketId)
        .remove(validPaths),
      15000
    );

    if (error) {
      console.error('[Storage] Supabase delete objects error:', {
        bucket: bucketId,
        paths: validPaths,
        message: getErrorMessage(error),
        status: error.status || null
      });

      return res.status(502).json({
        success: false,
        error: 'Failed to delete storage objects.',
        details: getErrorMessage(error)
      });
    }

    console.log(
      `[Storage] Successfully deleted ${validPaths.length} object(s)`
    );

    return res.status(200).json({
      success: true,
      message: 'Objects deleted successfully.',
      deleted: data || [],
      deletedCount: validPaths.length
    });

  } catch (error) {
    console.error('[Storage] Unexpected delete error:', {
      message: error.message,
      stack: error.stack
    });

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
// Body:
//
// {
//   "prefix": "some/folder"
// }
// ==========================================

router.delete('/buckets/:bucketId/folder', authorized, allowDynamicAdmin, async (req, res, next) => {
  try {
    const { bucketId } = req.params;
    const { prefix } = req.body;

    if (!bucketId) {
      return res.status(400).json({
        success: false,
        error: 'Bucket ID is required.'
      });
    }

    if (
      typeof prefix !== 'string' ||
      !prefix.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: 'prefix is required.'
      });
    }

    const cleanPrefix = prefix.trim();

    console.log(
      `[Storage] Collecting files for folder deletion: "${bucketId}/${cleanPrefix}"`
    );

    const allPaths = await collectFilePaths(
      bucketId,
      cleanPrefix
    );

    // Folder contains no actual files.
    if (allPaths.length === 0) {
      console.log(
        `[Storage] Folder "${cleanPrefix}" is already empty.`
      );

      return res.status(200).json({
        success: true,
        deletedCount: 0,
        message: 'Folder was already empty.'
      });
    }

    // ------------------------------------------
    // DELETE IN CHUNKS
    // ------------------------------------------

    const chunkSize = 500;
    let deletedCount = 0;

    for (
      let i = 0;
      i < allPaths.length;
      i += chunkSize
    ) {
      const chunk = allPaths.slice(
        i,
        i + chunkSize
      );

      console.log(
        `[Storage] Deleting folder chunk ${Math.floor(i / chunkSize) + 1} ` +
        `(${chunk.length} file(s))`
      );

      const { error } = await withTimeout(
        supabase.storage
          .from(bucketId)
          .remove(chunk),
        15000
      );

      if (error) {
        console.error(
          '[Storage] Supabase delete folder error:',
          {
            bucket: bucketId,
            prefix: cleanPrefix,
            message: getErrorMessage(error),
            status: error.status || null
          }
        );

        return res.status(502).json({
          success: false,
          error: 'Failed to delete folder contents.',
          details: getErrorMessage(error),
          deletedCount
        });
      }

      deletedCount += chunk.length;
    }

    console.log(
      `[Storage] Successfully deleted folder "${cleanPrefix}" ` +
      `(${deletedCount} file(s))`
    );

    return res.status(200).json({
      success: true,
      message: 'Folder deleted successfully.',
      deletedCount
    });

  } catch (error) {
    console.error('[Storage] Unexpected folder deletion error:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Unexpected error while deleting folder.',
      details: error.message
    });
  }
});


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;