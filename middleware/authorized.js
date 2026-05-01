// C:\Users\HP\MediTrack\middleware\authorized.js
const { auth } = require('../configs/firebase-admin');

const authorized = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token using Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(token);
    
    // Attach the decoded user object (uid, role, email) to the request
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('>>> Firebase JWT Verification Failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { authorized };