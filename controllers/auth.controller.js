const axios = require('axios');
const FormData = require('form-data');
const { db, auth } = require('../configs/firebase-admin');

/**
 * REGISTER: Handles University ID OCR verification and account creation
 */
exports.register = async (req, res) => {
    try {
        // 1. Get data from the request
        const { name, email, password, universityId: inputUniversityId } = req.body;
        const idFile = req.file;

        // Initial Validations
        if (!idFile) {
            return res.status(400).json({ success: false, message: "Please upload your University ID image." });
        }
        if (!name || !email || !password || !inputUniversityId) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        console.log(`>>> Processing registration for: ${email}`);

        // 2. OCR VERIFICATION (Talk to Python Service)
        const ocrForm = new FormData();
        ocrForm.append('image', idFile.buffer, {
            filename: idFile.originalname,
            contentType: idFile.mimetype,
        });

        console.log(">>> Forwarding to Python OCR Service...");
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

        console.log('\n=== WHAT PADDLEOCR ACTUALLY SAW ===');
        console.log(JSON.stringify(ocrData, null, 2));
        console.log('===================================\n');

        if (!ocrData.success) {
            return res.status(400).json({ success: false, message: ocrData.error || "OCR Failed to process the image." });
        }

        const { parsed, raw_text } = ocrData;

        // 3. Extract ID number — parsed result first, raw text fallback
        let ocrId = parsed?.id_number || null;

        // Normalization: strips ALL spaces and special characters, keeping ONLY letters and numbers.
        const normalize = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
        const normalizedInputId = normalize(inputUniversityId);

        // If the OCR parser didn't hand us the exact ID, hunt for it in the raw text
        if (!ocrId && raw_text) {
            const normalizedRawText = normalize(raw_text);
            
            // Fallback A: Does the normalized raw text contain the exact typed ID?
            if (normalizedRawText.includes(normalizedInputId)) {
                ocrId = inputUniversityId; 
            } else {
                // Fallback B: Looser alphanumeric regex
                const match = raw_text.match(/\b([A-Z0-9]{2,}[\s\-]?[0-9]{2,})\b/i);
                if (match) ocrId = match[1];
            }
        }

        if (!ocrId) {
            return res.status(400).json({ 
                success: false, 
                message: "OCR Failed: Could not find an ID number on the card. Please ensure the photo is clear." 
            });
        }

        console.log(`>>> AI found on card: ${ocrId} | User typed: ${inputUniversityId}`);

        // 4. VERIFICATION: Compare Manual Input vs AI Result
        if (normalizedInputId !== normalize(ocrId)) {
            return res.status(400).json({ 
                success: false, 
                message: `Verification Failed: Typed ID (${inputUniversityId}) does not match ID on card (${ocrId}).` 
            });
        }

        // Determine role based on Python's parsed classification
        const role = parsed?.id_type === 'Employee ID' ? 'employee' : 'student';

        // 5. DUPLICATE CHECK (Firestore)
        const userRef = db.collection('users');
        const duplicateCheck = await userRef.where('universityId', '==', ocrId).get();
        
        if (!duplicateCheck.empty) {
            return res.status(400).json({ success: false, message: "This University ID is already registered." });
        }

        // 6. FIREBASE AUTH: Create the Account
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: name,
        });

        // 7. FIRESTORE: Save the User Profile
        const userData = {
            name,
            email: email.toLowerCase(),
            universityId: ocrId,
            isVerified: true,
            role: role, 
            createdAt: new Date().toISOString()
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        // 8. GENERATE TOKEN
        const customToken = await auth.createCustomToken(userRecord.uid);

        return res.status(201).json({
            success: true,
            message: "Registration successful! ID Verified.",
            data: {
                uid: userRecord.uid,
                token: customToken 
            }
        });

    } catch (error) {
        console.error("Registration Error:", error.message);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ success: false, message: "That email is already in use." });
        }
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * LOGIN: Verifies credentials and returns user profile
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        // 1. Authenticate with Firebase Auth REST API
        const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY; 

        const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

        const signInResponse = await axios.post(signInUrl, {    
            email,
            password,
            returnSecureToken: true
        });

        const { localId, idToken } = signInResponse.data;

        // 2. Fetch User Profile from Firestore
        const userDoc = await db.collection('users').doc(localId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: "User profile not found." });
        }

        const userData = userDoc.data();

        // 3. Return success
        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token: idToken,
            user: {
                uid: localId,
                name: userData.name,
                email: userData.email,
                universityId: userData.universityId,
                role: userData.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error.response?.data?.error?.message || error.message);
        
        const errorCode = error.response?.data?.error?.message;
        let message = "Invalid email or password.";

        if (errorCode === 'EMAIL_NOT_FOUND' || errorCode === 'INVALID_PASSWORD') {
            message = "Invalid credentials. Please try again.";
        } else if (errorCode === 'USER_DISABLED') {
            message = "This account has been disabled.";
        }

        return res.status(401).json({ success: false, message });
    }
};