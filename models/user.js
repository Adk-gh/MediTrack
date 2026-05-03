// C:\Users\HP\MediTrack\models\user.js
// Data Blueprint for Firestore — updated to include all ProfileSetup fields

const UserData = (data) => {
  return {
    // ── Basic Auth Info ────────────────────────────
    firstName: data.firstName,
    lastName: data.lastName,
    middleInitial: data.middleInitial || '',
    suffix: data.suffix || '',
    email: data.email.toLowerCase(),
    universityId: data.universityId,
    isVerified: data.isVerified ?? true,
    role: data.role || 'student',
    createdAt: new Date().toISOString(),
    profileComplete: data.profileComplete ?? false,

    // ── Personal Info ──────────────────────────────
    birthday: data.birthday || '',
    age: data.age || '',
    gender: data.gender || '',
    bloodType: data.bloodType || '',
    homeAddress: data.homeAddress || '',
    religion: data.religion || '',
    nationality: data.nationality || '',
    civilStatus: data.civilStatus || '',

    // ── Academic Info (students) ───────────────────
    studentId: data.studentId || '',
    department: data.department || '',
    program: data.program || '',
    yearLevel: data.yearLevel || '',
    section: data.section || '',

    // ── Work Info (non-students) ───────────────────
    classification: data.classification || '',
    jobTitle: data.jobTitle || '',

    // ── Contact Info ──────────────────────────────
    phoneNumber: data.phoneNumber || '',

    // ── Emergency Contact ─────────────────────────
    // Stored as a nested object in Firestore
    emergencyContact: {
      name: data.emergencyContact?.name || '',
      relationship: data.emergencyContact?.relationship || '',
      phone: data.emergencyContact?.phone || '',
      address: data.emergencyContact?.address || '',
    },

    // ── Vaccination History ────────────────────────
    // Array of { dose, vaccineName, date }
    vaccinations: Array.isArray(data.vaccinations)
      ? data.vaccinations.filter(v => v.dose || v.vaccineName || v.date)
      : [],

    // Passwords are NEVER stored here — they stay in Firebase Auth!
  };
};

module.exports = UserData;