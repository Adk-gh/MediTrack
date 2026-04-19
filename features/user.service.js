const { db, auth } = require('../configs/firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper to generate a JWT token
const generateToken = (id) => {
  // Make sure you have JWT_SECRET in your .env file
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_key', {
    expiresIn: '30d',
  });
};

exports.registerUser = async ({ name, email, password }) => {
  const usersRef = db.collection('users');

  // 1. Check if user already exists
  const snapshot = await usersRef.where('email', '==', email).get();
  if (!snapshot.empty) {
    const error = new Error('User already exists with this email');
    error.statusCode = 400;
    throw error;
  }

  // 2. Hash the password securely
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 3. Create a new user document in Firestore
  const newUserRef = usersRef.doc(); // Auto-generates a random Firestore ID
  const newUser = {
    id: newUserRef.id,
    name,
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  await newUserRef.set(newUser);

  // 4. Remove password from the response data for security
  delete newUser.password;

  // 5. Return user info + token
  return {
    ...newUser,
    token: generateToken(newUser.id)
  };
};

exports.loginUser = async ({ email, password }) => {
  const usersRef = db.collection('users');
  
  // 1. Find the user by email
  const snapshot = await usersRef.where('email', '==', email).get();
  if (snapshot.empty) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // 2. Get the user data from the Firestore snapshot
  const user = snapshot.docs[0].data();

  // 3. Compare the typed password with the hashed password in Firestore
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  delete user.password;
  
  // 4. Return user info + token
  return {
    ...user,
    token: generateToken(user.id)
  };
};

exports.firebaseAuth = async (idToken) => {
  // 1. Verify the Google/Firebase token sent from the frontend
  const decodedToken = await auth.verifyIdToken(idToken);
  const { uid, email, name } = decodedToken;

  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).get();

  let user;

  // 2. If user doesn't exist in our DB yet, create them
  if (snapshot.empty) {
    const newUserRef = usersRef.doc(uid); // Use Firebase UID as the document ID
    user = {
      id: uid,
      name: name || '',
      email: email,
      createdAt: new Date().toISOString()
    };
    await newUserRef.set(user);
  } else {
    // 3. Otherwise, just fetch their existing data
    user = snapshot.docs[0].data();
  }

  // 4. Issue our backend's JWT so our API routes remain protected
  return {
    ...user,
    token: generateToken(user.id)
  };
};

exports.getProfile = async (userId) => {
  // 1. Fetch the exact document using the ID attached to the token
  const userRef = db.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const user = doc.data();
  delete user.password;
  
  return user;
};