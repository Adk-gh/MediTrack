// C:\Users\HP\MediTrack\features\Records\records.service.js

const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');

// ─────────────────────────────────────────────────────────────────────────────
// Course abbreviation
// ─────────────────────────────────────────────────────────────────────────────

const COURSE_MAP = {
  'Bachelor of Science in Information Technology': 'BSIT',
  'Bachelor of Science in Information System': 'BSIS',
  'Bachelor of Science in Computer Engineering': 'BSCpE',
  'Bachelor of Science in Industrial Engineering': 'BSIE',
  'Bachelor of Science in Entrepreneurship': 'BSEntrep',
  'Bachelor of Science in Public Administration': 'BSPA',
  'Bachelor of Science in Office Administration': 'BSOA',
  'Bachelor of Science in Business Administration Major in Human Resource Development Management': 'BSBA-HRDM',
  'Bachelor of Science in Business Administration Major in Financial Management': 'BSBA-FM',
  'Bachelor of Science in Business Administration Major in Marketing Management': 'BSBA-MM',
  'Bachelor of Science in Economics': 'BSEcon',
  'Bachelor of Arts in Communication': 'BAC',
  'Bachelor of Science in Psychology': 'BSPsych',
  'Bachelor of Arts in Political Science': 'BAPolSci',
  'Bachelor of Science in Tourism Management': 'BSTM',
  'Bachelor of Science in Hospitality Management': 'BSHM',
  'Bachelor of Science in Accountancy': 'BSA',
  'Bachelor of Science in Accountancy Information System': 'BSAIS',
  'Bachelor of Science in Management Accounting': 'BSMA',
};

function shortenCourse(courseName) {
  if (!courseName) return '';
  return COURSE_MAP[courseName] || courseName;
}

function buildYearSection(yearLevel, section) {
  return [yearLevel, section].filter(Boolean).join(' - ');
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function getRecordTimestamp(record) {
  const value = record?.approved_at || record?.created_at || record?.examDate || record?.dExamDate || 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatDateFriendly(dateString) {
  if (!dateString) return '';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// ─────────────────────────────────────────────────────────────────────────────
// Record type / table helpers
// ─────────────────────────────────────────────────────────────────────────────

const RECORD_TABLES = {
  medical: 'medical_records',
  dental: 'dental_records',
};

function getRecordTable(recordType) {
  return RECORD_TABLES[recordType] || RECORD_TABLES.medical;
}

function getRecordLabel(recordType) {
  return recordType === 'dental' ? 'dental record' : 'medical record';
}

function getRecordReferenceType(recordType) {
  return recordType === 'dental' ? 'dental_record' : 'medical_record';
}

// Fields clinic staff should never be able to move via a generic "edit"
// payload — these are managed by their own dedicated flows
// (status/approval, archiving, certificate requests, timestamps).
const PROTECTED_RECORD_FIELDS = new Set([
  'id',
  'user_id',
  'created_at',
  'updated_at',
  'status',
  'approved_at',
  'is_archived',
  'cert_requested',
  'cert_requested_at',
]);

function sanitizeRecordUpdates(updates = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!PROTECTED_RECORD_FIELDS.has(key) && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

function buildRecordStatusNotification(recordType, status, existingRecord) {
  const label = getRecordLabel(recordType);
  const examDate = existingRecord?.exam_date || existingRecord?.created_at;
  const dateContext = examDate ? ` from ${formatDateFriendly(examDate)}` : '';

  switch (status) {
    case 'approved':
      return {
        title: 'Record Approved',
        message: `Your ${label}${dateContext} has been reviewed and approved by the clinic staff.`,
      };
    case 'rejected':
      return {
        title: 'Record Rejected',
        message: `Your ${label}${dateContext} was reviewed and declined. Please consult the clinic staff.`,
      };
    case 'pending':
      return {
        title: 'Record Pending Review',
        message: `Your ${label}${dateContext} is pending review by the clinic staff.`,
      };
    default:
      return {
        title: 'Record Status Updated',
        message: `Your ${label}${dateContext} status has been updated to: ${status}`,
      };
  }
}

async function notifyPatientAboutRecord(userId, payload) {
  if (!userId) return;

  try {
    await notificationsService.createNotification({
      ...payload,
      userId,
    });
  } catch (notifyErr) {
    console.error('[RecordsService] Notification insert failed:', notifyErr.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User lookup
// ─────────────────────────────────────────────────────────────────────────────

const USER_SELECT = `
  id,
  uid,
  first_name,
  middle_name,
  last_name,
  program,
  year_level,
  section,
  department,
  home_address,
  age,
  sex
`;

async function getUserProfile(authUserId) {
  if (!authUserId) return null;

  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('uid', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getUserProfileByInternalId(internalId) {
  if (!internalId) return null;

  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('id', internalId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database queries
// ─────────────────────────────────────────────────────────────────────────────

async function getMedicalRecords(internalUserId) {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('user_id', internalUserId)
    .eq('status', 'approved')
    .eq('is_archived', false)
    .order('approved_at', { ascending: false });

  if (error) throw error;
  return safeArray(data);
}

async function getDentalRecords(internalUserId) {
  const { data, error } = await supabase
    .from('dental_records')
    .select('*')
    .eq('user_id', internalUserId)
    .eq('status', 'approved')
    .eq('is_archived', false)
    .order('approved_at', { ascending: false });

  if (error) throw error;
  return safeArray(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapMedicalRecord(record, user) {
  return {
    recordType: 'medical',
    id: record.id,
    approved_at: record.approved_at || record.updated_at || record.created_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    firstName: record.first_name || user.first_name || '',
    middleName: record.middle_name || user.middle_name || '',
    lastName: record.last_name || user.last_name || '',
    age: record.age ?? user.age ?? null,
    sex: record.sex || user.sex || '',
    address: record.address || user.home_address || '',
    course: user.program || '',
    yearSection: buildYearSection(user.year_level, user.section),
    examDate: record.exam_date || null,
    physician: record.physician || '',
    nurseOnDuty: record.nurse_on_duty || '',
    height: record.height ?? null,
    weight: record.weight ?? null,
    bmi: record.bmi ?? null,
    waist: record.waist ?? null,
    lmp: record.lmp || null,
    vitalRecords: safeArray(record.vital_records),
    labCbc: record.lab_cbc || '',
    labCbcFacility: record.lab_cbc_facility || '',
    labCbcDate: record.lab_cbc_date || null,
    labUa: record.lab_ua || '',
    labUaFacility: record.lab_ua_facility || '',
    labUaDate: record.lab_ua_date || null,
    labXray: record.lab_xray || '',
    labXrayFacility: record.lab_xray_facility || '',
    labXrayDate: record.lab_xray_date || null,
    checkedMedical: safeArray(record.checked_medical),
    checkedFamily: safeArray(record.checked_family),
    checkedHealth: safeArray(record.checked_health),
    smoking: record.smoking || '',
    smokingDetails: record.smoking_details || '',
    alcohol: record.alcohol || '',
    alcoholDetails: record.alcohol_details || '',
    drugs: record.drugs || '',
    drugsDetails: record.drugs_details || '',
    covidHistory: record.covid_history || null,
    otherMedHistory: record.other_medical_history || '',
    otherFamilyHistory: record.other_family_history || '',
    surgicalHistory: safeArray(record.surgical_history),
    remarks: record.remarks || record.other_medical_history || '',
    finding1: record.finding1 || '',
    isFit: record.is_fit ?? null,
    isNormalFindings: record.is_normal_findings ?? null,
    issue_cert: Boolean(record.issue_cert),
    certRequested: Boolean(record.cert_requested),
    certRequestedAt: record.cert_requested_at || null,
  };
}

function mapDentalRecord(record, user) {
  return {
    recordType: 'dental',
    id: record.id,
    approved_at: record.approved_at || record.updated_at || record.created_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    dFirstName: record.first_name || user.first_name || '',
    dMiddleName: record.middle_name || user.middle_name || '',
    dLastName: record.last_name || user.last_name || '',
    dAge: record.age ?? user.age ?? null,
    dSex: record.sex || user.sex || '',
    dCourseYear: shortenCourse(record.course_year || user.program || ''),
    dAddress: record.address || user.home_address || '',
    dLastVisit: record.last_visit || null,
    dPrevDentist: record.prev_dentist || '',
    dExaminedBy: record.examined_by || '',
    dSigDate: record.sig_date || null,
    dExamDate: record.exam_date || null,
    dentalHistory: safeObject(record.dental_history),
    toothData: safeObject(record.tooth_data),
    intraoral: safeObject(record.intraoral),
    issue_cert: Boolean(record.issue_cert),
    certRequested: Boolean(record.cert_requested),
    certRequestedAt: record.cert_requested_at || null,
    dYearLevel: user.year_level || '',
    dSection: user.section || '',
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: fetch all approved records for a user (by Supabase Auth UID)
// ─────────────────────────────────────────────────────────────────────────────

exports.getUserRecords = async (authUserId) => {
  if (!authUserId) throw new Error('authUserId is required for getUserRecords');

  const user = await getUserProfile(authUserId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const internalUserId = user.id;

  const [medicalRecords, dentalRecords] = await Promise.all([
    getMedicalRecords(internalUserId),
    getDentalRecords(internalUserId),
  ]);

  const medical = medicalRecords.map((record) => mapMedicalRecord(record, user));
  const dental = dentalRecords.map((record) => mapDentalRecord(record, user));

  return sortRecords([...medical, ...dental]);
};

// ─────────────────────────────────────────────────────────────────────────────
// Public: certificate / report request
// ─────────────────────────────────────────────────────────────────────────────

exports.requestCertificate = async (recordId, body, requester) => {
  console.log('[RecordsService] requestCertificate called:', {
    recordId,
    body,
    requester,
  });

  if (!recordId) throw new Error('recordId is required for requestCertificate');

  const authUid = requester?.uid || requester?.id || null;
  if (!authUid) throw new Error('Unable to identify requesting user.');

  const recordType = body?.recordType === 'dental' ? 'dental' : 'medical';
  const table = getRecordTable(recordType);

  const user = await getUserProfile(authUid);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('id, user_id, cert_requested, cert_requested_at')
    .eq('id', recordId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    const error = new Error('Record not found');
    error.statusCode = 404;
    throw error;
  }

  if (existing.user_id !== user.id) {
    const error = new Error('You do not have permission to request this record.');
    error.statusCode = 403;
    throw error;
  }

  if (existing.cert_requested) {
    const error = new Error('A certificate has already been requested for this record.');
    error.statusCode = 400;
    throw error;
  }

  const nowIso = new Date().toISOString();

  const { data, error: updateError } = await supabase
    .from(table)
    .update({
      cert_requested: true,
      cert_requested_at: nowIso,
    })
    .eq('id', recordId)
    .select()
    .single();

  if (updateError) {
    console.error('[RecordsService] Certificate request update failed:', updateError);
    throw new Error('Failed to submit certificate request: ' + updateError.message);
  }

  const requestType =
    body?.requestType || (recordType === 'dental' ? 'report' : 'certificate');

  const patientName =
    `${user.first_name || ''} ${user.last_name || ''}`.trim() || requester?.email || 'A patient';

  console.log('[RecordsService] About to call notifyRecordRequest with:', {
    requestId: recordId,
    requestType,
    patientName,
  });

  try {
    const notifyResult = await notificationsService.notifyRecordRequest({
      requestId: recordId,
      requestType,
      recordType,
      patientName,
    });

    console.log('[RecordsService] notifyRecordRequest result:', notifyResult);
  } catch (notifyError) {
    console.error('[RecordsService] notifyRecordRequest threw an error:', notifyError);
  }

  return {
    id: data.id,
    cert_requested: data.cert_requested,
    cert_requested_at: data.cert_requested_at,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Public: update record status (approve / reject / etc.)
// ─────────────────────────────────────────────────────────────────────────────

exports.updateRecordStatus = async (recordId, recordType, status) => {
  if (!recordId) throw new Error('recordId is required for updateRecordStatus');

  const table = getRecordTable(recordType);
  const normalizedStatus = String(status || '').toLowerCase().trim();

  if (!normalizedStatus) {
    const err = new Error('status is required for updateRecordStatus');
    err.statusCode = 400;
    throw err;
  }

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }

  const updatePayload = {
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };

  if (normalizedStatus === 'approved') {
    updatePayload.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;

  const statusChanged = normalizedStatus !== String(existing.status || '').toLowerCase();

  if (statusChanged) {
    const { title, message } = buildRecordStatusNotification(recordType, normalizedStatus, existing);

    await notifyPatientAboutRecord(existing.user_id, {
      type: 'record_status',
      title,
      message,
      referenceId: recordId,
      referenceType: getRecordReferenceType(recordType),
    });
  }

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public: edit clinical record fields
// Notifies the patient when status or certificate issuance changes.
// ─────────────────────────────────────────────────────────────────────────────

exports.updateRecord = async (recordId, recordType, updates) => {
  if (!recordId) throw new Error('recordId is required for updateRecord');

  const table = getRecordTable(recordType);

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }

  const allowedUpdates = { ...updates };
  delete allowedUpdates.id;
  delete allowedUpdates.user_id;
  delete allowedUpdates.created_at;
  delete allowedUpdates.recordType;

  const payload = {
    ...allowedUpdates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;

  // ── NOTIFICATION LOGIC ──
  const statusChanged = updates.status && updates.status !== existing.status;
  const certIssuedChanged = updates.issue_cert !== undefined && updates.issue_cert !== existing.issue_cert;

  const examDate = existing.exam_date || existing.created_at;
  const dateContext = examDate ? ` from ${formatDateFriendly(examDate)}` : '';
  const docName = recordType === 'dental' ? 'dental report' : 'medical certificate';

  if (statusChanged) {
    const { title, message } = buildRecordStatusNotification(recordType, updates.status, existing);
    await notifyPatientAboutRecord(existing.user_id, {
      type: 'record_status',
      title,
      message,
      referenceId: recordId,
      referenceType: getRecordReferenceType(recordType),
    });
  } else if (certIssuedChanged) {
    const isIssued = updates.issue_cert === true;
    await notifyPatientAboutRecord(existing.user_id, {
      type: 'record_updated',
      title: isIssued ? 'Document Ready' : 'Document Status Updated',
      message: isIssued
        ? `Good news! Your ${docName} for the checkup on ${formatDateFriendly(examDate)} is now ready and has been issued.`
        : `The ${docName} for your checkup on ${formatDateFriendly(examDate)} has been marked as not issued.`,
      referenceId: recordId,
      referenceType: getRecordReferenceType(recordType),
    });
  } else if (Object.keys(allowedUpdates).length > 2) {
    await notifyPatientAboutRecord(existing.user_id, {
      type: 'record_updated',
      title: 'Record Details Updated',
      message: `The clinical details of your ${getRecordLabel(recordType)}${dateContext} have been updated by the staff.`,
      referenceId: recordId,
      referenceType: getRecordReferenceType(recordType),
    });
  }

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public: archive a record (soft delete)
// Always notifies the patient.
// ─────────────────────────────────────────────────────────────────────────────

exports.archiveRecord = async (recordId, recordType) => {
  if (!recordId) throw new Error('recordId is required for archiveRecord');

  const table = getRecordTable(recordType);

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }

  const { data, error } = await supabase
    .from(table)
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;

  const label = getRecordLabel(recordType);

  await notifyPatientAboutRecord(existing.user_id, {
    type: 'record_archived',
    title: 'Record Archived',
    message: `Your ${label} has been archived.`,
    referenceId: recordId,
    referenceType: getRecordReferenceType(recordType),
  });

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility export
// ─────────────────────────────────────────────────────────────────────────────

exports.shortenCourse = shortenCourse;