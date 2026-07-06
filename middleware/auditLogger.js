const supabase = require('../configs/database');

const auditLog = (actionName, categoryType, getDescription) => {
  return (req, res, next) => {

    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Try to get user info from multiple sources:
          // 1. req.user (from authorized middleware)
          // 2. res.locals (set by controller after successful operation)
          // 3. Fallback to 'system'

          const userId = req.user?.uid || req.user?.id || req.body?.userId || res.locals?.userId || 'system';
          const userEmail = req.user?.email || req.body?.email || res.locals?.userEmail || 'N/A';

          // For name, we try multiple sources
          let nameParts = [];

          // Source 1: req.user (from authorized middleware)
          if (req.user?.first_name || req.user?.last_name) {
            nameParts = [
              req.user?.first_name,
              req.user?.middle_name,
              req.user?.last_name
            ].filter(Boolean);
          }
          // Source 2: res.locals (set by controller for public routes)
          else if (res.locals?.userName || res.locals?.firstName || res.locals?.lastName) {
            nameParts = [
              res.locals?.firstName || res.locals?.userName,
              res.locals?.middleName,
              res.locals?.lastName
            ].filter(Boolean);
          }
          // Source 3: Try to construct from email as last resort
          else if (userEmail && userEmail !== 'N/A') {
            nameParts = [userEmail.split('@')[0]];
          }

          let userName = nameParts.length > 0 ? nameParts.join(' ') : 'System User';

          const description = typeof getDescription === 'function'
            ? getDescription(req)
            : getDescription || `Successfully performed ${actionName}`;

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

          if (error) throw error;

        } catch (error) {
          console.error('❌ Audit Log Failed to Save:', error.message);
        }
      }
    });

    next();
  };
};

module.exports = { auditLog };