const supabase = require('../configs/database');

const auditLog = (actionName, categoryType, getDescription) => {
  return (req, res, next) => {

    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.id || req.body?.userId || 'system';
          const userEmail = req.user?.email || req.body?.email || 'N/A';
          const userName = req.user?.name || req.user?.full_name || 'System User';

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