// This file now acts as a "Data Blueprint" for Firestore
const UserData = (data) => {
  return {
    name: data.name,
    email: data.email.toLowerCase(),
    studentId: data.studentId,
    isVerified: data.isVerified ?? true, // Defaults to true if not provided
    role: data.role || 'student',
    createdAt: new Date().toISOString(),
    // We do NOT store passwords here. Passwords stay in Firebase Auth!
  };
};

module.exports = UserData;