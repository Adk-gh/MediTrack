const jwt = require("jsonwebtoken");

const authorized = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // VERIFY using your local JWT_SECRET
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error(">>> JWT Verification Failed:", err.message);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }

      // Attach decoded user (uid, role, email) to the request
      req.user = decoded; 
      next();
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { authorized };