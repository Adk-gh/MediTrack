// C:\Users\HP\MediTrack\features\examinations\examinations.service.js
const supabase = require('../../configs/database');

// 1. Fetch from the actual medical_records table
exports.getMedicalExaminations = async () => {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// 2. Fetch from the actual dental_records table
exports.getDentalExaminations = async () => {
  const { data, error } = await supabase
    .from('dental_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// 3. Fallback: Combine both for the general "/" route to prevent crashes
exports.getAllExaminations = async () => {
  const [medical, dental] = await Promise.all([
    supabase.from('medical_records').select('*'),
    supabase.from('dental_records').select('*')
  ]);

  if (medical.error) throw medical.error;
  if (dental.error) throw dental.error;

  // Combine them and inject a 'type' property so the frontend can tell them apart
  const combined = [
    ...(medical.data || []).map(m => ({ ...m, type: 'medical' })),
    ...(dental.data || []).map(d => ({ ...d, type: 'dental' }))
  ];

  // Sort the combined array by date (newest first)
  return combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// --- CRUD Operations (You will need to update these later based on which table you are saving to) ---
exports.getExaminationById = async (id) => {
  // Note: To make this work properly in the future, you'll need to check both tables
  // or pass the record type from the frontend. For now, we will leave it pointing to the empty table to avoid crashes.
  const { data, error } = await supabase.from('examinations').select('*').eq('id', id).single();
  if (error || !data) {
    const err = new Error('Examination not found');
    err.statusCode = 404;
    throw err;
  }
  return data;
};

exports.createExamination = async (data) => {
  const { data: examination, error } = await supabase.from('examinations').insert(data).select().single();
  if (error) throw error;
  return examination;
};

exports.updateExamination = async (id, data) => {
  const { error } = await supabase.from('examinations').update(data).eq('id', id);
  if (error) throw error;
  return { id, ...data };
};

exports.deleteExamination = async (id) => {
  const { error } = await supabase.from('examinations').delete().eq('id', id);
  if (error) throw error;
  return { id };
};