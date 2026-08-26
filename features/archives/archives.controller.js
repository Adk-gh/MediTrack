// features/archives/archives.controller.js

const archivesService = require('./archives.service');

// ============================================================
// HELPERS
// ============================================================

const formatTableName = (tableName = '') => {
  return String(tableName)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const resolveActorName = (req) => {
  const fullName = [
    req.user?.first_name || req.user?.firstName,
    req.user?.middle_name || req.user?.middleName,
    req.user?.last_name || req.user?.lastName,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');

  return (
    fullName ||
    req.user?.email ||
    req.body?.deletedBy ||
    'System User'
  );
};

const getAuditTarget = (req) => {
  return req.archiveAuditTarget || {};
};

const buildAuditTargetDetails = (req) => {
  const target = getAuditTarget(req);

  const details = {
    recordName: target.recordName,
    userName: target.userName,
    patientName: target.patientName,
    universityId: target.universityId,
    email: target.email,
    role: target.role,
    serviceType: target.serviceType,
    consultationType: target.consultationType,
    recordType: target.recordType,
    scheduleDate: target.scheduleDate,
    scheduleTime: target.scheduleTime,
    examDate: target.examDate,
    reason: target.reason,
    status: target.status,
    title: target.title,
    category: target.category,
    priority: target.priority,
    notificationType: target.notificationType,
    recipientId: target.recipientId,
    message: target.message,
  };

  return Object.fromEntries(
    Object.entries(details).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== ''
    )
  );
};

// ============================================================
// ARCHIVE AN ITEM
// ============================================================

exports.archiveItem = async (req, res, next) => {
  try {
    const {
      type,
      originalId,
      data,
      deletedBy,
    } = req.body;

    if (!type || !originalId || !data) {
      return res.status(400).json({
        success: false,
        message:
          'type, originalId, and data are required',
      });
    }

    const actorName =
      resolveActorName(req);

    const result =
      await archivesService.moveToArchives({
        type,
        originalId,
        data,
        deletedBy:
          deletedBy || actorName,
      });

    const readableType =
      formatTableName(type);

    const fallbackRecordName =
      data?.title ||
      data?.patient_name ||
      data?.name ||
      [
        data?.first_name,
        data?.middle_name,
        data?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      null;

    res.locals.auditDescription =
      fallbackRecordName
        ? `Archived ${readableType} item "${fallbackRecordName}" with original ID ${originalId}.`
        : `Archived ${readableType} item with original ID ${originalId}.`;

    res.locals.auditDetails = {
      operation: 'archive',
      archiveId:
        result?.id || null,
      archiveType: type,
      originalItemId: originalId,
      recordName:
        fallbackRecordName,
      deletedBy:
        deletedBy || actorName,
    };

    return res.status(200).json({
      success: true,
      message:
        'Item archived successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ALL ARCHIVES
// ============================================================

exports.getArchives = async (
  req,
  res,
  next
) => {
  try {
    const {
      type,
      search,
      page,
      limit,
    } = req.query;

    const result =
      await archivesService.getArchives({
        type,
        search,
        page:
          parseInt(page, 10) || 1,
        limit:
          parseInt(limit, 10) || 20,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ARCHIVE BY ID
// ============================================================

exports.getArchiveById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const archive =
      await archivesService.getArchiveById(
        id
      );

    return res.status(200).json({
      success: true,
      data: archive,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RESTORE FROM ARCHIVES
// ============================================================

exports.restoreFromArchives = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { table } = req.query;

    if (!table) {
      return res.status(400).json({
        success: false,
        message:
          'Table name is required',
      });
    }

    const result =
      await archivesService.restoreFromArchives(
        id,
        table
      );

    const resolvedTableName =
      result?.tableName || table;

    const restoredItemId =
      result?.id || id;

    const readableTableName =
      formatTableName(
        resolvedTableName
      );

    const target =
      getAuditTarget(req);

    const recordName =
      target.recordName || null;

    res.locals.auditDescription =
      recordName
        ? `Restored archived ${readableTableName} "${recordName}" with ID ${restoredItemId}.`
        : `Restored archived ${readableTableName} item with ID ${restoredItemId}.`;

    res.locals.auditDetails = {
      operation: 'restore',
      requestedArchiveId: id,
      restoredItemId,
      tableName:
        resolvedTableName,

      ...buildAuditTargetDetails(req),
    };

    return res.status(200).json({
      success: true,
      message:
        'Item restored successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PERMANENTLY DELETE
// ============================================================

exports.permanentDelete = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { table } = req.query;

    if (!table) {
      return res.status(400).json({
        success: false,
        message:
          'Table name is required',
      });
    }

    const result =
      await archivesService.permanentDelete(
        id,
        table
      );

    const resolvedTableName =
      result?.tableName || table;

    const resolvedItemId =
      result?.id || id;

    const readableTableName =
      formatTableName(
        resolvedTableName
      );

    const target =
      getAuditTarget(req);

    const recordName =
      target.recordName || null;

    res.locals.auditDescription =
      recordName
        ? `Permanently deleted archived ${readableTableName} "${recordName}" with ID ${resolvedItemId}.`
        : `Permanently deleted archived ${readableTableName} item with ID ${resolvedItemId}.`;

    res.locals.auditDetails = {
      operation:
        'permanent_delete',

      requestedArchiveId: id,

      originalItemId:
        resolvedItemId,

      tableName:
        resolvedTableName,

      ...buildAuditTargetDetails(req),
    };

    return res.status(200).json({
      success: true,
      message:
        'Item permanently deleted',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CLEANUP OLD ARCHIVES
// ============================================================

exports.cleanupOldArchives = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await archivesService.cleanupOldArchives();

    const deletedCount =
      result?.deleted || 0;

    res.locals.auditDescription =
      `Deleted ${deletedCount} expired archive item${
        deletedCount === 1
          ? ''
          : 's'
      }.`;

    res.locals.auditDetails = {
      operation:
        'cleanup_old_archives',
      deletedCount,
    };

    return res.status(200).json({
      success: true,
      message:
        `Deleted ${deletedCount} old archives`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ARCHIVE STATISTICS
// ============================================================

exports.getArchiveStats = async (
  req,
  res,
  next
) => {
  try {
    const stats =
      await archivesService.getArchiveStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// INTERNAL ARCHIVE HELPER
// ============================================================

exports.moveToArchives = async ({
  type,
  originalId,
  data,
  deletedBy,
}) => {
  return archivesService.moveToArchives({
    type,
    originalId,
    data,
    deletedBy,
  });
};

module.exports = exports;