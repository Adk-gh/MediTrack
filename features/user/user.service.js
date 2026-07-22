// C:\Users\HP\MediTrack\features\user\user.service.js
const supabase = require('../../configs/database');
const axios = require('axios');
const FormData = require('form-data');

// ── Name Normalization ──────────────────────────────────────────────────────
// Normalize name: first letter capitalized, rest lowercase, no ALL CAPS
function normalizeName(name) {
  if (!name) return '';
  let trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function resolveRole(parsedRole, rawText) {
  const combined = `${parsedRole || ''} ${rawText || ''}`.toLowerCase();
  console.log(`>>> [Role] Combined text for detection:\n"${combined.substring(0, 300)}"\n`);

  const keywordMap = [
    ['physician', 'doctor'], ['medical doctor', 'doctor'], ['doctor', 'doctor'],
    [' md ', 'doctor'], ['dentist', 'dentist'], ['dental', 'dentist'], ['nurse', 'nurse'],
    ['lecturer', 'lecturer'], ['professor', 'professor'], ['prof.', 'professor'],
    ['instructor', 'instructor'], ['administrator', 'administrator'], [' admin ', 'administrator'],
    ['librarian', 'librarian'], ['technician', 'technician'], ['security', 'guard'],
    ['guard', 'guard'], ['maintenance', 'staff'], ['janitor', 'staff'], ['cleaner', 'staff'],
    ['employee', 'staff'], ['faculty', 'staff'], ['staff', 'staff'],
    ['bsit', 'student'], ['bsis', 'student'], ['bsba', 'student'], ['bsed', 'student'],
    ['bscs', 'student'], ['bscrim', 'student'], ['bshm', 'student'], ['bsent', 'student'],
    ['bsoa', 'student'], ['student', 'student'],
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

exports.registerUser = async ({ firstName, middleName, lastName, suffix, email, password, universityId }, idFile) => {
  if (!firstName || !lastName || !email || !password || !universityId) {
    const error = new Error('Missing required fields.');
    error.statusCode = 400;
    throw error;
  }

  if (!idFile) {
    const error = new Error('Please upload your University ID image.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Send image to OCR service
  const ocrForm = new FormData();
  ocrForm.append('image', idFile.buffer, {
    filename: idFile.originalname,
    contentType: idFile.mimetype,
  });

  let ocrResponse;
  try {
    const baseUrl = process.env.OCR_SERVICE_URL || 'http://localhost:5001';
    const ocrUrl = `${baseUrl}/ocr`;
    ocrResponse = await axios.post(ocrUrl, ocrForm, {
      headers: { ...ocrForm.getHeaders() },
      timeout: 120000,
    });
  } catch (ocrErr) {
    console.error('OCR Service Connection Failed:', ocrErr.message);
    const error = new Error('ID verification service is unavailable.');
    error.statusCode = 502;
    throw error;
  }

  const ocrData = ocrResponse.data;
  console.log('>>> [OCR] Full response:');
  console.log(JSON.stringify(ocrData, null, 2));

  if (!ocrData.success) {
    const error = new Error(ocrData.error || 'OCR Failed to process the image.');
    error.statusCode = 400;
    throw error;
  }

  const { parsed, raw_text } = ocrData;

  // 2. ID number matching
  const normalize = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizedInputId = normalize(universityId);
  let ocrId = parsed?.id_number || null;

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
    const error = new Error(`Verification Failed: ID on card (${ocrId || 'Not Found'}) does not match your input.`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Role resolution
  const role = resolveRole(parsed?.role, raw_text);
  console.log(`>>> [Role] Final role saved to DB: "${role}"`);

  // 4. Supabase duplicate check
  const { data: existingUsers } = await supabase
    .from('users')
    .select('uid')
    .eq('university_id', ocrId);

  if (existingUsers && existingUsers.length > 0) {
    const error = new Error('This University ID is already registered.');
    error.statusCode = 400;
    throw error;
  }

  // 5. Create Supabase Auth account
  let userResponse;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          display_name: `${firstName} ${lastName}`.trim(),
        }
      }
    });
    if (error) throw error;
    userResponse = data;
  } catch (supabaseErr) {
    if (supabaseErr.message.includes('already been registered')) {
      const error = new Error('That email is already in use.');
      error.statusCode = 400;
      throw error;
    }
    throw supabaseErr;
  }

  const user = userResponse.user;
  if (!user) {
    throw new Error('Failed to create user account');
  }

  // 6. Save user to Supabase 'users' table - normalize names to Title Case
  const newUser = {
    uid:                    user.id,
    first_name:             normalizeName(firstName),
    last_name:              normalizeName(lastName),
    middle_name:         normalizeName(middleName),
    suffix:                 suffix || '',
    email:                  email.toLowerCase(),
    university_id:          ocrId,
    is_verified:            true,
    role,
    is_profile_setup:       false,
    student_classification: role === 'student' ? 'Regular' : '',
    created_at:             new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('users')
    .insert(newUser);

  if (insertError) {
    console.error('>>> [DB] Insert error:', insertError);
    await supabase.auth.admin.deleteUser(user.id);
    throw new Error('Failed to save user profile');
  }

  console.log(`>>> [DB] User saved with role: "${role}"`);

  return {
    uid:            user.id,
    firstName,
    lastName,
    middleName:  middleName || '',
    suffix:         suffix || '',
    email:          email.toLowerCase(),
    universityId:   ocrId,
    isVerified:     true,
    role,
    isProfileSetup: false,
  };
};

exports.loginUser = async ({ email, password }) => {
  // 1. Authenticate with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('>>> [Auth] signInWithPassword error:', error.message);
    const e = new Error(error.message);
    e.statusCode = 401;
    throw e;
  }

  const { user, session } = data;
  console.log("👉 Auth UID from Supabase:", user.id);
  console.log("👉 Checking public.users table for uid =", user.id);

  // 2. Fetch full profile from users table
  const { data: userData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('uid', user.id)
    .eq('is_archived', false)
    .single();

  if (profileError || !userData) {
    console.error('>>> [Profile] fetch error:', profileError?.message);
    const e = new Error('User profile not found.');
    e.statusCode = 404;
    throw e;
  }

  // 3. Return camelCase shape — now includes refreshToken ✅
  return {
    token:          session.access_token,
    refreshToken:   session.refresh_token,   // ✅ added — needed to restore Supabase session on frontend
    uid:            userData.uid,
    firstName:      userData.first_name,
    lastName:       userData.last_name,
    middleName:  userData.middle_name || '',
    suffix:         userData.suffix || '',
    email:          userData.email,
    role:           userData.role,
    universityId:   userData.university_id,
    department:     userData.department || '',
    program:        userData.program || '',
    isVerified:     userData.is_verified,
    isProfileSetup: userData.is_profile_setup || false,
  };
};

exports.setupProfile = async (userId, profileData) => {
  if (!userId) throw new Error('userId is required for setupProfile');

  const { data: existingUser } = await supabase
    .from('users')
    .select('email, role')
    .eq('uid', userId)
    .single();

  const resolvedRole = (profileData.role || existingUser?.role || 'student').toLowerCase();
  const isStudent = resolvedRole === 'student';

  // Preserve existing email if not provided in profileData
  const email = profileData.email || existingUser?.email || '';

  const sanitized = {
    email:                  email,
    first_name:             profileData.firstName ?? '',
    middle_name:         profileData.middleName ?? '',
    last_name:              profileData.lastName ?? '',
    suffix:                 profileData.suffix ?? '',
    birthday:               profileData.birthday ?? '',
    age:                    profileData.age ?? '',
    sex:                    profileData.sex ?? '',
    blood_type:             profileData.bloodType ?? '',
    home_address:           profileData.homeAddress ?? '',
    religion:               profileData.religion ?? '',
    nationality:            profileData.nationality ?? '',
    civil_status:           profileData.civilStatus ?? '',
    university_id:          profileData.universityId ?? '',
    department:             profileData.department ?? '',
    program:                profileData.program ?? '',
    year_level:             profileData.yearLevel ?? '',
    section:                profileData.section ?? '',
    student_classification: isStudent ? (profileData.studentClassification ?? 'Regular') : '',
    classification:         profileData.classification ?? '',
    job_title:              profileData.jobTitle ?? '',
    phone_number:           profileData.phoneNumber ?? '',
    emergency_contact:      profileData.emergencyContact ?? {
      name: '', relationship: '', phone: '', address: '',
    },
    vaccinations: profileData.vaccinations ?? {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
    dental_history: profileData.dentalHistory ?? {},
    surgical_history: profileData.surgicalHistory ?? { operations: [], declined: false },
    is_profile_setup: true,
    profile_complete: true,
    updated_at:       new Date().toISOString(),
  };

  console.log(`[setupProfile] Saving profile for uid: ${userId}`);

  const { data, error } = await supabase
    .from('users')
    .upsert({ uid: userId, ...sanitized }, { onConflict: 'uid' })
    .select()
    .single();

  if (error) {
    console.error('>>> [DB] Upsert error:', error);
    throw new Error('Failed to save profile');
  }

  return data;
};

exports.getProfile = async (userId) => {
  if (!userId) throw new Error('userId is required for getProfile');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', userId)
    .eq('is_archived', false)
    .single();

  if (error || !data) {
    const e = new Error('User not found');
    e.statusCode = 404;
    throw e;
  }

  return {
    uid:                  data.uid,
    firstName:            data.first_name,
    lastName:             data.last_name,
    middleName:        data.middle_name || '',
    suffix:               data.suffix || '',
    email:                data.email,
    role:                 data.role,
    universityId:         data.university_id,
    isVerified:           data.is_verified,
    isProfileSetup:       data.is_profile_setup,
    profileComplete:      data.profile_complete,
    birthday:             data.birthday || '',
    age:                  data.age || '',
    sex:                  data.sex || '',
    bloodType:            data.blood_type || '',
    homeAddress:          data.home_address || '',
    religion:             data.religion || '',
    nationality:          data.nationality || '',
    civilStatus:          data.civil_status || '',
    department:           data.department || '',
    program:              data.program || '',
    yearLevel:            data.year_level || '',
    section:              data.section || '',
    studentClassification: data.student_classification || '',
    classification:       data.classification || '',
    jobTitle:             data.job_title || '',
    licenseNumber:        data.license_number || '',
    phoneNumber:          data.phone_number || '',
    emergencyContact:     data.emergency_contact || {},
    vaccinations:         data.vaccinations || {},
  };
};

exports.deleteUser = async (userId, deletedBy) => {
  // Instead of deleting, set is_archived to true
  const { error } = await supabase
    .from('users')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('uid', userId);

  if (error) {
    throw new Error(error.message);
  }

  return { uid: userId };
};

exports.checkUniversityId = async (universityId) => {
  const { data } = await supabase
    .from('users')
    .select('uid')
    .eq('university_id', universityId);

  return data && data.length > 0;
};

exports.toggleProfileComplete = async (userId, profileComplete) => {
  if (!userId) throw new Error('userId is required for toggleProfileComplete');

  // If profileComplete is not provided, toggle it (flip the current value)
  let newValue;
  if (profileComplete === undefined) {
    // Get current value and toggle
    const { data: currentUser } = await supabase
      .from('users')
      .select('profile_complete')
      .eq('uid', userId)
      .single();

    newValue = !currentUser?.profile_complete;
  } else {
    newValue = profileComplete;
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      profile_complete: newValue,
      updated_at: new Date().toISOString()
    })
    .eq('uid', userId)
    .select('profile_complete')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    profileComplete: data.profile_complete
  };
};

exports.updateProfile = async (userId, updates) => {
  if (!userId) throw new Error('userId is required for updateProfile');

  console.log('[updateProfile] userId:', userId);
  console.log('[updateProfile] updates:', JSON.stringify(updates));

  // Map camelCase to snake_case for database - normalize names to Title Case
  const dbUpdates = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = normalizeName(updates.firstName);
  if (updates.lastName !== undefined) dbUpdates.last_name = normalizeName(updates.lastName);
  if (updates.middleName !== undefined) dbUpdates.middle_name = normalizeName(updates.middleName);
  if (updates.suffix !== undefined) dbUpdates.suffix = normalizeName(updates.suffix);
  if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday;
  if (updates.age !== undefined) dbUpdates.age = updates.age;
  if (updates.sex !== undefined) dbUpdates.sex = updates.sex;
  if (updates.bloodType !== undefined) dbUpdates.blood_type = updates.bloodType;
  if (updates.homeAddress !== undefined) dbUpdates.home_address = updates.homeAddress;
  if (updates.religion !== undefined) dbUpdates.religion = updates.religion;
  if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;
  if (updates.civilStatus !== undefined) dbUpdates.civil_status = updates.civilStatus;
  if (updates.department !== undefined) dbUpdates.department = updates.department;
  if (updates.program !== undefined) dbUpdates.program = updates.program;
  if (updates.yearLevel !== undefined) dbUpdates.year_level = updates.yearLevel;
  if (updates.section !== undefined) dbUpdates.section = updates.section;
  if (updates.studentClassification !== undefined) dbUpdates.student_classification = updates.studentClassification;
  if (updates.classification !== undefined) dbUpdates.classification = updates.classification;
  if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
  if (updates.licenseNumber !== undefined) dbUpdates.license_number = updates.licenseNumber;
  if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
  if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;
  if (updates.vaccinations !== undefined) dbUpdates.vaccinations = updates.vaccinations;
  if (updates.dentalHistory !== undefined) dbUpdates.dental_history = updates.dentalHistory;
  if (updates.surgicalHistory !== undefined) dbUpdates.surgical_history = updates.surgicalHistory;
  if (updates.profileComplete !== undefined) dbUpdates.profile_complete = updates.profileComplete;

  // If no updates, return current profile
  if (Object.keys(dbUpdates).length === 0) {
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('uid', userId)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return {
      uid:                  existing.uid,
      firstName:            existing.first_name,
      lastName:             existing.last_name,
      middleName:        existing.middle_name || '',
      suffix:               existing.suffix || '',
      email:                existing.email,
      role:                 existing.role,
      universityId:         existing.university_id,
      isVerified:           existing.is_verified,
      isProfileSetup:       existing.is_profile_setup,
      profileComplete:      existing.profile_complete,
      birthday:             existing.birthday || '',
      age:                  existing.age || '',
      sex:                  existing.sex || '',
      bloodType:            existing.blood_type || '',
      homeAddress:          existing.home_address || '',
      religion:             existing.religion || '',
      nationality:           existing.nationality || '',
      civilStatus:           existing.civil_status || '',
      department:           existing.department || '',
      program:              existing.program || '',
      yearLevel:            existing.year_level || '',
      section:              existing.section || '',
      studentClassification: existing.student_classification || '',
      classification:       existing.classification || '',
      jobTitle:             existing.job_title || '',
      licenseNumber:        existing.license_number || '',
      phoneNumber:          existing.phone_number || '',
      emergencyContact:     existing.emergency_contact || {},
      vaccinations:         existing.vaccinations || {},
      dentalHistory:        existing.dental_history || {},
      surgicalHistory:      existing.surgical_history || { operations: [], declined: false },
    };
  }

  dbUpdates.updated_at = new Date().toISOString();

  console.log('[updateProfile] dbUpdates:', JSON.stringify(dbUpdates));

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('uid', userId)
    .select()
    .single();

  if (error) {
    console.error('[updateProfile] Supabase error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  if (!data) {
    console.error('[updateProfile] No data returned from Supabase');
    throw new Error('No data returned from database');
  }

  return {
    uid:                  data.uid,
    firstName:            data.first_name,
    lastName:             data.last_name,
    middleName:        data.middle_name || '',
    suffix:               data.suffix || '',
    email:                data.email,
    role:                 data.role,
    universityId:         data.university_id,
    isVerified:           data.is_verified,
    isProfileSetup:       data.is_profile_setup,
    profileComplete:      data.profile_complete,
    birthday:             data.birthday || '',
    age:                  data.age || '',
    sex:                  data.sex || '',
    bloodType:            data.blood_type || '',
    homeAddress:          data.home_address || '',
    religion:             data.religion || '',
    nationality:           data.nationality || '',
    civilStatus:           data.civil_status || '',
    department:           data.department || '',
    program:              data.program || '',
    yearLevel:            data.year_level || '',
    section:              data.section || '',
    studentClassification: data.student_classification || '',
    classification:       data.classification || '',
    jobTitle:             data.job_title || '',
    licenseNumber:        data.license_number || '',
    phoneNumber:          data.phone_number || '',
    emergencyContact:     data.emergency_contact || {},
    vaccinations:         data.vaccinations || {},
    dentalHistory:        data.dental_history || {},
    surgicalHistory:      data.surgical_history || { operations: [], declined: false },
  };
};

exports.adminUpdateUser = async (targetUid, updates) => {
  if (!targetUid) throw new Error('targetUid is required for adminUpdateUser');

  // Map camelCase to snake_case for database (also accept snake_case directly from frontend)
  const dbUpdates = { updated_at: new Date().toISOString() };

  // First name - normalize to Title Case
  if (updates.firstName !== undefined) dbUpdates.first_name = normalizeName(updates.firstName);
  else if (updates.first_name !== undefined) dbUpdates.first_name = normalizeName(updates.first_name);

  // Middle name - normalize to Title Case
  if (updates.middleName !== undefined) dbUpdates.middle_name = normalizeName(updates.middleName);
  else if (updates.middle_name !== undefined) dbUpdates.middle_name = normalizeName(updates.middle_name);

  // Last name - normalize to Title Case
  if (updates.lastName !== undefined) dbUpdates.last_name = normalizeName(updates.lastName);
  else if (updates.last_name !== undefined) dbUpdates.last_name = normalizeName(updates.last_name);

  // Suffix
  if (updates.suffix !== undefined) dbUpdates.suffix = updates.suffix;

  // University ID
  if (updates.universityId !== undefined) dbUpdates.university_id = updates.universityId;
  else if (updates.university_id !== undefined) dbUpdates.university_id = updates.university_id;

  // Email
  if (updates.email !== undefined) dbUpdates.email = updates.email;

  // Phone number
  if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
  else if (updates.phone_number !== undefined) dbUpdates.phone_number = updates.phone_number;

  // Role
  if (updates.role !== undefined) dbUpdates.role = updates.role;

  // Department
  if (updates.department !== undefined) dbUpdates.department = updates.department;

  // Program
  if (updates.program !== undefined) dbUpdates.program = updates.program;

  // Job title
  if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
  else if (updates.job_title !== undefined) dbUpdates.job_title = updates.job_title;

  // License number
  if (updates.licenseNumber !== undefined) dbUpdates.license_number = updates.licenseNumber;
  else if (updates.license_number !== undefined) dbUpdates.license_number = updates.license_number;

  // Birthday
  if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday;

  // Age
  if (updates.age !== undefined) dbUpdates.age = updates.age;

  // Sex
  if (updates.sex !== undefined) dbUpdates.sex = updates.sex;

  // Blood type
  if (updates.bloodType !== undefined) dbUpdates.blood_type = updates.bloodType;
  else if (updates.blood_type !== undefined) dbUpdates.blood_type = updates.blood_type;

  // Civil status
  if (updates.civilStatus !== undefined) dbUpdates.civil_status = updates.civilStatus;
  else if (updates.civil_status !== undefined) dbUpdates.civil_status = updates.civil_status;

  // Religion
  if (updates.religion !== undefined) dbUpdates.religion = updates.religion;

  // Nationality
  if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;

  // Home address
  if (updates.homeAddress !== undefined) dbUpdates.home_address = updates.homeAddress;
  else if (updates.home_address !== undefined) dbUpdates.home_address = updates.home_address;

  // Year level
  if (updates.yearLevel !== undefined) dbUpdates.year_level = updates.yearLevel;
  else if (updates.year_level !== undefined) dbUpdates.year_level = updates.year_level;

  // Section
  if (updates.section !== undefined) dbUpdates.section = updates.section;

  // Student classification
  if (updates.studentClassification !== undefined) dbUpdates.student_classification = updates.studentClassification;
  else if (updates.student_classification !== undefined) dbUpdates.student_classification = updates.student_classification;

  // Classification
  if (updates.classification !== undefined) dbUpdates.classification = updates.classification;

  // Is verified
  if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;
  else if (updates.is_verified !== undefined) dbUpdates.is_verified = updates.is_verified;

  // Profile complete (both camelCase and snake_case)
  if (updates.profileComplete !== undefined) dbUpdates.profile_complete = updates.profileComplete;
  else if (updates.profile_complete !== undefined) dbUpdates.profile_complete = updates.profile_complete;

  // Emergency contact
  if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;

  // Vaccinations
  if (updates.vaccinations !== undefined) dbUpdates.vaccinations = updates.vaccinations;

  // Dental history
  if (updates.dentalHistory !== undefined) dbUpdates.dental_history = updates.dentalHistory;

  // Surgical history
  if (updates.surgicalHistory !== undefined) dbUpdates.surgical_history = updates.surgicalHistory;

  // Handle password update
  if (updates.newPassword) {
    const { data: authData, error: authError } = await supabase.auth.admin.updateUser(targetUid, {
      password: updates.newPassword
    });
    if (authError) {
      console.error('Password update error:', authError);
      throw new Error('Failed to update password: ' + authError.message);
    }
    console.log('[adminUpdateUser] Password updated successfully');
  }

  console.log('[adminUpdateUser] targetUid:', targetUid);
  console.log('[adminUpdateUser] dbUpdates:', dbUpdates);

  // First try to find user by uid
  let { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('uid', targetUid)
    .select()
    .single();

  // If no results with uid, try by id
  if (!data && error && error.code === 'PGRST116') {
    console.log('[adminUpdateUser] No user found by uid, trying id');
    const { data: dataById, error: errorById } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', targetUid)
      .select()
      .single();

    if (errorById) {
      console.error('[adminUpdateUser] Update by id also failed:', errorById);
      throw new Error(errorById.message || 'User not found');
    }

    data = dataById;
    error = errorById;
  }

  if (error) {
    console.error('Admin update error:', error);
    throw new Error(error.message);
  }

  console.log('[adminUpdateUser] Updated successfully - data:', data);

  return {
    uid:                  data.uid,
    firstName:            data.first_name,
    lastName:             data.last_name,
    middleName:        data.middle_name || '',
    suffix:               data.suffix || '',
    email:                data.email,
    role:                 data.role,
    universityId:         data.university_id,
    isVerified:           data.is_verified,
    profileComplete:      data.profile_complete,
    birthday:             data.birthday || '',
    age:                  data.age || '',
    sex:                  data.sex || '',
    bloodType:            data.blood_type || '',
    homeAddress:          data.home_address || '',
    department:           data.department || '',
    program:              data.program || '',
    yearLevel:            data.year_level || '',
    section:              data.section || '',
    studentClassification: data.student_classification || '',
    classification:       data.classification || '',
    jobTitle:             data.job_title || '',
    licenseNumber:        data.license_number || '',
    phoneNumber:          data.phone_number || '',
  };
};
