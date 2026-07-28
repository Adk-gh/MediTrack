const supabase = require('../configs/database');

const auditLog = (actionName, categoryType, getDescription) => {
  return (req, res, next) => {

    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Get user info from authorized middleware
          const userId = req.user?.uid || req.user?.id || req.body?.userId || res.locals?.userId || 'system';
          const userEmail = req.user?.email || req.body?.email || res.locals?.userEmail || 'N/A';

          // Get user name - check for custom details from route handlers first
          let nameParts = [];

          // Check for custom userDetails set by route handlers (loginUserDetails, userDetails, etc)
          if (req.loginUserDetails || req.userDetails) {
            // Already a complete name string
            nameParts = [req.loginUserDetails || req.userDetails];
          } else if (req.user?.first_name || req.user?.last_name) {
            // From authorized middleware - user profile
            nameParts = [
              req.user?.first_name,
              req.user?.middle_name,
              req.user?.last_name
            ].filter(Boolean);
          } else if (res.locals?.userName || res.locals?.firstName || res.locals?.lastName) {
            // From res.locals
            nameParts = [
              res.locals?.firstName || res.locals?.userName,
              res.locals?.middleName,
              res.locals?.lastName
            ].filter(Boolean);
          } else if (userEmail && userEmail !== 'N/A') {
            // Fallback to email prefix
            nameParts = [userEmail.split('@')[0]];
          }

          const userName = nameParts.length > 0 ? nameParts.join(' ') : 'System User';

          const description = typeof getDescription === 'function'
            ? getDescription(req)
            : getDescription || `Successfully performed ${actionName}`;

          // Sanitize sensitive data
          const sanitizedBody = { ...req.body };
          delete sanitizedBody.password;
          delete sanitizedBody.confirmPassword;

          const details = JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            data: sanitizedBody
          });

          const { error } = await supabase.from('audit_logs').insert([{
            userId,
            userEmail,
            userName,
            action: actionName,
            type: categoryType,
            description,
            details
          }]);

          if (error) {
            console.error('[AuditLog] Error:', error.message);
            throw error;
          }

        } catch (error) {
          console.error('[AuditLog] Failed to save:', error.message);
        }
      }
    });

    next();
  };
};

module.exports = { auditLog };
