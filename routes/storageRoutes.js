// C:\Users\HP\MediTrack\routes\storageRoutes.js

const express = require('express');
const multer = require('multer');
const supabase = require('../configs/database');

const { authorized } = require('../middleware/authorized');
const {
  getSystemConfig,
} = require('../services/systemConfig.service');

const router = express.Router();

console.log('[StorageRoutes] storageRoutes.js loaded');

// ============================================================
// CONFIGURATION
// ============================================================

const PUBLIC_ASSETS_BUCKET = 'public-assets';
const BRANDING_PREFIX = 'branding';
const ACTIVE_LOGO_META_PATH = 'branding/.active-logo.json';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_UPLOAD = 10;

const BRANDING_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'avif',
]);

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_UPLOAD,
  },
});

// ============================================================
// PATH HELPERS
// ============================================================

const sanitizeStoragePath = (value = '') => {
  return String(value)
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        part !== '.' &&
        part !== '..'
    )
    .join('/');
};

const sanitizeFileName = (value = '') => {
  const cleaned = String(value)
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      '_'
    )
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || `upload-${Date.now()}`;
};

const getFileExtension = (filePath = '') => {
  const fileName =
    String(filePath)
      .split('/')
      .pop() || '';

  const parts = fileName
    .toLowerCase()
    .split('.');

  return parts.length > 1
    ? parts.pop()
    : '';
};

const isBrandingImage = (filePath = '') => {
  return BRANDING_IMAGE_EXTENSIONS.has(
    getFileExtension(filePath)
  );
};

const isValidBrandingPath = (filePath = '') => {
  const cleanPath =
    sanitizeStoragePath(filePath);

  return (
    cleanPath.startsWith(
      `${BRANDING_PREFIX}/`
    ) &&
    cleanPath !== ACTIVE_LOGO_META_PATH &&
    isBrandingImage(cleanPath)
  );
};

// ============================================================
// GENERAL HELPERS
// ============================================================

const withTimeout = (
  promise,
  milliseconds = 10000
) => {
  return Promise.race([
    promise,

    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Supabase request timed out after ${milliseconds}ms`
          )
        );
      }, milliseconds);
    }),
  ]);
};

const getErrorMessage = (error) => {
  if (!error) {
    return 'Unknown error';
  }

  return (
    error.message ||
    error.error_description ||
    error.details ||
    error.hint ||
    'Unknown Supabase error'
  );
};

const getPublicStorageUrl = (
  bucket,
  filePath
) => {
  const baseUrl = String(
    process.env.SUPABASE_URL || ''
  ).replace(/\/$/, '');

  const encodedPath = String(filePath)
    .split('/')
    .map((part) =>
      encodeURIComponent(part)
    )
    .join('/');

  return (
    `${baseUrl}/storage/v1/object/public/` +
    `${encodeURIComponent(bucket)}/` +
    encodedPath
  );
};

// ============================================================
// DYNAMIC ADMIN MIDDLEWARE
// ============================================================

const allowDynamicAdmin = async (
  req,
  res,
  next
) => {
  try {
    const userRole =
      req.user?.role?.toLowerCase();

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. No role found.',
      });
    }

    const config =
      await getSystemConfig();

    const adminRoles = (
      config.admin_roles || []
    ).map((role) =>
      String(role)
        .trim()
        .toLowerCase()
    );

    const allowedRoles = [
      ...adminRoles,
      'sysadmin',
      'doctor',
      'dentist',
      'nurse',
    ];

    if (
      allowedRoles.includes(
        userRole
      )
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        'Access denied. Admin privileges required.',
    });
  } catch (error) {
    console.error(
      '[Storage] Admin role verification failed:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error during role validation.',
    });
  }
};

// ============================================================
// BRANDING HELPERS
// ============================================================

const readActiveLogoMetadata = async () => {
  try {
    const {
      data,
      error,
    } = await withTimeout(
      supabase.storage
        .from(PUBLIC_ASSETS_BUCKET)
        .download(
          ACTIVE_LOGO_META_PATH
        ),
      10000
    );

    if (error || !data) {
      return null;
    }

    const metadataText =
      await data.text();

    const parsed =
      JSON.parse(metadataText);

    if (
      !parsed?.path ||
      !isValidBrandingPath(
        parsed.path
      )
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn(
      '[Branding] Active logo metadata unavailable:',
      getErrorMessage(error)
    );

    return null;
  }
};

const listBrandingFiles = async () => {
  console.log(
    '[Branding Debug] Supabase URL:',
    process.env.SUPABASE_URL
  );

  console.log(
    '[Branding Debug] Bucket:',
    PUBLIC_ASSETS_BUCKET
  );

  console.log(
    '[Branding Debug] Prefix:',
    BRANDING_PREFIX
  );

  const { data, error } = await withTimeout(
    supabase.storage
      .from(PUBLIC_ASSETS_BUCKET)
      .list(BRANDING_PREFIX, {
        limit: 1000,
        sortBy: {
          column: 'updated_at',
          order: 'desc',
        },
      }),
    10000
  );

  console.log(
    '[Branding Debug] Files returned:',
    data
  );

  console.log(
    '[Branding Debug] Storage error:',
    error
  );

  if (error) {
    throw error;
  }

  return data || [];
};

const brandingFileExists = async (
  filePath
) => {
  const cleanPath =
    sanitizeStoragePath(filePath);

  if (
    !isValidBrandingPath(
      cleanPath
    )
  ) {
    return false;
  }

  const fileName =
    cleanPath
      .split('/')
      .pop();

  const files =
    await listBrandingFiles();

  return files.some(
    (item) =>
      item?.id !== null &&
      item?.name === fileName
  );
};

const findFallbackBrandingLogo =
  async () => {
    const files =
      await listBrandingFiles();

    const image = files
      .filter(
        (item) =>
          item?.id !== null &&
          item?.name !==
            '.active-logo.json'
      )
      .map((item) => ({
        name: item.name,

        path:
          `${BRANDING_PREFIX}/${item.name}`,

        updatedAt:
          item.updated_at ||
          item.created_at ||
          null,
      }))
      .find((item) =>
        isBrandingImage(
          item.path
        )
      );

    return image || null;
  };

// ============================================================
// GET ACTIVE BRANDING LOGO
//
// Public endpoint so login pages, headers, reports, and
// certificates can load the logo before authentication.
//
// Final URL:
// GET /api/storage/branding/logo
// ============================================================

router.get(
  '/branding/logo',
  async (req, res) => {
    try {
      res.set({
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',

        Pragma: 'no-cache',

        Expires: '0',
      });

      if (
        !process.env.SUPABASE_URL ||
        !process.env
          .SUPABASE_SERVICE_KEY
      ) {
        return res
          .status(500)
          .json({
            success: false,

            error:
              'Supabase credentials are not fully configured on the backend.',
          });
      }

      let activeLogo =
        await readActiveLogoMetadata();

      // Verify that the selected logo
      // still exists.
      if (
        activeLogo?.path
      ) {
        const exists =
          await brandingFileExists(
            activeLogo.path
          );

        if (!exists) {
          console.warn(
            `[Branding] Active logo no longer exists: ${activeLogo.path}`
          );

          activeLogo = null;
        }
      }

      // If no active logo was selected,
      // use the newest image in branding.
      if (!activeLogo) {
        activeLogo =
          await findFallbackBrandingLogo();
      }

      if (!activeLogo) {
        return res
          .status(404)
          .json({
            success: false,

            error:
              'No branding logo was found inside public-assets/branding.',
          });
      }

      const logoPath =
        activeLogo.path;

      const logoName =
        activeLogo.name ||
        logoPath
          .split('/')
          .pop();

      const basePublicUrl =
        getPublicStorageUrl(
          PUBLIC_ASSETS_BUCKET,
          logoPath
        );

      // Cache-busting parameter ensures
      // replaced logos update immediately.
      const publicUrl =
        `${basePublicUrl}?v=${Date.now()}`;

      console.log(
        `[Branding] Returning active logo: ${logoPath}`
      );

      return res.status(200).json({
        success: true,

        bucket:
          PUBLIC_ASSETS_BUCKET,

        path:
          logoPath,

        name:
          logoName,

        url:
          publicUrl,
      });
    } catch (error) {
      console.error(
        '[Branding] Failed to load active logo:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Failed to load the active branding logo.',

          details:
            getErrorMessage(error),
        });
    }
  }
);

// ============================================================
// SET ACTIVE BRANDING LOGO
//
// POST /api/storage/branding/logo
//
// Body:
// {
//   "path": "branding/example-logo.png"
// }
// ============================================================

router.post(
  '/branding/logo',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      const requestedPath =
        req.body?.path;

      if (
        !requestedPath ||
        typeof requestedPath !==
          'string'
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Branding image path is required.',
          });
      }

      const cleanPath =
        sanitizeStoragePath(
          requestedPath
        );

      if (
        !isValidBrandingPath(
          cleanPath
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Invalid branding image path. The file must be an image inside the branding folder.',
          });
      }

      const exists =
        await brandingFileExists(
          cleanPath
        );

      if (!exists) {
        return res
          .status(404)
          .json({
            success: false,

            error:
              'The selected branding image does not exist.',
          });
      }

      const fileName =
        cleanPath
          .split('/')
          .pop();

      const metadata = {
        path:
          cleanPath,

        name:
          fileName,

        updatedAt:
          new Date().toISOString(),
      };

      const metadataBuffer =
        Buffer.from(
          JSON.stringify(
            metadata,
            null,
            2
          ),
          'utf8'
        );

      const {
        error:
          metadataUploadError,
      } = await withTimeout(
        supabase.storage
          .from(
            PUBLIC_ASSETS_BUCKET
          )
          .upload(
            ACTIVE_LOGO_META_PATH,
            metadataBuffer,
            {
              contentType:
                'application/json',

              cacheControl:
                '0',

              upsert: true,
            }
          ),
        10000
      );

      if (
        metadataUploadError
      ) {
        throw metadataUploadError;
      }

      const publicUrl =
        `${getPublicStorageUrl(
          PUBLIC_ASSETS_BUCKET,
          cleanPath
        )}?v=${Date.now()}`;

      console.log(
        `[Branding] Active logo changed to: ${cleanPath}`
      );

      return res
        .status(200)
        .json({
          success: true,

          message:
            'Active branding logo updated successfully.',

          bucket:
            PUBLIC_ASSETS_BUCKET,

          path:
            cleanPath,

          name:
            fileName,

          url:
            publicUrl,
        });
    } catch (error) {
      console.error(
        '[Branding] Failed to set active logo:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Failed to set the active branding logo.',

          details:
            getErrorMessage(error),
        });
    }
  }
);

// ============================================================
// LIST ALL STORAGE BUCKETS
// ============================================================

router.get(
  '/buckets',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      res.set({
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',

        Pragma: 'no-cache',

        Expires: '0',
      });

      if (
        !process.env.SUPABASE_URL ||
        !process.env
          .SUPABASE_SERVICE_KEY
      ) {
        return res
          .status(500)
          .json({
            success: false,

            error:
              'Supabase credentials are not fully configured on the backend.',
          });
      }

      const {
        data,
        error,
      } = await withTimeout(
        supabase.storage.listBuckets(),
        10000
      );

      if (error) {
        console.error(
          '[Storage] listBuckets failed:',
          error
        );

        return res
          .status(502)
          .json({
            success: false,

            error:
              'Failed to retrieve storage buckets from Supabase.',

            details:
              getErrorMessage(error),
          });
      }

      if (!Array.isArray(data)) {
        return res
          .status(502)
          .json({
            success: false,

            error:
              'Supabase returned an invalid bucket list.',
          });
      }

      return res.status(200).json({
        success: true,

        buckets:
          data,

        count:
          data.length,
      });
    } catch (error) {
      console.error(
        '[Storage] Unexpected bucket-list error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unexpected error while loading storage buckets.',

          details:
            error.message,
        });
    }
  }
);

// ============================================================
// LIST BUCKET CONTENTS
// ============================================================

router.get(
  '/buckets/:bucketId/list',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      const {
        bucketId,
      } = req.params;

      const prefix =
        sanitizeStoragePath(
          req.query.prefix || ''
        );

      if (!bucketId) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Bucket ID is required.',
          });
      }

      const {
        data,
        error,
      } = await withTimeout(
        supabase.storage
          .from(bucketId)
          .list(prefix, {
            limit: 1000,

            sortBy: {
              column: 'name',
              order: 'asc',
            },
          }),
        10000
      );

      if (error) {
        return res
          .status(502)
          .json({
            success: false,

            error:
              'Failed to list objects from Supabase Storage.',

            details:
              getErrorMessage(error),
          });
      }

      const items = (
        data || []
      )
        .filter((item) => {
          if (
            item.name ===
            '.emptyFolderPlaceholder'
          ) {
            return false;
          }

          if (
            bucketId ===
              PUBLIC_ASSETS_BUCKET &&
            prefix ===
              BRANDING_PREFIX &&
            item.name ===
              '.active-logo.json'
          ) {
            return false;
          }

          return true;
        })
        .map((item) => {
          const isFolder =
            item.id === null;

          return {
            name:
              item.name,

            path:
              prefix
                ? `${prefix}/${item.name}`
                : item.name,

            type:
              isFolder
                ? 'folder'
                : 'file',

            size:
              item.metadata?.size ??
              null,

            updated_at:
              item.updated_at ||
              item.created_at ||
              null,

            mime_type:
              item.metadata
                ?.mimetype ||
              null,
          };
        });

      return res.status(200).json({
        success: true,

        items,

        prefix,
      });
    } catch (error) {
      console.error(
        '[Storage] List objects error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unexpected error while listing storage objects.',

          details:
            error.message,
        });
    }
  }
);

// ============================================================
// RECURSIVE FILE PATH COLLECTION
// ============================================================

const collectFilePaths = async (
  bucketId,
  prefix
) => {
  const {
    data,
    error,
  } = await withTimeout(
    supabase.storage
      .from(bucketId)
      .list(prefix, {
        limit: 1000,
      }),
    10000
  );

  if (error) {
    throw error;
  }

  let paths = [];

  for (
    const item of data || []
  ) {
    if (
      item.name ===
      '.emptyFolderPlaceholder'
    ) {
      continue;
    }

    if (
      bucketId ===
        PUBLIC_ASSETS_BUCKET &&
      item.name ===
        '.active-logo.json'
    ) {
      continue;
    }

    const itemPath =
      prefix
        ? `${prefix}/${item.name}`
        : item.name;

    if (item.id === null) {
      const nestedPaths =
        await collectFilePaths(
          bucketId,
          itemPath
        );

      paths =
        paths.concat(
          nestedPaths
        );
    } else {
      paths.push(itemPath);
    }
  }

  return paths;
};

// ============================================================
// UPLOAD FILES
// ============================================================

router.post(
  '/buckets/:bucketId/upload',
  authorized,
  allowDynamicAdmin,
  upload.array(
    'files',
    MAX_FILES_PER_UPLOAD
  ),
  async (req, res) => {
    try {
      const {
        bucketId,
      } = req.params;

      const prefix =
        sanitizeStoragePath(
          req.body?.path || ''
        );

      if (
        !bucketId ||
        !bucketId.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Bucket ID is required.',
          });
      }

      if (
        !Array.isArray(
          req.files
        ) ||
        req.files.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'At least one file is required.',
          });
      }

      const uploaded = [];
      const failed = [];

      for (
        const file of req.files
      ) {
        const safeName =
          sanitizeFileName(
            file.originalname
          );

        if (
          safeName ===
          '.active-logo.json'
        ) {
          failed.push({
            name:
              file.originalname,

            error:
              'This filename is reserved by the branding system.',
          });

          continue;
        }

        const filePath =
          prefix
            ? `${prefix}/${safeName}`
            : safeName;

        try {
          const {
            data,
            error,
          } = await withTimeout(
            supabase.storage
              .from(
                bucketId.trim()
              )
              .upload(
                filePath,
                file.buffer,
                {
                  contentType:
                    file.mimetype ||
                    'application/octet-stream',

                  cacheControl:
                    '3600',

                  upsert: true,
                }
              ),
            30000
          );

          if (error) {
            failed.push({
              name:
                file.originalname,

              path:
                filePath,

              error:
                getErrorMessage(
                  error
                ),
            });

            continue;
          }

          uploaded.push({
            name:
              file.originalname,

            path:
              data?.path ||
              filePath,

            size:
              file.size,

            mime_type:
              file.mimetype ||
              null,
          });
        } catch (error) {
          failed.push({
            name:
              file.originalname,

            path:
              filePath,

            error:
              getErrorMessage(
                error
              ),
          });
        }
      }

      if (
        uploaded.length === 0
      ) {
        return res
          .status(502)
          .json({
            success: false,

            error:
              'No files were uploaded.',

            failed,
          });
      }

      return res.status(200).json({
        success: true,

        message:
          failed.length > 0
            ? `${uploaded.length} file(s) uploaded and ${failed.length} failed.`
            : `${uploaded.length} file(s) uploaded successfully.`,

        uploaded,

        failed,

        uploadedCount:
          uploaded.length,

        failedCount:
          failed.length,
      });
    } catch (error) {
      console.error(
        '[Storage] Upload error:',
        error
      );

      if (
        error?.code ===
        'LIMIT_FILE_SIZE'
      ) {
        return res
          .status(413)
          .json({
            success: false,

            error:
              'A file exceeds the 10 MB maximum upload size.',
          });
      }

      if (
        error?.code ===
        'LIMIT_FILE_COUNT'
      ) {
        return res
          .status(413)
          .json({
            success: false,

            error:
              `You can upload a maximum of ${MAX_FILES_PER_UPLOAD} files at once.`,
          });
      }

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unexpected error while uploading files.',

          details:
            error.message,
        });
    }
  }
);

// ============================================================
// DELETE SPECIFIC FILES
// ============================================================

router.delete(
  '/buckets/:bucketId/objects',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      const {
        bucketId,
      } = req.params;

      const {
        paths,
      } = req.body;

      if (!bucketId) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Bucket ID is required.',
          });
      }

      if (
        !Array.isArray(paths) ||
        paths.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'paths must be a non-empty array.',
          });
      }

      const validPaths =
        paths
          .filter(
            (path) =>
              typeof path ===
                'string' &&
              path.trim()
          )
          .map((path) =>
            sanitizeStoragePath(
              path
            )
          )
          .filter(Boolean);

      if (
        validPaths.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'No valid file paths were provided.',
          });
      }

      if (
        validPaths.includes(
          ACTIVE_LOGO_META_PATH
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'The active-logo metadata file cannot be deleted directly.',
          });
      }

      const {
        data,
        error,
      } = await withTimeout(
        supabase.storage
          .from(bucketId)
          .remove(validPaths),
        15000
      );

      if (error) {
        return res
          .status(502)
          .json({
            success: false,

            error:
              'Failed to delete storage objects.',

            details:
              getErrorMessage(error),
          });
      }

      return res.status(200).json({
        success: true,

        message:
          'Objects deleted successfully.',

        deleted:
          data || [],

        deletedCount:
          validPaths.length,
      });
    } catch (error) {
      console.error(
        '[Storage] Delete objects error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unexpected error while deleting storage objects.',

          details:
            error.message,
        });
    }
  }
);

// ============================================================
// DELETE A FOLDER
// ============================================================

router.delete(
  '/buckets/:bucketId/folder',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      const {
        bucketId,
      } = req.params;

      const {
        prefix,
      } = req.body;

      if (
        !bucketId ||
        typeof prefix !==
          'string' ||
        !prefix.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Bucket ID and prefix are required.',
          });
      }

      const cleanPrefix =
        sanitizeStoragePath(
          prefix
        );

      if (
        bucketId ===
          PUBLIC_ASSETS_BUCKET &&
        cleanPrefix ===
          BRANDING_PREFIX
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'The branding folder cannot be deleted. Delete individual branding files instead.',
          });
      }

      const allPaths =
        await collectFilePaths(
          bucketId,
          cleanPrefix
        );

      if (
        allPaths.length === 0
      ) {
        return res.status(200).json({
          success: true,

          deletedCount: 0,

          message:
            'Folder was already empty.',
        });
      }

      const chunkSize = 500;

      let deletedCount = 0;

      for (
        let index = 0;
        index < allPaths.length;
        index += chunkSize
      ) {
        const chunk =
          allPaths.slice(
            index,
            index + chunkSize
          );

        const {
          error,
        } = await withTimeout(
          supabase.storage
            .from(bucketId)
            .remove(chunk),
          15000
        );

        if (error) {
          return res
            .status(502)
            .json({
              success: false,

              error:
                'Failed to delete folder contents.',

              details:
                getErrorMessage(
                  error
                ),

              deletedCount,
            });
        }

        deletedCount +=
          chunk.length;
      }

      return res.status(200).json({
        success: true,

        message:
          'Folder deleted successfully.',

        deletedCount,
      });
    } catch (error) {
      console.error(
        '[Storage] Delete folder error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unexpected error while deleting folder.',

          details:
            error.message,
        });
    }
  }
);

// ============================================================
// GENERATE TEMPORARY FILE VIEW URL
// ============================================================

router.get(
  '/buckets/:bucketId/view',
  authorized,
  allowDynamicAdmin,
  async (req, res) => {
    try {
      const {
        bucketId,
      } = req.params;

      const {
        path,
      } = req.query;

      if (!bucketId) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'Bucket ID is required.',
          });
      }

      if (
        !path ||
        typeof path !==
          'string' ||
        !path.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              'File path is required.',
          });
      }

      const filePath =
        sanitizeStoragePath(
          path
        );

      const {
        data,
        error,
      } = await withTimeout(
        supabase.storage
          .from(bucketId)
          .createSignedUrl(
            filePath,
            300
          ),
        10000
      );

      if (error) {
        console.error(
          '[Storage] Failed to create signed URL:',
          error
        );

        return res
          .status(502)
          .json({
            success: false,

            error:
              'Failed to generate file preview URL.',

            details:
              getErrorMessage(error),
          });
      }

      if (!data?.signedUrl) {
        return res
          .status(502)
          .json({
            success: false,

            error:
              'Supabase did not return a signed URL.',
          });
      }

      return res.status(200).json({
        success: true,

        url:
          data.signedUrl,

        expiresIn:
          300,
      });
    } catch (error) {
      console.error(
        '[Storage] View URL error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            'Unexpected error while preparing the file preview.',

          details:
            error.message,
        });
    }
  }
);

// ============================================================
// MULTER / STORAGE ERROR HANDLER
// ============================================================

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error?.code ===
      'LIMIT_FILE_SIZE'
    ) {
      return res
        .status(413)
        .json({
          success: false,

          error:
            'A file exceeds the 10 MB maximum upload size.',
        });
    }

    if (
      error?.code ===
      'LIMIT_FILE_COUNT'
    ) {
      return res
        .status(413)
        .json({
          success: false,

          error:
            `You can upload a maximum of ${MAX_FILES_PER_UPLOAD} files at once.`,
        });
    }

    if (error) {
      console.error(
        '[Storage] Route middleware error:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message ||
            'Storage request failed.',
        });
    }

    next();
  }
);

module.exports = router;