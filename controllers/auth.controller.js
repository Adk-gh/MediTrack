const axios = require('axios');
const FormData = require('form-data');
const { db, auth } = require('../configs/firebase-admin');

/**
 * REGISTER: Handles Student ID OCR verification and account creation
 */
exports.register = async (req, res) => {
    try {
        // 1. Get data from the request
        const { name, email, password, studentId: inputStudentId } = req.body;
        const idFile = req.file;

        // Initial Validations
        if (!idFile) {
            return res.status(400).json({ success: false, message: "Please upload your Student ID image." });
        }
        if (!name || !email || !password || !inputStudentId) {
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
        const ocrResponse = await axios.post('http://localhost:5001/ocr', ocrForm, {
            headers: { ...ocrForm.getHeaders() }
        });

        const extractedText = ocrResponse.data.text;
        
        // 3. REGEX: Find Student ID on the card (Pattern: XX-XXXXX)
        const idPattern = /\d{2}-\d{5}/;
        const match = extractedText.match(idPattern);

        if (!match) {
            return res.status(400).json({ 
                success: false, 
                message: "OCR Failed: Could not find a Student ID on the uploaded card. Please ensure the photo is clear." 
            });
        }

        const ocrStudentId = match[0]; 
        console.log(`>>> AI found on card: ${ocrStudentId} | User typed: ${inputStudentId}`);

        // 4. VERIFICATION: Compare Manual Input vs AI Result
        if (inputStudentId !== ocrStudentId) {
            return res.status(400).json({ 
                success: false, 
                message: `Verification Failed: Typed ID (${inputStudentId}) does not match ID on card (${ocrStudentId}).` 
            });
        }

        // 5. DUPLICATE CHECK (Firestore)
        const userRef = db.collection('users');
        const duplicateCheck = await userRef.where('studentId', '==', ocrStudentId).get();
        
        if (!duplicateCheck.empty) {
            return res.status(400).json({ success: false, message: "This Student ID is already registered." });
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
            studentId: ocrStudentId,
            isVerified: true,
            role: 'student',
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
        // NOTE: Replace 'YOUR_FIREBASE_WEB_API_KEY' with the key from your Firebase Project Settings
        // Ensure the variable name exactly matches your .env file!
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
                studentId: userData.studentId,
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