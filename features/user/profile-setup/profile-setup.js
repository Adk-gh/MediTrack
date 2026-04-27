const express = require('express');
const router = express.Router();
const multer = require('multer');

const { db } = require('../../../configs/firebase-admin');
const { authorized } = require('../../../middleware/authorized');

// Multer still accepted but image won't be processed until storage is set up
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * POST /api/user/profile-setup
 * Updates user profile details in Firestore (photo upload disabled until storage is configured)
 */
router.post('/', authorized, upload.single('image'), async (req, res) => {
    try {
        const uid = req.user.uid;
        const {
            firstName,
            middleInitial,
            lastName,
            phoneNumber,
            department,
            course,
            yearLevel,
            classification,
            jobTitle,
            bio,
            role
        } = req.body;

        const userRef = db.collection('users').doc(uid);

        // 🚫 Storage/bucket removed — add back once Firebase Storage is configured
        const profilePhotoUrl = null;

        // Prepare Data for Firestore - filter out empty strings
        const updateData = {
            ...(firstName && { firstName }),
            ...(middleInitial && { middleInitial }),
            ...(lastName && { lastName }),
            ...(phoneNumber && { phoneNumber }),
            ...(bio && { bio }),
            isProfileSetup: true,
            updatedAt: new Date().toISOString()
        };

        const userRole = role?.toLowerCase() || 'employee';

        if (userRole === 'student') {
            if (department) updateData.department = department;
            if (course) updateData.course = course;
            if (yearLevel) updateData.yearLevel = yearLevel;
        } else {
            if (classification) updateData.classification = classification;
            if (department) updateData.department = department;
            if (jobTitle) updateData.jobTitle = jobTitle;
        }

        // Update Firestore - use set with merge to create document if it doesn't exist
        await userRef.set(updateData, { merge: true });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            profilePhotoUrl
        });

    } catch (error) {
        console.error("Profile Setup Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

module.exports = router;