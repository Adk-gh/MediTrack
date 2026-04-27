const { auth } = require("../configs/firebase-admin");

const authorized = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if the header exists and has the right format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(">>> Auth Error: No token or wrong format");
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log(">>> Token received (first 50 chars):", token.substring(0, 50));

    // 2. Use Firebase Admin to verify the ID token
    // This handles the public keys, expiration, and RS256 algorithm for you
    console.log(">>> Verifying token with Firebase...");
    const decodedToken = await auth.verifyIdToken(token);
    console.log(">>> Token verified successfully! UID:", decodedToken.uid);
    
    // 3. Attach the decoded user data to the request object
    // Firebase ID tokens store the unique user ID in the 'uid' field
    req.user = decodedToken; 
    
    next();
  } catch (error) {
    console.error(">>> Firebase Auth Error:", error.message);
    console.error(">>> Error code:", error.code);

    // Specific error for expired tokens
    if (error.code === 'auth/id-token-expired') {
        return res.status(401).json({ success: false, message: "Token has expired. Please login again." });
    }

    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { authorized };