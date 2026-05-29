// C:\Users\HP\MediTrack\middleware\authorized.js
const supabase = require('../configs/database');

const authorized = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('>>> Supabase JWT Verification Failed:', error?.message || 'No user found');
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Attach the decoded user object to the request
    req.user = {
      uid: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'student',
    };

    next();
  } catch (error) {
    console.error('>>> Auth Middleware Error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { authorized };