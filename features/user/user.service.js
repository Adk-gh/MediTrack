// C:\Users\HP\MediTrack\services\user.service.js

const supabase = require('../../configs/database');
const axios = require('axios');
const FormData = require('form-data');
const { getSystemConfig } = require('../../services/systemConfig.service');
const notificationsService = require('../notifications/notifications.service');

// ============================================================
// DEFAULTS & UTILITIES
// ============================================================
const DEFAULT_USER_PREFERENCES = { language: 'English', dateFormat: 'MM/DD/YYYY' };
const throwError = (msg, code = 400) => { const error = new Error(msg); error.statusCode = code; throw error; };

const FIELD_FRIENDLY_NAMES = {
  first_name: 'First Name', last_name: 'Last Name', middle_name: 'Middle Name', birthday: 'Birthday', age: 'Age', sex: 'Sex', blood_type: 'Blood Type',
  home_address: 'Home Address', address_country: 'Country', address_region: 'Region', address_province: 'Province', address_city: 'City',
  address_barangay: 'Barangay', address_street: 'Street', address_zip_code: 'Zip Code', religion: 'Religion', nationality: 'Nationality', civil_status: 'Civil Status',
  university_id: 'University ID', department: 'Department', program: 'Program', year_level: 'Year Level', section: 'Section', student_classification: 'Student Classification',
  classification: 'Classification', job_title: 'Job Title', license_number: 'License Number', phone_number: 'Phone Number', emergency_contact: 'Emergency Contact',
  vaccinations: 'Vaccinations', dental_history: 'Dental History', surgical_history: 'Surgical History', documents: 'Health Documents', preferences: 'Account Preferences', email: 'Email Address'
};

const getChangedFieldsText = (oldData, newUpdates) => {
  if (!oldData) return '';
  const changed = Object.entries(newUpdates)
    .filter(([k, v]) => !['updated_at', 'academic_info_acknowledged_version'].includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(v))
    .map(([k]) => FIELD_FRIENDLY_NAMES[k] || k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  return [...new Set(changed)].join(', ');
};

const normalizeName = (name) => { const t = String(name).trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : ''; };
const normalizePreferences = (prefs) => (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) ? { ...DEFAULT_USER_PREFERENCES } : { ...DEFAULT_USER_PREFERENCES, ...prefs };
const normalizeDocuments = (docs) => Array.isArray(docs) ? docs : (typeof docs === 'string' ? (() => { try { const p = JSON.parse(docs); return Array.isArray(p) ? p : []; } catch { console.error('[Documents] Failed to parse documents:', e); return []; } })() : []);

const formatUserResponse = (data) => ({
  id: data.id,          // <-- ADD THIS
  uid: data.uid,

  firstName: data.first_name,
  lastName: data.last_name,
  middleName: data.middle_name || '',
  suffix: data.suffix || '',

  email: data.email,
  role: data.role,
  universityId: data.university_id,
  department: data.department || '',
  program: data.program || '',

  isVerified: data.is_verified,
  isProfileSetup: data.is_profile_setup || false,
  profileComplete: data.profile_complete || false,

  birthday: data.birthday || '',
  age: data.age || '',
  sex: data.sex || '',
  bloodType: data.blood_type || '',
  homeAddress: data.home_address || '',

  addressCountry: data.address_country || '',
  addressRegion: data.address_region || '',
  addressRegionCode: data.address_region_code || '',
  addressProvince: data.address_province || '',
  addressProvinceCode: data.address_province_code || '',
  addressCity: data.address_city || '',
  addressCityCode: data.address_city_code || '',
  addressBarangay: data.address_barangay || '',
  addressBarangayCode: data.address_barangay_code || '',
  addressStreet: data.address_street || '',
  addressZipCode: data.address_zip_code || '',

  religion: data.religion || '',
  nationality: data.nationality || '',
  civilStatus: data.civil_status || '',

  yearLevel: data.year_level || '',
  section: data.section || '',

  academicInfoAcknowledgedVersion: Number(
    data.academic_info_acknowledged_version || 0
  ),

  studentClassification: data.student_classification || '',
  classification: data.classification || '',

  jobTitle: data.job_title || '',
  licenseNumber: data.license_number || '',
  phoneNumber: data.phone_number || '',

  emergencyContact: data.emergency_contact || {},
  vaccinations: data.vaccinations || {},
  dentalHistory: data.dental_history || {},
  surgicalHistory:
    data.surgical_history || {
      operations: [],
      declined: false,
    },

  documents: normalizeDocuments(data.documents),
  preferences: normalizePreferences(data.preferences),
});

const resolveRole = (parsedRole, rawText) => {
  const combined = `${parsedRole || ''} ${rawText || ''}`.toLowerCase();
  console.log(`>>> [Role] Combined text for detection:\n"${combined.substring(0, 300)}"`);

  const keywordMap = [
    ['physician', 'doctor'], ['medical doctor', 'doctor'], ['doctor', 'doctor'], [' md ', 'doctor'], ['dentist', 'dentist'], ['dental', 'dentist'], ['nurse', 'nurse'],
    ['lecturer', 'lecturer'], ['professor', 'professor'], ['prof.', 'professor'], ['instructor', 'instructor'], ['administrator', 'administrator'], [' admin ', 'administrator'],
    ['librarian', 'librarian'], ['technician', 'technician'], ['security', 'guard'], ['guard', 'guard'], ['maintenance', 'staff'], ['janitor', 'staff'], ['cleaner', 'staff'],
    ['employee', 'staff'], ['faculty', 'staff'], ['staff', 'staff'], ['bsit', 'student'], ['bsis', 'student'], ['bsba', 'student'], ['bsed', 'student'], ['bscs', 'student'],
    ['bscrim', 'student'], ['bshm', 'student'], ['bsent', 'student'], ['bsoa', 'student'], ['student', 'student']
  ];

  for (const [keyword, role] of keywordMap) if (combined.includes(keyword)) { console.log(`>>> [Role] Matched keyword "${keyword}" → role: "${role}"`); return role; }
  console.log('>>> [Role] No keyword matched — defaulting to "student"');
  return 'student';
};

// ============================================================
// REGISTER USER
// ============================================================
exports.registerUser = async ({ firstName, middleName, lastName, suffix, email, password, universityId }, idFile) => {
  if (!firstName || !lastName || !email || !password || !universityId) throwError('Missing required fields.', 400);
  if (!idFile) throwError('Please upload your University ID image.', 400);

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data: existingByEmail, error: existingEmailError } = await supabase.from('users').select('id, uid, email, is_archived').eq('email', normalizedEmail).maybeSingle();

  if (existingEmailError) { console.error('>>> [DB] Existing email check failed:', existingEmailError); throw new Error(existingEmailError.message); }
  if (existingByEmail) throwError(existingByEmail.is_archived ? 'That email belongs to an archived account and cannot be registered again.' : 'That email is already in use.', 400);

  const ocrForm = new FormData();
  ocrForm.append('image', idFile.buffer, { filename: idFile.originalname, contentType: idFile.mimetype });

  let ocrResponse;
  try {
    ocrResponse = await axios.post(`${process.env.OCR_SERVICE_URL || 'http://localhost:5001'}/ocr`, ocrForm, { headers: { ...ocrForm.getHeaders() }, timeout: 120000 });
  } catch (ocrErr) { console.error('OCR Service Connection Failed:', ocrErr.message); throwError('ID verification service is unavailable.', 502); }

  const { parsed, raw_text, success, error: ocrErrorMsg } = ocrResponse.data;
  console.log('>>> [OCR] Full response:\n', JSON.stringify(ocrResponse.data, null, 2));
  if (!success) throwError(ocrErrorMsg || 'OCR Failed to process the image.', 400);

  const normalizeId = (id) => (id || '').toString().replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizedInputId = normalizeId(universityId);
  let ocrId = parsed?.id_number || null;

  if (!ocrId && raw_text) {
    const normalizedRawText = normalizeId(raw_text);
    if (normalizedRawText.includes(normalizedInputId)) ocrId = universityId;
    else { const match = raw_text.match(/\b([A-Z0-9]{2,}[\s\-]?[0-9]{2,})\b/i); if (match) ocrId = match[1]; }
  }

  console.log(`>>> [ID] Input: "${universityId}" | OCR detected: "${ocrId}"\n>>> [ID] Normalized input: "${normalizedInputId}" | Normalized OCR: "${normalizeId(ocrId)}"`);
  if (!ocrId || normalizedInputId !== normalizeId(ocrId)) throwError(`Verification Failed: ID on card (${ocrId || 'Not Found'}) does not match your input.`, 400);

  const role = resolveRole(parsed?.role, raw_text);
  console.log(`>>> [Role] Final role saved to DB: "${role}"`);

  const { data: existingUsers, error: existingIdError } = await supabase.from('users').select('uid, is_archived').eq('university_id', ocrId);
  if (existingIdError) { console.error('>>> [DB] University ID check failed:', existingIdError); throw new Error(existingIdError.message); }
  if (existingUsers && existingUsers.length > 0) throwError(existingUsers.find(u => !u.is_archived) ? 'This University ID is already registered.' : 'This University ID belongs to an archived account and cannot be registered again.', 400);

  let userResponse;
  try {
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { firstName, lastName, display_name: `${firstName} ${lastName}`.trim() } } });
    if (error) throw error;
    userResponse = data;
  } catch (supabaseErr) {
    if (supabaseErr.message?.toLowerCase().includes('already been registered')) throwError('That email is already in use.', 400);
    throw supabaseErr;
  }

  const user = userResponse?.user;
  console.log('>>> [Auth] userResponse:', JSON.stringify(userResponse), '\n>>> [Auth] user.id:', user?.id);
  if (!user?.id) throw new Error('Failed to create user account: No user/ID returned from Supabase Auth');

  const newUser = {
    uid: user.id, first_name: normalizeName(firstName), last_name: normalizeName(lastName), middle_name: normalizeName(middleName), suffix: suffix || '', email: normalizedEmail,
    university_id: ocrId, is_verified: false, role, is_profile_setup: false, profile_complete: false, student_classification: role === 'student' ? 'Regular' : '',
    preferences: { ...DEFAULT_USER_PREFERENCES }, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase.from('users').insert(newUser).select().single();
  if (insertError) {
    console.error('>>> [DB] Insert error:', insertError);
    try { await supabase.auth.admin.deleteUser(user.id); } catch (rollbackError) { console.error('>>> [Auth] Failed to roll back Auth user:', rollbackError); }
    throw new Error('Failed to save user profile: ' + insertError.message);
  }

  console.log(`>>> [DB] User saved with role: "${role}", UID: ${insertData?.uid}`);
  return formatUserResponse(insertData);
};

// ============================================================
// LOGIN USER
// ============================================================
exports.loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

  if (error) { console.error('>>> [Auth] signInWithPassword error:', error.message); throwError(error.message, 401); }
  const { user, session } = data;
  if (!user?.id || !session) throwError('Authentication session could not be created.', 401);
  console.log(`👉 Auth UID from Supabase: ${user.id} | Checking public.users table...`);

  const { data: existingUser, error: existingUserError } = await supabase.from('users').select('*').eq('uid', user.id).maybeSingle();
  if (existingUserError) { console.error('>>> [Profile] Failed to fetch profile:', existingUserError); throwError(existingUserError.message, 500); }
  if (existingUser && existingUser.is_archived === true) { console.warn(`>>> [Auth] Archived user attempted login: ${user.id}`); throwError('This account has been archived and cannot be used.', 403); }

  if (!existingUser) {
    console.log('>>> [Profile] No user record found, auto-creating from auth...');
    const newUser = {
      uid: user.id, email: user.email?.toLowerCase() || '', first_name: user.user_metadata?.firstName || user.email?.split('@')[0] || 'User', last_name: user.user_metadata?.lastName || '',
      middle_name: '', suffix: '', role: 'student', is_verified: true, is_profile_setup: false, profile_complete: false, student_classification: 'Regular',
      preferences: { ...DEFAULT_USER_PREFERENCES }, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    const { data: createdUser, error: createError } = await supabase.from('users').insert(newUser).select().single();
    if (createError) { console.error('>>> [Profile] Auto-create failed:', createError.message); throwError('Failed to create user profile.', 500); }
    return { token: session.access_token, refreshToken: session.refresh_token, ...formatUserResponse(createdUser) };
  }

  console.log(`>>> [Auth] Active profile found for UID: ${user.id}`);
  return { token: session.access_token, refreshToken: session.refresh_token, ...formatUserResponse(existingUser) };
};

// ============================================================
// SETUP / GET / DELETE / CHECK
// ============================================================
exports.setupProfile = async (userId, profileData) => {
  if (!userId) throw new Error('userId is required for setupProfile');
  const { data: existingUser, error: existingUserError } = await supabase.from('users').select('email, role, university_id, preferences, documents').eq('uid', userId).eq('is_archived', false).single();
  if (existingUserError) throw new Error(existingUserError.message);

  const role = (profileData.role || existingUser?.role || 'student').toLowerCase();
  const dbUpdates = {
    email: profileData.email || existingUser?.email || '', first_name: profileData.firstName ?? '', last_name: profileData.lastName ?? '', middle_name: profileData.middleName ?? '', suffix: profileData.suffix ?? '',
    birthday: profileData.birthday ?? '', age: profileData.age ?? '', sex: profileData.sex ?? '', blood_type: profileData.bloodType ?? '', home_address: profileData.homeAddress ?? '',
    address_country: profileData.addressCountry ?? '', address_region: profileData.addressRegion ?? '', address_region_code: profileData.addressRegionCode ?? '', address_province: profileData.addressProvince ?? '',
    address_province_code: profileData.addressProvinceCode ?? '', address_city: profileData.addressCity ?? '', address_city_code: profileData.addressCityCode ?? '', address_barangay: profileData.addressBarangay ?? '',
    address_barangay_code: profileData.addressBarangayCode ?? '', address_street: profileData.addressStreet ?? '', address_zip_code: profileData.addressZipCode ?? '',
    religion: profileData.religion ?? '', nationality: profileData.nationality ?? '', civil_status: profileData.civilStatus ?? '', university_id: profileData.universityId || existingUser?.university_id || null,
    department: profileData.department ?? '', program: profileData.program ?? '', year_level: profileData.yearLevel ?? '', section: profileData.section ?? '',
    student_classification: role === 'student' ? (profileData.studentClassification ?? 'Regular') : '', classification: profileData.classification ?? '', job_title: profileData.jobTitle ?? '',
    license_number: profileData.licenseNumber ?? '', phone_number: profileData.phoneNumber ?? '', emergency_contact: profileData.emergencyContact ?? { name: '', relationship: '', phone: '', address: '' },
    vaccinations: profileData.vaccinations ?? { dose1: { vaccineName: '', date: '' }, dose2: { vaccineName: '', date: '' }, boster1: { vaccineName: '', date: '' }, booster2: { vaccineName: '', date: '' } },
    dental_history: profileData.dentalHistory ?? {}, surgical_history: profileData.surgicalHistory ?? { operations: [], declined: false },
    documents: profileData.documents !== undefined ? normalizeDocuments(profileData.documents) : normalizeDocuments(existingUser?.documents),
    preferences: normalizePreferences(profileData.preferences || existingUser?.preferences),
    is_profile_setup: true, profile_complete: true, updated_at: new Date().toISOString()
  };

  const { data: updatedUsers, error: updateError } = await supabase.from('users').update(dbUpdates).eq('uid', userId).eq('is_archived', false).select();
  if (updateError) { console.error('[setupProfile] Update failed:', updateError); throw new Error(updateError.message); }
  if (!updatedUsers || updatedUsers.length === 0) { const e = new Error(`No active user profile was updated for UID: ${userId}`); e.code = 'USER_PROFILE_UPDATE_ZERO_ROWS'; throw e; }
  if (updatedUsers.length > 1) { const e = new Error(`Multiple user profiles were updated for UID: ${userId}`); e.code = 'DUPLICATE_USER_PROFILE'; console.error('[setupProfile]', e.message, updatedUsers); throw e; }

  return formatUserResponse(updatedUsers[0]);
};

exports.getProfile = async (userId) => {
  if (!userId) throw new Error('userId is required for getProfile');
  const { data, error } = await supabase.from('users').select('*').eq('uid', userId).eq('is_archived', false).single();
  if (error || !data) throwError('User not found', 404);
  return formatUserResponse(data);
};

exports.deleteUser = async (userId, deletedByName) => {
  if (!userId) throw new Error('userId is required for deleteUser');
  const { data, error } = await supabase.from('users').update({ is_archived: true, deleted_by: deletedByName || 'system', updated_at: new Date().toISOString() }).eq('uid', userId).eq('is_archived', false).select('uid, is_archived').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throwError('Active user account not found.', 404);
  console.log(`>>> [Archive] User ${userId} archived successfully.`);
  return { uid: userId, isArchived: true };
};

exports.checkUniversityId = async (universityId) => {
  const { data, error } = await supabase.from('users').select('uid').eq('university_id', universityId).eq('is_archived', false);
  if (error) throw new Error(error.message);
  return data && data.length > 0;
};

exports.toggleProfileComplete = async (userId, profileComplete) => {
  if (!userId) throw new Error('userId is required for toggleProfileComplete');
  let newValue = profileComplete;
  if (newValue === undefined) {
    const { data: currentUser, error } = await supabase.from('users').select('profile_complete').eq('uid', userId).eq('is_archived', false).single();
    if (error) throw new Error(error.message);
    newValue = !currentUser?.profile_complete;
  }
  const { data, error } = await supabase.from('users').update({ profile_complete: newValue, updated_at: new Date().toISOString() }).eq('uid', userId).eq('is_archived', false).select('profile_complete').single();
  if (error) throw new Error(error.message);
  return { profileComplete: data.profile_complete };
};

// ============================================================
// UPDATE PROFILES
// ============================================================
exports.updateProfile = async (userId, updates) => {
  if (!userId) throw new Error('userId is required for updateProfile');

  const { data: currentUsers, error: currentUserError } = await supabase.from('users').select('*').eq('uid', userId).eq('is_archived', false);
  if (currentUserError) { console.error('[updateProfile] Failed to find user:', currentUserError); throw new Error(currentUserError.message); }
  if (!currentUsers || currentUsers.length === 0) { const e = new Error(`No active user profile found for UID: ${userId}`); e.code = 'USER_PROFILE_NOT_FOUND'; throw e; }
  if (currentUsers.length > 1) { const e = new Error(`Multiple active user profiles found for UID: ${userId}`); e.code = 'DUPLICATE_USER_PROFILE'; console.error('[updateProfile]', e.message, currentUsers); throw e; }

  const currentUser = currentUsers[0];
  const dbUpdates = {};

  const normFields = { firstName: 'first_name', lastName: 'last_name', middleName: 'middle_name', suffix: 'suffix' };
  Object.entries(normFields).forEach(([key, dbKey]) => { if (updates[key] !== undefined) dbUpdates[dbKey] = normalizeName(updates[key]); });

  const directFields = {
    birthday: 'birthday', age: 'age', sex: 'sex', bloodType: 'blood_type', homeAddress: 'home_address', addressCountry: 'address_country', addressRegion: 'address_region',
    addressRegionCode: 'address_region_code', addressProvince: 'address_province', addressProvinceCode: 'address_province_code', addressCity: 'address_city', addressCityCode: 'address_city_code',
    addressBarangay: 'address_barangay', addressBarangayCode: 'address_barangay_code', addressStreet: 'address_street', addressZipCode: 'address_zip_code', religion: 'religion', nationality: 'nationality',
    civilStatus: 'civil_status', universityId: 'university_id', department: 'department', program: 'program', yearLevel: 'year_level', section: 'section', studentClassification: 'student_classification',
    classification: 'classification', jobTitle: 'job_title', licenseNumber: 'license_number', phoneNumber: 'phone_number', emergencyContact: 'emergency_contact', vaccinations: 'vaccinations',
    dentalHistory: 'dental_history', surgicalHistory: 'surgical_history', documents: 'documents', profileComplete: 'profile_complete'
  };
  Object.entries(directFields).forEach(([key, dbKey]) => { if (updates[key] !== undefined) dbUpdates[dbKey] = key === 'documents' ? normalizeDocuments(updates[key]) : updates[key]; });

  if (updates.preferences !== undefined) {
    const p = updates.preferences;
    if (!p || typeof p !== 'object' || Array.isArray(p)) throwError('Invalid preferences.', 400);
    if (p.language !== undefined && !['English', 'Filipino'].includes(p.language)) throwError('Invalid language preference.', 400);
    if (p.dateFormat !== undefined && !['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(p.dateFormat)) throwError('Invalid date format preference.', 400);
    dbUpdates.preferences = { ...DEFAULT_USER_PREFERENCES, ...normalizePreferences(currentUser.preferences), ...p };
  }

  let emailChanged = false;
  if (updates.email !== undefined) {
    const newEmail = String(updates.email).trim().toLowerCase(), currentEmail = String(currentUser.email || '').trim().toLowerCase();
    if (!newEmail) throwError('Email cannot be empty.', 400);
    if (newEmail !== currentEmail) {
      const { data: existingEmailUser, error: emailCheckError } = await supabase.from('users').select('id, uid, email, is_archived').eq('email', newEmail).neq('uid', userId).maybeSingle();
      if (emailCheckError) throw new Error(emailCheckError.message);
      if (existingEmailUser) throwError(existingEmailUser.is_archived ? 'That email belongs to an archived account.' : 'That email is already in use.', 400);
      const { error: authEmailError } = await supabase.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: false });
      if (authEmailError) { console.error('[updateProfile] Auth email update failed:', authEmailError); throw new Error('Failed to update email: ' + authEmailError.message); }
      emailChanged = true;
      dbUpdates.email = newEmail;
      console.log(`>>> [Auth] Email change requested for UID ${userId}: ${currentEmail} → ${newEmail}`);
    }
  }

  if (currentUser.role?.toLowerCase() === 'student' && (updates.yearLevel !== undefined || updates.section !== undefined)) {
    const finalYearLevel = updates.yearLevel !== undefined ? updates.yearLevel : currentUser.year_level;
    const finalSection = updates.section !== undefined ? updates.section : currentUser.section;
    if (String(finalYearLevel || '').trim() && String(finalSection || '').trim()) {
      try {
        const sysConf = await getSystemConfig();
        if (sysConf?.prompt_student_academic_update === true && sysConf?.academic_update_version != null) { dbUpdates.academic_info_acknowledged_version = Number(sysConf.academic_update_version); }
      } catch (err) { console.error('[updateProfile] Academic acknowledgement config fetch failed:', err); }
    }
  }

  const actualDbUpdates = { ...dbUpdates };
  if (emailChanged) delete actualDbUpdates.email;
  if (Object.keys(actualDbUpdates).length === 0 && !emailChanged) return exports.getProfile(userId);

  actualDbUpdates.updated_at = new Date().toISOString();
  let savedData = currentUser;

  if (Object.keys(actualDbUpdates).length > 1 || !emailChanged) {
    const { data, error } = await supabase.from('users').update(actualDbUpdates).eq('uid', userId).eq('is_archived', false).select().single();
    if (error || !data) { console.error('[updateProfile] Database update failed:', error); throw new Error(error?.message || 'No data returned from database'); }
    savedData = data;
    console.log(`>>> [DB] Profile updated successfully for UID: ${userId}`);
  }

  if (emailChanged) console.log('>>> [Email] Auth email change requested. public.users.email remains unchanged until the email-change verification flow completes.');

  const changesText = getChangedFieldsText(currentUser, dbUpdates);
  if (changesText.length > 0) {
    try { await notificationsService.createNotification({
  type: 'profile_updated',
  title: 'Profile Updated',
  message: `Your profile information was updated successfully. Changes were made to: ${changesText}.`,
  userId: userId,
  referenceType: 'Users'
}); }
    catch (notifyErr) { console.error('[updateProfile] Failed to send notification:', notifyErr.message); }
  }

  return formatUserResponse(savedData);
};

exports.adminUpdateUser = async (targetUid, updates) => {
  if (!targetUid) throw new Error('targetUid is required for adminUpdateUser');

  let { data: originalUser } = await supabase.from('users').select('*').eq('uid', targetUid).maybeSingle();
  if (!originalUser) { const { data: fallbackUser } = await supabase.from('users').select('*').eq('id', targetUid).maybeSingle(); originalUser = fallbackUser; }

  const dbUpdates = { updated_at: new Date().toISOString() };

  const fieldMap = [
    [['firstName', 'first_name'], 'first_name', true], [['lastName', 'last_name'], 'last_name', true], [['middleName', 'middle_name'], 'middle_name', true],
    [['suffix'], 'suffix', false], [['universityId', 'university_id'], 'university_id', false], [['phoneNumber', 'phone_number'], 'phone_number', false],
    [['role'], 'role', false], [['department'], 'department', false], [['program'], 'program', false], [['jobTitle', 'job_title'], 'job_title', false],
    [['licenseNumber', 'license_number'], 'license_number', false], [['birthday'], 'birthday', false], [['age'], 'age', false], [['sex'], 'sex', false],
    [['bloodType', 'blood_type'], 'blood_type', false], [['civilStatus', 'civil_status'], 'civil_status', false], [['religion'], 'religion', false],
    [['nationality'], 'nationality', false], [['homeAddress', 'home_address'], 'home_address', false], [['addressCountry', 'address_country'], 'address_country', false],
    [['addressRegion', 'address_region'], 'address_region', false], [['addressRegionCode', 'address_region_code'], 'address_region_code', false],
    [['addressProvince', 'address_province'], 'address_province', false], [['addressProvinceCode', 'address_province_code'], 'address_province_code', false],
    [['addressCity', 'address_city'], 'address_city', false], [['addressCityCode', 'address_city_code'], 'address_city_code', false],
    [['addressBarangay', 'address_barangay'], 'address_barangay', false], [['addressBarangayCode', 'address_barangay_code'], 'address_barangay_code', false],
    [['addressStreet', 'address_street'], 'address_street', false], [['addressZipCode', 'address_zip_code'], 'address_zip_code', false],
    [['yearLevel', 'year_level'], 'year_level', false], [['section'], 'section', false], [['studentClassification', 'student_classification'], 'student_classification', false],
    [['classification'], 'classification', false], [['isVerified', 'is_verified'], 'is_verified', false], [['profileComplete', 'profile_complete'], 'profile_complete', false],
    [['isProfileSetup', 'is_profile_setup'], 'is_profile_setup', false], [['emergencyContact'], 'emergency_contact', false], [['vaccinations'], 'vaccinations', false],
    [['dentalHistory'], 'dental_history', false], [['surgicalHistory'], 'surgical_history', false], [['documents'], 'documents', false]
  ];

  fieldMap.forEach(([keys, dbKey, doNormalize]) => {
    const value = keys.map(k => updates[k]).find(v => v !== undefined);
    if (value !== undefined) dbUpdates[dbKey] = dbKey === 'documents' ? normalizeDocuments(value) : doNormalize ? normalizeName(value) : value;
  });

  let passwordChanged = false;
  if (updates.newPassword) {
    const { error: authError } = await supabase.auth.admin.updateUserById(targetUid, { password: updates.newPassword });
    if (authError) throw new Error('Failed to update password: ' + authError.message);
    passwordChanged = true;
  }

  if (updates.email) {
    const newEmail = String(updates.email).trim().toLowerCase();
    const { data: existingEmailUser, error: emailCheckError } = await supabase.from('users').select('uid, email, is_archived').eq('email', newEmail).neq('uid', targetUid).maybeSingle();
    if (emailCheckError) throw new Error(emailCheckError.message);
    if (existingEmailUser) throwError(existingEmailUser.is_archived ? 'That email belongs to an archived account.' : 'That email is already in use.', 400);

    const { error: authEmailError } = await supabase.auth.admin.updateUserById(targetUid, { email: newEmail, email_confirm: true });
    if (authEmailError) throw new Error('Failed to update auth email: ' + authEmailError.message);

    dbUpdates.email = newEmail;
    console.log(`>>> [Admin] Auth email updated for UID ${targetUid}: ${newEmail}`);
  }

  let { data, error } = await supabase.from('users').update(dbUpdates).eq('uid', targetUid).select().single();

  if (!data && error?.code === 'PGRST116') {
    console.log('[adminUpdateUser] No user found by uid, trying id');
    const retry = await supabase.from('users').update(dbUpdates).eq('id', targetUid).select().single();
    data = retry.data; error = retry.error;
    if (error) throw new Error(error.message || 'User not found');
  } else if (error) throw new Error(error.message);

  if (!data) throw new Error('User update completed but no user data was returned.');

  if (originalUser) {
    const changes = [], fieldsText = getChangedFieldsText(originalUser, dbUpdates);
    if (fieldsText) changes.push(`Fields: ${fieldsText}`);
    if (passwordChanged) changes.push('Account Password');
    if (changes.length > 0) {
      try { await notificationsService.createNotification({
  type: 'admin_profile_update',
  title: 'Profile Updated by Admin',
  message: `An administrator updated your profile. Changes were made to: ${changes.join(', ')}.`,
  userId: originalUser.uid,
  referenceType: 'Users'
}); }
      catch (notifyErr) { console.error('[adminUpdateUser] Failed to send notification:', notifyErr.message); }
    }
  }

  return formatUserResponse(data);
};