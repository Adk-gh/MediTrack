// C:\Users\HP\MediTrack\models\user.js 
//This file now acts as a "Data Blueprint" for Firestore
const UserData = (data) => {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    middleInitial: data.middleInitial || '',
    suffix: data.suffix || '',
    email: data.email.toLowerCase(),
    universityId: data.universityId, // Matched with the frontend FormData
    isVerified: data.isVerified ?? true, // Defaults to true if not provided
    role: data.role || 'student',
    createdAt: new Date().toISOString(),
    // We do NOT store passwords here. Passwords stay in Firebase Auth!
  };
};

module.exports = UserData;