// C:\Users\HP\MediTrack\features\user\user.controller.js

const userService = require('./user.service');

// ============================================================
// HELPERS
// ============================================================

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

  return fullName || req.user?.email || 'System User';
};

const resolveUserName = (user = {}) => {
  return [
    user?.firstName || user?.first_name,
    user?.middleName || user?.middle_name,
    user?.lastName || user?.last_name,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(' ');
};

const resolveUserId = (result, fallback = null) => {
  return (
    result?.uid ||
    result?.id ||
    result?.user?.uid ||
    result?.user?.id ||
    result?.data?.uid ||
    result?.data?.id ||
    fallback
  );
};

const resolveArchiveId = (result) => {
  return (
    result?.archiveId ||
    result?.archive_id ||
    result?.archive?.id ||
    result?.archivedItem?.id ||
    null
  );
};

const setAuditIdentity = (res, user = {}) => {
  const userName = resolveUserName(user);

  res.locals.userId =
    user?.uid ||
    user?.id ||
    res.locals.userId ||
    null;

  res.locals.userEmail =
    user?.email ||
    res.locals.userEmail ||
    null;

  res.locals.userName =
    userName ||
    res.locals.userName ||
    '';

  res.locals.firstName =
    user?.firstName ||
    user?.first_name ||
    res.locals.firstName ||
    null;

  res.locals.middleName =
    user?.middleName ||
    user?.middle_name ||
    res.locals.middleName ||
    null;

  res.locals.lastName =
    user?.lastName ||
    user?.last_name ||
    res.locals.lastName ||
    null;
};

const setAuditData = (res, description, details = {}) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

// ============================================================
// REGISTER
// ============================================================

const register = async (req, res, next) => {
  try {
    console.log('>>> Registering User:', req.body.email);

    const result = await userService.registerUser(
      req.body,
      req.file
    );

    setAuditIdentity(res, result);

    const userId = resolveUserId(result);
    const userName =
      resolveUserName(result) ||
      req.body?.email ||
      'New user';

    setAuditData(
      res,
      userId
        ? `Registered user ${userName} with UID ${userId}.`
        : `Registered user ${userName}.`,
      {
        operation: 'register_user',
        userId,
        email:
          result?.email ||
          req.body?.email ||
          null,
        userName,
        universityId:
          result?.universityId ||
          result?.university_id ||
          req.body?.universityId ||
          req.body?.university_id ||
          null,
        role:
          result?.role ||
          req.body?.role ||
          'student',
        hasUploadedId: Boolean(req.file),
        uploadedFile: req.file
          ? {
              originalName: req.file.originalname,
              mimeType: req.file.mimetype,
              size: req.file.size,
            }
          : null,
      }
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// LOGIN
// ============================================================

const login = async (req, res, next) => {
  try {
    const result = await userService.loginUser(req.body);

    setAuditIdentity(res, result);

    const userId = resolveUserId(result);
    const userName =
      resolveUserName(result) ||
      result?.email ||
      req.body?.email ||
      'User';

    setAuditData(
      res,
      `User ${userName} logged in successfully.`,
      {
        operation: 'login',
        userId,
        email:
          result?.email ||
          req.body?.email ||
          null,
        userName,
        role:
          result?.role ||
          null,
      }
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET PROFILE
// ============================================================

const getProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User UID not found in token.',
      });
    }

    const user = await userService.getProfile(uid);

    setAuditIdentity(res, {
      ...user,
      uid,
      email: user?.email || req.user?.email,
    });

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SETUP PROFILE
// ============================================================

const setupProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;

    console.log(
      '>>> Attempting profile setup for UID:',
      uid
    );

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User UID not found in token.',
      });
    }

    const result = await userService.setupProfile(
      uid,
      req.body
    );

    setAuditData(
      res,
      `Completed profile setup for user ${uid}.`,
      {
        operation: 'setup_profile',
        userId: uid,
        updatedFields: Object.keys(req.body || {}),
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CHECK PROFILE SETUP
// ============================================================

const checkProfileSetup = async (req, res, next) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User UID not found in token.',
      });
    }

    const user = await userService.getProfile(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      isProfileSetup: user.isProfileSetup || false,
      profileComplete: user.profileComplete || false,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// TOGGLE PROFILE COMPLETE
// ============================================================

const toggleProfileComplete = async (
  req,
  res,
  next
) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User UID not found in token.',
      });
    }

    const { profileComplete } = req.body;

    if (typeof profileComplete !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'profileComplete must be a boolean.',
      });
    }

    const result =
      await userService.toggleProfileComplete(
        uid,
        profileComplete
      );

    setAuditData(
      res,
      `Set profile completion status for user ${uid} to ${Boolean(
        result?.profileComplete
      )}.`,
      {
        operation: 'toggle_profile_complete',
        userId: uid,
        profileComplete:
          Boolean(result?.profileComplete),
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      profileComplete: result.profileComplete,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CHECK UNIVERSITY ID
// ============================================================

const checkIdExists = async (req, res, next) => {
  try {
    const { universityId } = req.query;

    if (!universityId) {
      return res.status(400).json({
        success: false,
        message: 'University ID is required',
      });
    }

    const exists =
      await userService.checkUniversityId(
        universityId
      );

    return res.status(200).json({
      exists,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE OWN PROFILE
// ============================================================

const updateProfile = async (req, res, next) => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User UID not found in token.',
      });
    }

    const updates = {
      ...req.body,
    };

    delete updates.uid;
    delete updates.email;
    delete updates.role;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.academicInfoAcknowledgedVersion;
    delete updates.academic_info_acknowledged_version;

    console.log(
      '[updateProfile controller] uid:',
      uid
    );

    console.log(
      '[updateProfile controller] updates:',
      JSON.stringify(updates)
    );

    const updated = await userService.updateProfile(
      uid,
      updates
    );

    setAuditData(
      res,
      `Updated profile for user ${uid}.`,
      {
        operation: 'update_profile',
        userId: uid,
        updatedFields: Object.keys(updates),
        updatedBy: resolveActorName(req),
      }
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error(
      '[updateProfile controller] Error:',
      error
    );

    next(error);
  }
};

// ============================================================
// DELETE / ARCHIVE USER
// ============================================================

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const deletedBy = {
      id:
        req.user?.uid ||
        req.user?.id ||
        null,
      email:
        req.user?.email ||
        null,
      name: resolveActorName(req),
    };

    const result = await userService.deleteUser(
      userId,
      deletedBy.name
    );

    const archivedUserId = resolveUserId(
      result,
      userId
    );

    const archiveId = resolveArchiveId(result);

    const archivedUserName =
      resolveUserName(result) ||
      result?.userName ||
      result?.name ||
      null;

    setAuditData(
      res,
      archivedUserName
        ? `Archived user ${archivedUserName} with UID ${archivedUserId}.`
        : `Archived user with UID ${archivedUserId}.`,
      {
        operation: 'archive_user',
        userId: archivedUserId,
        userName: archivedUserName,
        archiveId,
        tableName: 'users',
        archivedBy: deletedBy,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'User moved to archives',
      data:
        result || {
          id: archivedUserId,
          archiveId,
        },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ADMIN UPDATE USER
// ============================================================

const adminUpdateUser = async (
  req,
  res,
  next
) => {
  try {
    const {
      targetUid,
      ...updates
    } = req.body;

    if (!targetUid) {
      return res.status(400).json({
        success: false,
        message: 'Target user UID is required',
      });
    }

    // Prevent modification of immutable/system-controlled fields.
    delete updates.uid;
    delete updates.id;
    delete updates.createdAt;
    delete updates.created_at;
    delete updates.updatedAt;
    delete updates.updated_at;

    const result =
      await userService.adminUpdateUser(
        targetUid,
        updates
      );

    const targetName =
      resolveUserName(result) ||
      result?.email ||
      targetUid;

    setAuditData(
      res,
      `Administrator updated user ${targetName} with UID ${targetUid}.`,
      {
        operation: 'admin_update_user',
        targetUserId: targetUid,
        targetUserName:
          resolveUserName(result) || null,
        targetEmail:
          result?.email ||
          null,
        updatedFields: Object.keys(updates),
        updatedBy: {
          id:
            req.user?.uid ||
            req.user?.id ||
            null,
          email:
            req.user?.email ||
            null,
          name: resolveActorName(req),
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  register,
  login,
  getProfile,
  setupProfile,
  checkProfileSetup,
  checkIdExists,
  updateProfile,
  deleteUser,
  toggleProfileComplete,
  adminUpdateUser,
};