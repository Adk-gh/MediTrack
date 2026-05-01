// C:\Users\HP\MediTrack\controllers\auth.controller.js
const axios = require('axios');
const FormData = require('form-data');
const { db, auth } = require('../configs/firebase-admin');

/**
 * REGISTER: Handles University ID OCR verification and account creation
 */
exports.register = async (req, res) => {
    try {
        const { firstName, lastName, middleInitial, suffix, email, password, universityId } = req.body;
        const idFile = req.file;

        if (!idFile) {
            return res.status(400).json({ success: false, message: "Please upload your University ID image." });
        }
        if (!firstName || !lastName || !email || !password || !universityId) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        console.log(`>>> Processing registration for: ${email}`);

        // 1. OCR VERIFICATION
        const ocrForm = new FormData();
        ocrForm.append('image', idFile.buffer, {
            filename: idFile.originalname,
            contentType: idFile.mimetype,
        });

        let ocrResponse;
        try {
            ocrResponse = await axios.post('http://localhost:5001/ocr', ocrForm, {
                headers: { ...ocrForm.getHeaders() }
            });
        } catch (ocrErr) {
            console.error('OCR service error:', ocrErr.message);
            return res.status(502).json({ success: false, message: 'ID verification service is unavailable.' });
        }

        const ocrData = ocrResponse.data;
        if (!ocrData.success) {
            return res.status(400).json({ success: false, message: ocrData.error || "OCR Failed to process the image." });
        }

        const { parsed, raw_text } = ocrData;
        let ocrId = parsed?.id_number || null;
        const normalize = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
        const normalizedInputId = normalize(universityId);

        if (!ocrId && raw_text) {
            const normalizedRawText = normalize(raw_text);
            if (normalizedRawText.includes(normalizedInputId)) {
                ocrId = universityId; 
            } else {
                const match = raw_text.match(/\b([A-Z0-9]{2,}[\s\-]?[0-9]{2,})\b/i);
                if (match) ocrId = match[1];
            }
        }

        if (!ocrId || normalizedInputId !== normalize(ocrId)) {
            return res.status(400).json({ 
                success: false, 
                message: `Verification Failed: ID on card (${ocrId || 'Not Found'}) does not match your input.` 
            });
        }

        // 2. DYNAMIC ROLE ASSIGNMENT
        const specificRoles = ['lecturer', 'nurse', 'doctor', 'administrator', 'admin', 'librarian', 'professor', 'instructor', 'faculty', 'staff', 'technician', 'guard', 'janitor'];
        let role = 'student'; 

        const findSpecificRole = (text) => {
            if (!text) return null;
            const lowerText = text.toLowerCase();
            return specificRoles.find(r => lowerText.includes(r));
        };

        let foundRole = findSpecificRole(parsed?.designation) || findSpecificRole(parsed?.role) || (raw_text ? findSpecificRole(raw_text) : null);

        if (foundRole) {
            role = foundRole;
        } else if (parsed?.id_type === 'Employee ID' || (raw_text && raw_text.toLowerCase().includes('employee'))) {
            role = 'employee'; 
        }

        // 3. DUPLICATE CHECK
        const duplicateCheck = await db.collection('users').where('universityId', '==', ocrId).get();
        if (!duplicateCheck.empty) {
            return res.status(400).json({ success: false, message: "This University ID is already registered." });
        }

        // 4. FIREBASE AUTH & FIRESTORE
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: `${firstName} ${lastName}`.trim(),
        });

        const userData = {
            uid: userRecord.uid,
            firstName,
            lastName,
            middleInitial: middleInitial || '',
            suffix: suffix || '',
            email: email.toLowerCase(),
            universityId: ocrId,
            isVerified: true,
            role: role,
            isProfileSetup: false, // Updated to match your choice
            createdAt: new Date().toISOString()
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        return res.status(201).json({
            success: true,
            message: "Registration successful! ID Verified.",
            data: { ...userData } // Frontend will handle login to get token
        });

    } catch (error) {
        console.error("Registration Error:", error.message);
        const msg = error.code === 'auth/email-already-exists' ? "Email already in use." : "Internal server error.";
        return res.status(500).json({ success: false, message: msg });
    }
};

/**
 * LOGIN: Verifies credentials and returns user profile with Firebase ID Token
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        // 1. Verify credentials with Firebase Auth REST API
        const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
        const signInResponse = await axios.post(signInUrl, { email, password, returnSecureToken: true });

        // idToken is the valid Firebase JWT we need
        const { localId, idToken } = signInResponse.data;

        // 2. Fetch User Profile from Firestore
        const userDoc = await db.collection('users').doc(localId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: "User profile not found." });
        }

        const userData = userDoc.data();

        // 3. Return the Firebase idToken
        return res.status(200).json({
            success: true,
            message: "Login successful!",
            data: {
                token: idToken, // This is now a real Firebase Token
                uid: localId,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                role: userData.role,
                isProfileSetup: userData.isProfileSetup || false
            }
        });

    } catch (error) {
        console.error("Login Error:", error.response?.data?.error?.message || error.message);
        const errorCode = error.response?.data?.error?.message;
        let message = (errorCode === 'EMAIL_NOT_FOUND' || errorCode === 'INVALID_PASSWORD' || errorCode === 'INVALID_LOGIN_CREDENTIALS') 
            ? "Invalid credentials." 
            : "Login failed.";
        return res.status(401).json({ success: false, message });
    }
};