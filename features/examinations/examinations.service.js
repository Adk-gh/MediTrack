// C:\Users\HP\MediTrack\features\examinations\examinations.service.js

const supabase = require('../../configs/database');

const TABLES = {
  medical: 'medical_records',
  dental: 'dental_records',
};

const getTable = (type) => {
  const normalized = String(type || '')
    .trim()
    .toLowerCase();

  const table = TABLES[normalized];

  if (!table) {
    const error = new Error(
      'Invalid examination type. Use medical or dental.'
    );
    error.statusCode = 400;
    throw error;
  }

  return table;
};

const sanitizePayload = (payload = {}) => {
  const clean = { ...payload };

  // Never allow the frontend to replace the primary key through update payloads.
  delete clean.id;

  // Frontend-only helper fields that do not belong in the database.
  delete clean.type;
  delete clean.recordType;
  delete clean.record_type;
  delete clean.examinationType;
  delete clean.examination_type;

  return clean;
};

const throwNotFound = (type, id) => {
  const error = new Error(
    `${type === 'dental' ? 'Dental' : 'Medical'} examination not found: ${id}`
  );
  error.statusCode = 404;
  throw error;
};

// ============================================================
// READ
// ============================================================

exports.getMedicalExaminations = async () => {
  const { data, error } = await supabase
    .from(TABLES.medical)
    .select('*')
    .eq('is_archived', false)
    .order('created_at', {
      ascending: false,
    });

  if (error) throw error;

  return data || [];
};

exports.getDentalExaminations = async () => {
  const { data, error } = await supabase
    .from(TABLES.dental)
    .select('*')
    .eq('is_archived', false)
    .order('created_at', {
      ascending: false,
    });

  if (error) throw error;

  return data || [];
};

exports.getAllExaminations = async () => {
  const [medical, dental] =
    await Promise.all([
      supabase
        .from(TABLES.medical)
        .select('*')
        .eq('is_archived', false),

      supabase
        .from(TABLES.dental)
        .select('*')
        .eq('is_archived', false),
    ]);

  if (medical.error) {
    throw medical.error;
  }

  if (dental.error) {
    throw dental.error;
  }

  const combined = [
    ...(medical.data || []).map(
      (record) => ({
        ...record,
        type: 'medical',
      })
    ),

    ...(dental.data || []).map(
      (record) => ({
        ...record,
        type: 'dental',
      })
    ),
  ];

  return combined.sort(
    (a, b) =>
      new Date(b.created_at || 0) -
      new Date(a.created_at || 0)
  );
};

exports.getTypedExaminationById =
  async (type, id) => {
    const table = getTable(type);

    const { data, error } =
      await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('is_archived', false)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
      throwNotFound(type, id);
    }

    return {
      ...data,
      type,
    };
  };

exports.getExaminationById = async (id) => {
  const medical =
    await supabase
      .from(TABLES.medical)
      .select('*')
      .eq('id', id)
      .eq('is_archived', false)
      .maybeSingle();

  if (medical.error) {
    throw medical.error;
  }

  if (medical.data) {
    return {
      ...medical.data,
      type: 'medical',
    };
  }

  const dental =
    await supabase
      .from(TABLES.dental)
      .select('*')
      .eq('id', id)
      .eq('is_archived', false)
      .maybeSingle();

  if (dental.error) {
    throw dental.error;
  }

  if (dental.data) {
    return {
      ...dental.data,
      type: 'dental',
    };
  }

  const error = new Error(
    'Examination not found'
  );
  error.statusCode = 404;
  throw error;
};

// ============================================================
// CREATE / SUBMIT
// ============================================================

exports.createExamination = async (
  type,
  payload
) => {
  const table = getTable(type);

  const insertPayload = {
    ...sanitizePayload(payload),
    status:
      payload?.status || 'pending',
    is_approved:
      payload?.is_approved ?? false,
    is_archived:
      payload?.is_archived ?? false,
  };

  const { data, error } =
    await supabase
      .from(table)
      .insert(insertPayload)
      .select()
      .single();

  if (error) throw error;

  return {
    ...data,
    type,
  };
};

// ============================================================
// UPDATE
// ============================================================

exports.updateExamination = async (
  type,
  id,
  payload
) => {
  const table = getTable(type);

  const updatePayload =
    sanitizePayload(payload);

  const { data, error } =
    await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)
      .eq('is_archived', false)
      .select()
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    throwNotFound(type, id);
  }

  return {
    ...data,
    type,
  };
};

// ============================================================
// APPROVE
// ============================================================

exports.approveExamination = async (
  type,
  id,
  payload = {}
) => {
  const table = getTable(type);

  const now =
    new Date().toISOString();

  const updatePayload = {
    ...sanitizePayload(payload),

    status: 'approved',
    is_approved: true,

    // Keep an existing approval timestamp if one was supplied;
    // otherwise record the current approval time.
    approved_at:
      payload?.approved_at || now,
  };

  const { data, error } =
    await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)
      .eq('is_archived', false)
      .select()
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    throwNotFound(type, id);
  }

  return {
    ...data,
    type,
  };
};

// ============================================================
// ISSUE CERTIFICATE
// ============================================================

exports.issueCertificate = async (
  type,
  id,
  payload = {}
) => {
  const table = getTable(type);

  const current =
    await exports.getTypedExaminationById(
      type,
      id
    );

  const updatePayload = {
    ...sanitizePayload(payload),

    // Certificates are only issued from an approved examination.
    status: 'approved',
    is_approved: true,

    approved_at:
      current.approved_at ||
      payload?.approved_at ||
      new Date().toISOString(),

    issue_cert: true,

    // A fulfilled request should no longer remain pending.
    cert_requested: false,
  };

  const { data, error } =
    await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)
      .eq('is_archived', false)
      .select()
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    throwNotFound(type, id);
  }

  return {
    ...data,
    type,
  };
};

// ============================================================
// ARCHIVE
// ============================================================

exports.archiveExamination = async (
  type,
  id,
  deletedBy = null
) => {
  const table = getTable(type);

  const { data, error } =
    await supabase
      .from(table)
      .update({
        is_archived: true,
        deleted_by:
          deletedBy || null,
      })
      .eq('id', id)
      .eq('is_archived', false)
      .select()
      .maybeSingle();

  if (error) throw error;

  if (!data) {
    throwNotFound(type, id);
  }

  return {
    ...data,
    type,
  };
};
