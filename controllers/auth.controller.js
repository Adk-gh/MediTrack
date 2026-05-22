// C:\Users\HP\MediTrack\controllers\auth.controller.js
const axios = require('axios');
const FormData = require('form-data');
const { db, auth } = require('../configs/firebase-admin');

/**
 * Resolves role by scanning raw OCR text directly.
 * This is the primary detection method — never rely solely on parsed.role
 * because the Python parser may split tokens unexpectedly.
 *
 * Keywords are ordered by priority (most specific first).
 * Returns a lowercase role string for Firestore.
 */
function resolveRole(parsedRole, rawText) {
    const combined = `${parsedRole || ''} ${rawText || ''}`.toLowerCase();

    console.log(`>>> [Role] Combined text for detection:\n"${combined.substring(0, 300)}"\n`);

    // ── Ordered keyword map (first match wins) ────────────────────────────
    const keywordMap = [
        // Medical
        ['physician',     'doctor'],
        ['medical doctor','doctor'],
        ['doctor',        'doctor'],
        [' md ',          'doctor'],   // space-padded to avoid "cmd"
        ['dentist',       'dentist'],
        ['dental',        'dentist'],
        ['nurse',         'nurse'],
        // Academic
        ['lecturer',      'lecturer'],
        ['professor',     'professor'],
        ['prof.',         'professor'],
        ['instructor',    'instructor'],
        ['administrator', 'administrator'],
        [' admin ',       'administrator'],
        ['librarian',     'librarian'],
        // Staff
        ['technician',    'technician'],
        ['security',      'guard'],
        ['guard',         'guard'],
        ['maintenance',   'staff'],
        ['janitor',       'staff'],
        ['cleaner',       'staff'],
        ['employee',      'staff'],
        ['faculty',       'staff'],
        ['staff',         'staff'],
        // Student (lowest priority)
        ['bsit',   'student'], ['bsis',  'student'], ['bsba', 'student'],
        ['bsed',   'student'], ['bscs',  'student'], ['bscrim','student'],
        ['bshm',   'student'], ['bsent', 'student'], ['bsoa', 'student'],
        ['student','student'],
    ];

    for (const [keyword, role] of keywordMap) {
        if (combined.includes(keyword)) {
            console.log(`>>> [Role] Matched keyword "${keyword}" → role: "${role}"`);
            return role;
        }
    }

    console.log('>>> [Role] No keyword matched — defaulting to "student"');
    return 'student';
}

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

        // ── 1. SEND IMAGE TO OCR SERVICE ──────────────────────────────────────
        const ocrForm = new FormData();
        ocrForm.append('image', idFile.buffer, {
            filename: idFile.originalname,
            contentType: idFile.mimetype,
        });

        let ocrResponse;
        try {
            // 1. Grab the base URL (Node.js correctly uses process.env)
            const baseUrl = process.env.VITE_OCR_SERVICE_URL || 'http://localhost:5001';

            // 2. Add the specific route we need
            const ocrUrl = `${baseUrl}/ocr`;

            // 3. Send to Python (getHeaders is required in Node.js!)
            ocrResponse = await axios.post(ocrUrl, ocrForm, {
                headers: { ...ocrForm.getHeaders() },
                timeout: 120000 // Keeping your timeout is a great idea for cloud AI!
            });

        } catch (ocrErr) {
            console.error('OCR service error:', ocrErr.message);
            return res.status(502).json({ success: false, message: 'ID verification service is unavailable.' });
        }

        const ocrData = ocrResponse.data;

        // ── FULL OCR DEBUG LOG ────────────────────────────────────────────────
        console.log('>>> [OCR] Full response:');
        console.log(JSON.stringify(ocrData, null, 2));
        // ─────────────────────────────────────────────────────────────────────

        if (!ocrData.success) {
            return res.status(400).json({ success: false, message: ocrData.error || "OCR Failed." });
        }

        const { parsed, raw_text } = ocrData;

        // ── 2. ID NUMBER MATCHING ─────────────────────────────────────────────
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

        console.log(`>>> [ID] Input: "${universityId}" | OCR detected: "${ocrId}"`);
        console.log(`>>> [ID] Normalized input: "${normalizedInputId}" | Normalized OCR: "${normalize(ocrId)}"`);

        if (!ocrId || normalizedInputId !== normalize(ocrId)) {
            return res.status(400).json({
                success: false,
                message: `Verification Failed: ID on card (${ocrId || 'Not Found'}) does not match your input.`
            });
        }

        // ── 3. ROLE RESOLUTION (scans both parsed.role AND raw_text) ─────────
        const role = resolveRole(parsed?.role, raw_text);
        console.log(`>>> [Role] Final role saved to DB: "${role}"`);

        // ── 4. DUPLICATE CHECK ────────────────────────────────────────────────
        const duplicateCheck = await db.collection('users').where('universityId', '==', ocrId).get();
        if (!duplicateCheck.empty) {
            return res.status(400).json({ success: false, message: "This University ID is already registered." });
        }

        // ── 5. CREATE FIREBASE AUTH + FIRESTORE USER ──────────────────────────
        const userRecord = await auth.createUser({
            email,
            password,
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
            role,                   // ← dynamically resolved from OCR
            isProfileSetup: false,
            studentClassification: role === 'student' ? 'Regular' : '',
            createdAt: new Date().toISOString()
        };

        await db.collection('users').doc(userRecord.uid).set(userData);
        console.log(`>>> [DB] User saved with role: "${role}"`);

        return res.status(201).json({
            success: true,
            message: "Registration successful! ID Verified.",
            data: { ...userData }
        });

    } catch (error) {
        console.error("Registration Error:", error.message);
        const msg = error.code === 'auth/email-already-exists'
            ? "Email already in use."
            : "Internal server error.";
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

        const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
        const signInResponse = await axios.post(signInUrl, { email, password, returnSecureToken: true });
        const { localId, idToken } = signInResponse.data;

        const userDoc = await db.collection('users').doc(localId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: "User profile not found." });
        }

        const userData = userDoc.data();

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            data: {
                token: idToken,
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
        const message = (
            errorCode === 'EMAIL_NOT_FOUND' ||
            errorCode === 'INVALID_PASSWORD' ||
            errorCode === 'INVALID_LOGIN_CREDENTIALS'
        ) ? "Invalid credentials." : "Login failed.";
        return res.status(401).json({ success: false, message });
    }
};