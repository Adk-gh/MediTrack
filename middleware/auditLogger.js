// C:\Users\HP\MediTrack\middleware\auditLogger.js

const supabase = require('../configs/database');

const removeSensitiveFields = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(removeSensitiveFields);
  }

  const sensitiveFields = new Set([
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
  ]);

  return Object.entries(value).reduce((result, [key, fieldValue]) => {
    if (!sensitiveFields.has(key)) {
      result[key] = removeSensitiveFields(fieldValue);
    }

    return result;
  }, {});
};

const normalizeValue = (value, fallback) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return fallback;
  }

  return value;
};

const resolveUserName = (req, res, userEmail) => {
  const explicitName =
    res.locals?.auditUserName ||
    req.loginUserDetails ||
    req.userDetails;

  if (explicitName) {
    return String(explicitName).trim();
  }

  const firstName =
    req.user?.first_name ||
    req.user?.firstName ||
    res.locals?.firstName;

  const middleName =
    req.user?.middle_name ||
    req.user?.middleName ||
    res.locals?.middleName;

  const lastName =
    req.user?.last_name ||
    req.user?.lastName ||
    res.locals?.lastName;

  const fullName = [firstName, middleName, lastName]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ');

  if (fullName) {
    return fullName;
  }

  if (res.locals?.userName) {
    return String(res.locals.userName).trim();
  }

  if (userEmail && userEmail !== 'N/A') {
    return userEmail.split('@')[0];
  }

  return 'System User';
};

/**
 * Creates an audit-log middleware.
 *
 * getDescription may be:
 * - a string
 * - a function receiving (req, res)
 *
 * The route/controller may also set:
 * - res.locals.auditDescription
 * - res.locals.auditDetails
 * - res.locals.auditUserId
 * - res.locals.auditUserEmail
 * - res.locals.auditUserName
 */
const auditLog = (actionName, categoryType, getDescription) => {
  return (req, res, next) => {
    // Capture the JSON response so it can optionally be included in details.
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      res.locals.auditResponse = body;
      return originalJson(body);
    };

    res.once('finish', async () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      try {
        const userId = normalizeValue(
          res.locals?.auditUserId ||
            req.user?.uid ||
            req.user?.id ||
            req.body?.userId ||
            res.locals?.userId,
          'system'
        );

        const userEmail = normalizeValue(
          res.locals?.auditUserEmail ||
            req.user?.email ||
            req.body?.email ||
            res.locals?.userEmail,
          'N/A'
        );

        const userName = normalizeValue(
          resolveUserName(req, res, userEmail),
          'System User'
        );

        let generatedDescription = null;

        if (typeof getDescription === 'function') {
          try {
            generatedDescription = await getDescription(req, res);
          } catch (descriptionError) {
            console.error(
              '[AuditLog] Failed to generate description:',
              descriptionError.message
            );
          }
        } else if (typeof getDescription === 'string') {
          generatedDescription = getDescription;
        }

        const description = normalizeValue(
          res.locals?.auditDescription || generatedDescription,
          `Successfully performed ${actionName}`
        );

        const requestBody = removeSensitiveFields(req.body || {});

        const customDetails =
          res.locals?.auditDetails &&
          typeof res.locals.auditDetails === 'object'
            ? removeSensitiveFields(res.locals.auditDetails)
            : {};

        const responseData =
          res.locals?.auditResponse &&
          typeof res.locals.auditResponse === 'object'
            ? removeSensitiveFields(res.locals.auditResponse)
            : null;

        const details = JSON.stringify({
          method: req.method,
          path: req.originalUrl,
          params: removeSensitiveFields(req.params || {}),
          query: removeSensitiveFields(req.query || {}),
          data: requestBody,
          ...customDetails,
          response: responseData,
          statusCode: res.statusCode,
        });

        const { error } = await supabase
          .from('audit_logs')
          .insert([
            {
              userId: String(userId),
              userEmail: String(userEmail),
              userName: String(userName),
              action: normalizeValue(actionName, 'Unknown Action'),
              type: normalizeValue(categoryType, 'SYSTEM'),
              description: String(description),
              details,
            },
          ]);

        if (error) {
          console.error('[AuditLog] Insert error:', error.message);
        }
      } catch (error) {
        console.error('[AuditLog] Failed to save:', error.message);
      }
    });

    next();
  };
};

module.exports = { auditLog };