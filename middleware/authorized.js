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

    // Fetch user profile from users table to get full name info
    let userProfile = null;
    try {
      const { data, error: profileError } = await supabase
        .from('users')
        .select('first_name, middle_name, last_name, role')
        .eq('uid', user.id)
        .single();
      if (!profileError && data) {
        userProfile = data;
      }
    } catch (profileFetchError) {
      console.error('>>> Failed to fetch user profile:', profileFetchError.message);
    }

    // Use user_metadata from Supabase Auth as fallback (has firstName, lastName from registration)
    const metadata = user.user_metadata || {};

    // Attach the decoded user object to the request with profile data
    // Priority: 1) users table profile, 2) Supabase user_metadata
    req.user = {
      uid: user.id,
      email: user.email,
      role: userProfile?.role || metadata?.role || user.user_metadata?.role || 'student',
      first_name: userProfile?.first_name || metadata?.firstName || '',
      middle_name: userProfile?.middle_name || metadata?.middleName || '',
      last_name: userProfile?.last_name || metadata?.lastName || '',
    };

    next();
  } catch (error) {
    console.error('>>> Auth Middleware Error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { authorized };