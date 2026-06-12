// C:\Users\HP\MediTrack\features\user\user.service.js
const supabase = require('../../configs/database');
const axios = require('axios');
const FormData = require('form-data');

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

  // 6. Save user to Supabase 'users' table
  const newUser = {
    uid:                    user.id,
    first_name:             firstName,
    last_name:              lastName,
    middle_name:         middleName || '',
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
    phoneNumber:          data.phone_number || '',
    emergencyContact:     data.emergency_contact || {},
    vaccinations:         data.vaccinations || {},
  };
};

const archiveHelper = require('../archives/archiveHelper');
const ARCHIVE_TYPE = 'user';

exports.deleteUser = async (userId, deletedBy) => {
  const { data: userData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('uid', userId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  await archiveHelper.archiveAndDelete({
    type: ARCHIVE_TYPE,
    originalId: userId,
    tableName: 'users',
    idColumn: 'uid',
    deletedBy
  }, supabase);

  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (e) {
    console.log('Auth user already deleted or mismatch');
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

exports.updateProfile = async (userId, updates) => {
  if (!userId) throw new Error('userId is required for updateProfile');

  // Map camelCase to snake_case for database
  const dbUpdates = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.middleName !== undefined) dbUpdates.middle_name = updates.middleName;
  if (updates.suffix !== undefined) dbUpdates.suffix = updates.suffix;
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
  if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
  if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;
  if (updates.vaccinations !== undefined) dbUpdates.vaccinations = updates.vaccinations;

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('uid', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
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
    phoneNumber:          data.phone_number || '',
    emergencyContact:     data.emergency_contact || {},
    vaccinations:         data.vaccinations || {},
  };
};
