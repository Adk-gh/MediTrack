// C:\Users\HP\MediTrack\features\user\user.service.js

const supabase = require('../../configs/database');
const axios = require('axios');
const FormData = require('form-data');
const { getSystemConfig } = require('../../services/systemConfig.service');

// ── Defaults & Utilities ───────────────────────────────────────────────────
const DEFAULT_USER_PREFERENCES = { language: 'English', dateFormat: 'MM/DD/YYYY' };

const normalizeName = (name) => {
  if (!name) return '';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const normalizePreferences = (prefs) =>
  (!prefs || typeof prefs !== 'object' || Array.isArray(prefs))
    ? { ...DEFAULT_USER_PREFERENCES }
    : { ...DEFAULT_USER_PREFERENCES, ...prefs };

const formatUserResponse = (data) => ({
  uid: data.uid, firstName: data.first_name, lastName: data.last_name, middleName: data.middle_name || '',
  suffix: data.suffix || '', email: data.email, role: data.role, universityId: data.university_id,
  department: data.department || '', program: data.program || '', isVerified: data.is_verified,
  isProfileSetup: data.is_profile_setup || false, profileComplete: data.profile_complete || false,
  birthday: data.birthday || '', age: data.age || '', sex: data.sex || '', bloodType: data.blood_type || '',
  homeAddress: data.home_address || '', religion: data.religion || '', nationality: data.nationality || '',
  civilStatus: data.civil_status || '', yearLevel: data.year_level || '', section: data.section || '',
  academicInfoAcknowledgedVersion: Number(data.academic_info_acknowledged_version || 0),
  studentClassification: data.student_classification || '', classification: data.classification || '',
  jobTitle: data.job_title || '', licenseNumber: data.license_number || '', phoneNumber: data.phone_number || '',
  emergencyContact: data.emergency_contact || {}, vaccinations: data.vaccinations || {},
  dentalHistory: data.dental_history || {}, surgicalHistory: data.surgical_history || { operations: [], declined: false },
  preferences: normalizePreferences(data.preferences)
});

const resolveRole = (parsedRole, rawText) => {
  const combined = `${parsedRole || ''} ${rawText || ''}`.toLowerCase();
  console.log(`>>> [Role] Combined text for detection:\n"${combined.substring(0, 300)}"\n`);

  const keywordMap = [
    ['physician', 'doctor'], ['medical doctor', 'doctor'], ['doctor', 'doctor'], [' md ', 'doctor'],
    ['dentist', 'dentist'], ['dental', 'dentist'], ['nurse', 'nurse'], ['lecturer', 'lecturer'],
    ['professor', 'professor'], ['prof.', 'professor'], ['instructor', 'instructor'],
    ['administrator', 'administrator'], [' admin ', 'administrator'], ['librarian', 'librarian'],
    ['technician', 'technician'], ['security', 'guard'], ['guard', 'guard'], ['maintenance', 'staff'],
    ['janitor', 'staff'], ['cleaner', 'staff'], ['employee', 'staff'], ['faculty', 'staff'],
    ['staff', 'staff'], ['bsit', 'student'], ['bsis', 'student'], ['bsba', 'student'], ['bsed', 'student'],
    ['bscs', 'student'], ['bscrim', 'student'], ['bshm', 'student'], ['bsent', 'student'],
    ['bsoa', 'student'], ['student', 'student']
  ];

  for (const [keyword, role] of keywordMap) {
    if (combined.includes(keyword)) {
      console.log(`>>> [Role] Matched keyword "${keyword}" → role: "${role}"`);
      return role;
    }
  }
  console.log('>>> [Role] No keyword matched — defaulting to "student"');
  return 'student';
};

const throwError = (msg, code = 400) => { const e = new Error(msg); e.statusCode = code; throw e; };

// ── Service Methods ────────────────────────────────────────────────────────
exports.registerUser = async ({ firstName, middleName, lastName, suffix, email, password, universityId }, idFile) => {
  if (!firstName || !lastName || !email || !password || !universityId) throwError('Missing required fields.', 400);
  if (!idFile) throwError('Please upload your University ID image.', 400);

  const ocrForm = new FormData();
  ocrForm.append('image', idFile.buffer, { filename: idFile.originalname, contentType: idFile.mimetype });

  let ocrResponse;
  try {
    const ocrUrl = `${process.env.OCR_SERVICE_URL || 'http://localhost:5001'}/ocr`;
    ocrResponse = await axios.post(ocrUrl, ocrForm, { headers: { ...ocrForm.getHeaders() }, timeout: 120000 });
  } catch (ocrErr) {
    console.error('OCR Service Connection Failed:', ocrErr.message);
    throwError('ID verification service is unavailable.', 502);
  }

  const { parsed, raw_text, success, error: ocrErrorMsg } = ocrResponse.data;
  console.log('>>> [OCR] Full response:\n', JSON.stringify(ocrResponse.data, null, 2));
  if (!success) throwError(ocrErrorMsg || 'OCR Failed to process the image.', 400);

  const normalizeId = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizedInputId = normalizeId(universityId);
  let ocrId = parsed?.id_number || null;

  if (!ocrId && raw_text) {
    const normalizedRawText = normalizeId(raw_text);
    if (normalizedRawText.includes(normalizedInputId)) ocrId = universityId;
    else {
      const match = raw_text.match(/\b([A-Z0-9]{2,}[\s\-]?[0-9]{2,})\b/i);
      if (match) ocrId = match[1];
    }
  }

  console.log(`>>> [ID] Input: "${universityId}" | OCR detected: "${ocrId}"\n>>> [ID] Normalized input: "${normalizedInputId}" | Normalized OCR: "${normalizeId(ocrId)}"`);
  if (!ocrId || normalizedInputId !== normalizeId(ocrId)) throwError(`Verification Failed: ID on card (${ocrId || 'Not Found'}) does not match your input.`, 400);

  const role = resolveRole(parsed?.role, raw_text);
  console.log(`>>> [Role] Final role saved to DB: "${role}"`);

  const { data: existingUsers } = await supabase.from('users').select('uid').eq('university_id', ocrId);
  if (existingUsers?.length > 0) throwError('This University ID is already registered.', 400);

  let userResponse;
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { firstName, lastName, display_name: `${firstName} ${lastName}`.trim() } } });
    if (error) throw error;
    userResponse = data;
  } catch (supabaseErr) {
    if (supabaseErr.message.includes('already been registered')) throwError('That email is already in use.', 400);
    throw supabaseErr;
  }

  const user = userResponse?.user;
  console.log('>>> [Auth] userResponse:', JSON.stringify(userResponse), '\n>>> [Auth] user.id:', user?.id);
  if (!user?.id) throw new Error('Failed to create user account: No user/ID returned from Supabase Auth');

  const newUser = {
    uid: user.id, first_name: normalizeName(firstName), last_name: normalizeName(lastName), middle_name: normalizeName(middleName),
    suffix: suffix || '', email: email.toLowerCase(), university_id: ocrId, is_verified: false, role, is_profile_setup: false,
    student_classification: role === 'student' ? 'Regular' : '', preferences: { ...DEFAULT_USER_PREFERENCES }, created_at: new Date().toISOString()
  };

  const { data: existingByEmail } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (existingByEmail) {
    if (existingByEmail.uid !== user.id) {
      console.log(`>>> [DB] User exists with different UID. Updating ${existingByEmail.uid} to Auth UID ${user.id}`);
      const { data: updateData, error: updateError } = await supabase.from('users').update({
        uid: user.id, first_name: newUser.first_name, last_name: newUser.last_name, middle_name: newUser.middle_name,
        university_id: ocrId, role, updated_at: new Date().toISOString()
      }).eq('id', existingByEmail.id).select().single();
      if (updateError) throw new Error('Failed to update user UID: ' + updateError.message);
      return formatUserResponse(updateData);
    }
    return formatUserResponse(existingByEmail);
  }

  const { data: insertData, error: insertError } = await supabase.from('users').insert(newUser).select().single();
  if (insertError) {
    console.error('>>> [DB] Insert error:', insertError);
    await supabase.auth.admin.deleteUser(user.id);
    throw new Error('Failed to save user profile: ' + insertError.message);
  }

  console.log(`>>> [DB] User saved with role: "${role}", UID: ${insertData?.uid}`);
  return formatUserResponse(insertData);
};

exports.loginUser = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('>>> [Auth] signInWithPassword error:', error.message);
    throwError(error.message, 401);
  }

  const { user, session } = data;
  console.log(`👉 Auth UID from Supabase: ${user.id} | Checking public.users table...`);

  const { data: userData } = await supabase.from('users').select('*').eq('uid', user.id).eq('is_archived', false).maybeSingle();

  if (!userData) {
    console.log('>>> [Profile] No user record found, auto-creating from auth...');
    const newUser = {
      uid: user.id, email: user.email?.toLowerCase() || '', first_name: user.user_metadata?.firstName || user.email?.split('@')[0] || 'User',
      last_name: user.user_metadata?.lastName || '', middle_name: '', suffix: '', role: 'student', is_verified: true, is_profile_setup: false,
      profile_complete: false, preferences: { ...DEFAULT_USER_PREFERENCES }, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };

    const { data: createdUser, error: createError } = await supabase.from('users').insert(newUser).select().single();
    if (createError) {
      console.error('>>> [Profile] Auto-create failed:', createError.message);
      throwError('Failed to create user profile.', 500);
    }
    return { token: session.access_token, refreshToken: session.refresh_token, ...formatUserResponse(createdUser) };
  }
  return { token: session.access_token, refreshToken: session.refresh_token, ...formatUserResponse(userData) };
};

exports.setupProfile = async (userId, profileData) => {
  if (!userId) throw new Error('userId is required for setupProfile');
  const { data: existingUser } = await supabase.from('users').select('email, role, university_id, preferences').eq('uid', userId).single();
  const role = (profileData.role || existingUser?.role || 'student').toLowerCase();

  const sanitized = {
    email: profileData.email || existingUser?.email || '', first_name: profileData.firstName ?? '', last_name: profileData.lastName ?? '',
    middle_name: profileData.middleName ?? '', suffix: profileData.suffix ?? '', birthday: profileData.birthday ?? '', age: profileData.age ?? '',
    sex: profileData.sex ?? '', blood_type: profileData.bloodType ?? '', home_address: profileData.homeAddress ?? '', religion: profileData.religion ?? '',
    nationality: profileData.nationality ?? '', civil_status: profileData.civilStatus ?? '', university_id: profileData.universityId || existingUser?.university_id || null,
    department: profileData.department ?? '', program: profileData.program ?? '', year_level: profileData.yearLevel ?? '', section: profileData.section ?? '',
    student_classification: role === 'student' ? (profileData.studentClassification ?? 'Regular') : '', classification: profileData.classification ?? '',
    job_title: profileData.jobTitle ?? '', phone_number: profileData.phoneNumber ?? '', emergency_contact: profileData.emergencyContact ?? { name: '', relationship: '', phone: '', address: '' },
    vaccinations: profileData.vaccinations ?? { dose1: { vaccineName: '', date: '' }, dose2: { vaccineName: '', date: '' }, booster1: { vaccineName: '', date: '' }, booster2: { vaccineName: '', date: '' } },
    dental_history: profileData.dentalHistory ?? {}, surgical_history: profileData.surgicalHistory ?? { operations: [], declined: false },
    preferences: normalizePreferences(profileData.preferences || existingUser?.preferences), is_profile_setup: true, profile_complete: true, updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('users').upsert({ uid: userId, ...sanitized }, { onConflict: 'uid' }).select().single();
  if (error) throw new Error('Failed to save profile: ' + error.message);
  return formatUserResponse(data);
};

exports.getProfile = async (userId) => {
  if (!userId) throw new Error('userId is required for getProfile');
  const { data, error } = await supabase.from('users').select('*').eq('uid', userId).eq('is_archived', false).single();
  if (error || !data) throwError('User not found', 404);
  return formatUserResponse(data);
};

exports.deleteUser = async (userId, deletedByName) => {
  const { error } = await supabase.from('users').update({ is_archived: true, deleted_by: deletedByName || 'system', updated_at: new Date().toISOString() }).eq('uid', userId);
  if (error) throw new Error(error.message);
  return { uid: userId };
};

exports.checkUniversityId = async (universityId) => {
  const { data } = await supabase.from('users').select('uid').eq('university_id', universityId);
  return data && data.length > 0;
};

exports.toggleProfileComplete = async (userId, profileComplete) => {
  if (!userId) throw new Error('userId is required for toggleProfileComplete');
  let newValue = profileComplete;

  if (newValue === undefined) {
    const { data: currentUser } = await supabase.from('users').select('profile_complete').eq('uid', userId).single();
    newValue = !currentUser?.profile_complete;
  }

  const { data, error } = await supabase.from('users').update({ profile_complete: newValue, updated_at: new Date().toISOString() }).eq('uid', userId).select('profile_complete').single();
  if (error) throw new Error(error.message);
  return { profileComplete: data.profile_complete };
};

exports.updateProfile = async (userId, updates) => {
  if (!userId) throw new Error('userId is required for updateProfile');

  const { data: currentUser, error: currentUserError } = await supabase.from('users')
    .select(`uid, role, year_level, section, academic_info_acknowledged_version, preferences`)
    .eq('uid', userId).eq('is_archived', false).single();
  if (currentUserError || !currentUser) throw new Error(currentUserError?.message || 'User not found');

  const dbUpdates = {};
  const normFields = { firstName: 'first_name', lastName: 'last_name', middleName: 'middle_name', suffix: 'suffix' };
  const directFields = {
    birthday: 'birthday', age: 'age', sex: 'sex', bloodType: 'blood_type', homeAddress: 'home_address', religion: 'religion',
    nationality: 'nationality', civilStatus: 'civil_status', department: 'department', program: 'program', yearLevel: 'year_level',
    section: 'section', studentClassification: 'student_classification', classification: 'classification', jobTitle: 'job_title',
    licenseNumber: 'license_number', phoneNumber: 'phone_number', emergencyContact: 'emergency_contact', vaccinations: 'vaccinations',
    dentalHistory: 'dental_history', surgicalHistory: 'surgical_history', profileComplete: 'profile_complete'
  };

  Object.entries(normFields).forEach(([k, dbKey]) => { if (updates[k] !== undefined) dbUpdates[dbKey] = normalizeName(updates[k]); });
  Object.entries(directFields).forEach(([k, dbKey]) => { if (updates[k] !== undefined) dbUpdates[dbKey] = updates[k]; });

  if (updates.preferences !== undefined) {
    const p = updates.preferences;
    if (!p || typeof p !== 'object' || Array.isArray(p)) throwError('Invalid preferences.', 400);
    if (p.language !== undefined && !['English', 'Filipino'].includes(p.language)) throwError('Invalid language preference.', 400);
    if (p.dateFormat !== undefined && !['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(p.dateFormat)) throwError('Invalid date format preference.', 400);
    dbUpdates.preferences = { ...DEFAULT_USER_PREFERENCES, ...normalizePreferences(currentUser.preferences), ...p };
  }

  if (currentUser.role?.toLowerCase() === 'student' && (updates.yearLevel !== undefined || updates.section !== undefined)) {
    const finalYearLevel = updates.yearLevel !== undefined ? updates.yearLevel : currentUser.year_level;
    const finalSection = updates.section !== undefined ? updates.section : currentUser.section;

    if (String(finalYearLevel || '').trim() && String(finalSection || '').trim()) {
      try {
        const sysConf = await getSystemConfig();
        if (sysConf?.prompt_student_academic_update === true && sysConf?.academic_update_version != null) {
          dbUpdates.academic_info_acknowledged_version = Number(sysConf.academic_update_version);
        }
      } catch (err) { console.error('[updateProfile] Academic acknowledgement config fetch failed:', err); }
    }
  }

  delete dbUpdates.academic_info_acknowledged_version; // Security wipe fallback
  // Re-assign correctly according to the strict order defined in your original file
  if (currentUser.role?.toLowerCase() === 'student' && (updates.yearLevel !== undefined || updates.section !== undefined)) {
    const finalYearLevel = updates.yearLevel !== undefined ? updates.yearLevel : currentUser.year_level;
    const finalSection = updates.section !== undefined ? updates.section : currentUser.section;
    if (String(finalYearLevel || '').trim() && String(finalSection || '').trim()) {
      try {
        const sysConf = await getSystemConfig();
        if (sysConf?.prompt_student_academic_update === true) {
          dbUpdates.academic_info_acknowledged_version = Number(sysConf?.academic_update_version) || 1;
        }
      } catch (err) { console.error('[updateProfile] Academic acknowledgement config fetch failed:', err); }
    }
  }

  if (Object.keys(dbUpdates).length === 0) return exports.getProfile(userId);

  dbUpdates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('users').update(dbUpdates).eq('uid', userId).select().single();
  if (error || !data) throw new Error(error?.message || 'No data returned from database');

  return formatUserResponse(data);
};

exports.adminUpdateUser = async (targetUid, updates) => {
  if (!targetUid) throw new Error('targetUid is required for adminUpdateUser');

  const dbUpdates = { updated_at: new Date().toISOString() };

  const fieldMap = [
    [['firstName', 'first_name'], 'first_name', true], [['lastName', 'last_name'], 'last_name', true],
    [['middleName', 'middle_name'], 'middle_name', true], [['suffix'], 'suffix', false],
    [['universityId', 'university_id'], 'university_id', false], [['email'], 'email', false],
    [['phoneNumber', 'phone_number'], 'phone_number', false], [['role'], 'role', false],
    [['department'], 'department', false], [['program'], 'program', false], [['jobTitle', 'job_title'], 'job_title', false],
    [['licenseNumber', 'license_number'], 'license_number', false], [['birthday'], 'birthday', false],
    [['age'], 'age', false], [['sex'], 'sex', false], [['bloodType', 'blood_type'], 'blood_type', false],
    [['civilStatus', 'civil_status'], 'civil_status', false], [['religion'], 'religion', false],
    [['nationality'], 'nationality', false], [['homeAddress', 'home_address'], 'home_address', false],
    [['yearLevel', 'year_level'], 'year_level', false], [['section'], 'section', false],
    [['studentClassification', 'student_classification'], 'student_classification', false],
    [['classification'], 'classification', false], [['isVerified', 'is_verified'], 'is_verified', false],
    [['profileComplete', 'profile_complete'], 'profile_complete', false], [['isProfileSetup', 'is_profile_setup'], 'is_profile_setup', false],
    [['emergencyContact'], 'emergency_contact', false], [['vaccinations'], 'vaccinations', false],
    [['dentalHistory'], 'dental_history', false], [['surgicalHistory'], 'surgical_history', false]
  ];

  fieldMap.forEach(([keys, dbKey, doNormalize]) => {
    const val = keys.map(k => updates[k]).find(v => v !== undefined);
    if (val !== undefined) dbUpdates[dbKey] = doNormalize ? normalizeName(val) : val;
  });

  if (updates.newPassword) {
    const { error: authError } = await supabase.auth.admin.updateUser(targetUid, { password: updates.newPassword });
    if (authError) throw new Error('Failed to update password: ' + authError.message);
  }

  let { data, error } = await supabase.from('users').update(dbUpdates).eq('uid', targetUid).select().single();

  if (!data && error?.code === 'PGRST116') {
    console.log('[adminUpdateUser] No user found by uid, trying id');
    const retry = await supabase.from('users').update(dbUpdates).eq('id', targetUid).select().single();
    data = retry.data; error = retry.error;
    if (error) throw new Error(error.message || 'User not found');
  } else if (error) {
    throw new Error(error.message);
  }

  return formatUserResponse(data);
};