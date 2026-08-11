// routes/consultations.js
const express = require('express');
const router = express.Router();
const { verifyAppointmentWindow } = require('../utils/appointmentValidator');
const { supabase } = require('../config/supabase');

// ── Create a new consultation ──────────────────────────────────────────
router.post('/', async (req, res) => {
  const { patient_id, consultation_type, patient_name, patient_role } = req.body;

  // Validate time window before creating the room
  const access = await verifyAppointmentWindow(patient_id, consultation_type);
  if (!access.allowed) {
    return res.status(403).json({ success: false, message: access.message });
  }

  try {
    const { data, error } = await supabase
      .from('consultations')
      .insert({
        patient_id,
        patient_name,
        patient_role,
        consultation_type,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ── Reactivate an existing consultation ────────────────────────────────
router.put('/:id/reactivate', async (req, res) => {
  const roomId = req.params.id;

  // First, fetch the room to know who it belongs to and what type it is
  const { data: room, error: roomError } = await supabase
    .from('consultations')
    .select('patient_id, consultation_type')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    return res.status(404).json({ success: false, message: 'Consultation not found.' });
  }

  // Validate time window before reactivating
  const access = await verifyAppointmentWindow(room.patient_id, room.consultation_type);
  if (!access.allowed) {
    return res.status(403).json({ success: false, message: access.message });
  }

  try {
    const { data, error } = await supabase
      .from('consultations')
      .update({ status: 'active' })
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

module.exports = router;