// C:\Users\HP\MediTrack\routes\storageRoutes.js
const express = require('express');
const supabase = require('../configs/database');

const router = express.Router();

// ==========================================
// STORAGE MANAGER ROUTES
// ==========================================
// Uses the same `supabase` client as settingsRoutes.js, which already
// uploads signatures to the "MediStorage" bucket — so it's already
// running with enough privilege (service role) to list/delete freely
// across buckets, bypassing storage RLS.

// GET: List every bucket in the project
router.get('/buckets', async (req, res, next) => {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Supabase listBuckets error:', error);
      return res.status(500).json({ error: 'Failed to list buckets' });
    }

    res.status(200).json({ buckets: data });
  } catch (error) {
    next(error);
  }
});

// GET: List folders/files one level deep at a given path inside a bucket
// Query: ?prefix=some/folder
router.get('/buckets/:bucketId/list', async (req, res, next) => {
  try {
    const { bucketId } = req.params;
    const prefix = req.query.prefix || '';

    const { data, error } = await supabase.storage.from(bucketId).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (error) {
      console.error('Supabase list error:', error);
      return res.status(500).json({ error: 'Failed to list objects' });
    }

    const items = (data || [])
      // Supabase creates this placeholder to represent an otherwise-empty folder
      .filter((item) => item.name !== '.emptyFolderPlaceholder')
      .map((item) => {
        const isFolder = item.id === null; // Supabase's convention for "virtual" folders
        return {
          name: item.name,
          path: prefix ? `${prefix}/${item.name}` : item.name,
          type: isFolder ? 'folder' : 'file',
          size: item.metadata?.size ?? null,
          updated_at: item.updated_at || item.created_at || null,
          mime_type: item.metadata?.mimetype || null
        };
      });

    res.status(200).json({ items, prefix });
  } catch (error) {
    next(error);
  }
});

// Helper: recursively collect every real file path under a prefix.
// Supabase Storage has no real "folders" — a folder is just a shared
// prefix — so deleting one means walking it and collecting every leaf
// file path first.
async function collectFilePaths(bucketId, prefix) {
  const { data, error } = await supabase.storage.from(bucketId).list(prefix, { limit: 1000 });
  if (error) throw error;

  let paths = [];
  for (const item of data || []) {
    if (item.name === '.emptyFolderPlaceholder') continue;
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      const nested = await collectFilePaths(bucketId, itemPath);
      paths = paths.concat(nested);
    } else {
      paths.push(itemPath);
    }
  }
  return paths;
}

// DELETE: Remove one or more specific files
// Body: { paths: string[] }
router.delete('/buckets/:bucketId/objects', async (req, res, next) => {
  try {
    const { bucketId } = req.params;
    const { paths } = req.body;

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'paths must be a non-empty array' });
    }

    const { data, error } = await supabase.storage.from(bucketId).remove(paths);

    if (error) {
      console.error('Supabase delete objects error:', error);
      return res.status(500).json({ error: 'Failed to delete objects' });
    }

    res.status(200).json({ message: 'Objects deleted successfully', deleted: data });
  } catch (error) {
    next(error);
  }
});

// DELETE: Recursively remove every file under a folder prefix
// Body: { prefix: string }
router.delete('/buckets/:bucketId/folder', async (req, res, next) => {
  try {
    const { bucketId } = req.params;
    const { prefix } = req.body;

    if (!prefix) {
      return res.status(400).json({ error: 'prefix is required' });
    }

    const allPaths = await collectFilePaths(bucketId, prefix);

    if (allPaths.length === 0) {
      return res.status(200).json({ deletedCount: 0, message: 'Folder was already empty' });
    }

    // Chunk deletes to stay well under any request-size limits
    const chunkSize = 500;
    let deletedCount = 0;
    for (let i = 0; i < allPaths.length; i += chunkSize) {
      const chunk = allPaths.slice(i, i + chunkSize);
      const { error } = await supabase.storage.from(bucketId).remove(chunk);
      if (error) {
        console.error('Supabase delete folder error:', error);
        return res.status(500).json({ error: 'Failed to delete folder' });
      }
      deletedCount += chunk.length;
    }

    res.status(200).json({ message: 'Folder deleted successfully', deletedCount });
  } catch (error) {
    next(error);
  }
});

module.exports = router;