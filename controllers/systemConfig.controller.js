// C:\Users\HP\MediTrack\controllers\systemConfig.controller.js

const systemConfigService = require('../services/systemConfig.service');
const notificationsService =
  require('../features/notifications/notifications.service');

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

const resolveActorId = (req) => {
  return (
    req.user?.uid ||
    req.user?.id ||
    null
  );
};

const setAuditData = (
  res,
  description,
  details = {}
) => {
  res.locals.auditDescription = description;
  res.locals.auditDetails = details;
};

const sanitizeConfigForAudit = (config = {}) => {
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    return {};
  }

  const sanitized = {
    ...config,
  };

  delete sanitized.id;
  delete sanitized.updated_at;

  return sanitized;
};

// ============================================================
// GET SYSTEM CONFIGURATION
// ============================================================

/**
 * GET /api/system-config
 *
 * Returns the application's system configuration.
 */
const getSystemConfig = async (req, res) => {
  try {
    const config =
      await systemConfigService.getSystemConfig();

    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error(
      '[SystemConfig Controller] Error:',
      error
    );

    return res.status(
      error.statusCode ||
      error.status ||
      500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to fetch system configuration.',
    });
  }
};

// ============================================================
// UPDATE SYSTEM CONFIGURATION
// ============================================================

/**
 * PUT /api/system-config
 *
 * Updates the application's system configuration.
 */
const updateSystemConfig = async (
  req,
  res
) => {
  try {
    const configData = {
      ...(req.body || {}),
    };

    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'No configuration data provided.',
      });
    }

    // ---------------------------------------------------------
    // Never allow client-controlled system fields.
    //
    // The service handles academic_update_version.
    // ---------------------------------------------------------

    delete configData.id;
    delete configData.updated_at;
    delete configData.academic_update_version;

    // ---------------------------------------------------------
    // Validate password_rules
    // ---------------------------------------------------------

    if (
      configData.password_rules !== undefined
    ) {
      const rules =
        configData.password_rules;

      if (
        !rules ||
        typeof rules !== 'object' ||
        Array.isArray(rules)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid password rules configuration.',
        });
      }

      const {
        minLength,
        requireUppercase,
        requireLowercase,
        requireNumber,
        requireSpecialCharacter,
      } = rules;

      const parsedMinLength =
        Number(minLength);

      if (
        !Number.isInteger(parsedMinLength) ||
        parsedMinLength < 4 ||
        parsedMinLength > 128
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Password minimum length must be between 4 and 128.',
        });
      }

      const booleanFields = [
        'requireUppercase',
        'requireLowercase',
        'requireNumber',
        'requireSpecialCharacter',
      ];

      for (const field of booleanFields) {
        if (
          typeof rules[field] !== 'boolean'
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} must be true or false.`,
          });
        }
      }

      configData.password_rules = {
        minLength: parsedMinLength,
        requireUppercase,
        requireLowercase,
        requireNumber,
        requireSpecialCharacter,
      };
    }

    // ---------------------------------------------------------
    // Validate prompt_student_academic_update
    // ---------------------------------------------------------

    if (
      configData.prompt_student_academic_update !==
      undefined
    ) {
      if (
        typeof configData.prompt_student_academic_update !==
        'boolean'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'prompt_student_academic_update must be true or false.',
        });
      }
    }

    // ---------------------------------------------------------
    // Update system configuration.
    //
    // The service handles academic version changes:
    //
    // false -> true  = increment version
    // true  -> true  = keep version
    // true  -> false = keep version
    // false -> false = keep version
    // ---------------------------------------------------------
// Read the current value before updating so we can detect false -> true.
const previousConfig =
  await systemConfigService.getSystemConfig(true);

const wasAcademicPromptEnabled = Boolean(
  previousConfig?.prompt_student_academic_update
);

    const updatedConfig =
      await systemConfigService.updateSystemConfig(
        configData
      );

      const isAcademicPromptEnabled = Boolean(
  updatedConfig?.prompt_student_academic_update
);

const academicPromptWasNewlyEnabled =
  Object.prototype.hasOwnProperty.call(
    configData,
    'prompt_student_academic_update'
  ) &&
  configData.prompt_student_academic_update === true &&
  !wasAcademicPromptEnabled &&
  isAcademicPromptEnabled;

    const changedFields =
      Object.keys(configData);

    const promptChanged =
      Object.prototype.hasOwnProperty.call(
        configData,
        'prompt_student_academic_update'
      );

    const passwordRulesChanged =
      Object.prototype.hasOwnProperty.call(
        configData,
        'password_rules'
      );

      if (academicPromptWasNewlyEnabled) {
  const academicVersion = Number(
    updatedConfig?.academic_update_version || 1
  );

  try {
    await notificationsService.notifyRoles(
      ['student'],
      {
        type: 'academic_info_update',
        title: 'Academic Information Update Required',
        message:
          `Please review and update your current year level, section, ` +
          `program, and academic information. Academic update version ${academicVersion} is now active.`,
        referenceId: null,
        referenceType: 'student_profile',
      }
    );

    console.log(
      `[SystemConfig] Academic update notifications sent for version ${academicVersion}.`
    );
  } catch (notificationError) {
    console.error(
      '[SystemConfig] Failed to notify students about academic update:',
      notificationError
    );

    // The system configuration remains successfully updated even if
    // notification creation fails.
  }
}

    setAuditData(
      res,
      `Updated system configuration${
        changedFields.length
          ? `: ${changedFields.join(', ')}`
          : ''
      }.`,
      {
        operation:
          'update_system_configuration',

        changedFields,

        submittedConfig:
          sanitizeConfigForAudit(configData),

        resultingAcademicUpdateVersion:
          updatedConfig?.academic_update_version ??
          null,

        promptStudentAcademicUpdate:
          updatedConfig?.prompt_student_academic_update ??
          configData?.prompt_student_academic_update ??
          null,

        promptSettingChanged:
          promptChanged,

        passwordRulesChanged,

        updatedBy: {
          id: resolveActorId(req),
          email:
            req.user?.email || null,
          name:
            resolveActorName(req),
          role:
            req.user?.role || null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: updatedConfig,
      message:
        'System configuration updated successfully.',
    });
  } catch (error) {
    console.error(
      '[SystemConfig Controller] Error updating config:',
      error
    );

    return res.status(
      error.statusCode ||
      error.status ||
      500
    ).json({
      success: false,
      message:
        error.message ||
        'Failed to update system configuration.',
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getSystemConfig,
  updateSystemConfig,
};