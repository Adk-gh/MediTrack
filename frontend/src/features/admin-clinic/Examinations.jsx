// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examinations.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';

const normalizePatient = (uid, d) => {
  // Handle both camelCase (cached) and snake_case (Supabase direct)
  const firstName     = d.firstName    || d.first_name    || '';
  const lastName      = d.lastName     || d.last_name     || '';
  const middleName = d.middleName || d.middle_name   || '';
  const suffix        = d.suffix       || '';
  const universityId  = d.universityId || d.university_id || d.studentId || d.student_id || '';

  const name = lastName
    ? `${lastName}, ${firstName} ${middleName} ${suffix}`.trim()
    : firstName || '—';

  return {
    uid, name, firstName, lastName, middleName, suffix,
    id:             universityId || uid,
    universityId,
    studentId:      d.studentId  || d.student_id  || universityId || '',
    role:           d.role       || '',
    prog:           d.program    || d.course       || '',
    program:        d.program    || d.course       || '',
    year:           d.yearLevel  || d.year_level   || '',
    yearLevel:      d.yearLevel  || d.year_level   || '',
    section:        d.section    || '',
    age:            d.age        || '',
    gender:         d.gender     || d.sex          || '',
    sex:            d.gender     || d.sex          || '',
    birthdate:      d.birthday   || d.birthdate    || '',
    birthday:       d.birthday   || d.birthdate    || '',
    email:          d.email      || '',
    phoneNumber:    d.phoneNumber || d.phone_number || d.contact_no || '',
    department:     d.department || '',
    jobTitle:       d.jobTitle   || d.job_title    || '',
    classification: d.classification || '',
    homeAddress:    d.homeAddress || d.home_address || d.address || '',
    religion:       d.religion   || '',
    nationality:    d.nationality || '',
    civilStatus:    d.civilStatus || d.civil_status || '',
    bloodType:      d.bloodType  || d.blood_type   || '',
    emergencyContact: d.emergencyContact || d.emergency_contact || {
      name: '', relationship: '', phone: '', address: ''
    },
    vaccinations: d.vaccinations || {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  };
};

// Added currentUserRole prop (defaults to 'sysadmin' so everything shows if not provided)
export const Examinations = ({ currentUserRole = 'sysadmin' }) => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const patientId      = searchParams.get('patientId');

  // Dynamically determine available tabs based on role
  const availableTabs = useMemo(() => {
    const role = String(currentUserRole).toLowerCase();

    if (role === 'dentist') {
      return [{ key: 'dental', icon: 'fa-tooth', label: 'Dental Examination' }];
    }
    if (role === 'nurse' || role === 'doctor') {
      return [{ key: 'medical', icon: 'fa-stethoscope', label: 'Medical Examination' }];
    }

    // Default (e.g., admin) sees both
    return [
      { key: 'medical', icon: 'fa-stethoscope', label: 'Medical Examination' },
      { key: 'dental',  icon: 'fa-tooth',       label: 'Dental Examination' },
    ];
  }, [currentUserRole]);

  // Initialize state based on the first available tab for this user's role
  const [examTab, setExamTab]                 = useState(availableTabs[0].key);

  const [message, setMessage]                 = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [examStarted, setExamStarted]         = useState(false);
  const [resetKey, setResetKey]               = useState(0);

  // If the available tabs change (e.g. user role switches), ensure the active tab is valid
  useEffect(() => {
    if (!availableTabs.find(t => t.key === examTab)) {
      setExamTab(availableTabs[0].key);
    }
  }, [availableTabs, examTab]);

  useEffect(() => {
    const fetchPatient = async () => {
      setLoading(true);
      setExamStarted(false);
      setResetKey(k => k + 1);

      if (patientId) {
        try {
          // Try to find by id (UUID) or university_id
          let { data, error } = await supabase.from('users').select('*').eq('id', patientId).single();

          if (error || !data) {
            // Try by university_id
            ({ data, error } = await supabase.from('users').select('*').eq('university_id', patientId).single());
          }

          if (data) {
            setSelectedPatient(normalizePatient(patientId, data));
            setExamStarted(true);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('[Examinations] Supabase fetch error:', err);
        }

        // Only fall back to localStorage if we had a patientId but Supabase failed
        const cached = localStorage.getItem('selectedPatient');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setSelectedPatient(normalizePatient(parsed.uid || patientId || '', parsed._raw || parsed));
            setExamStarted(true);
          } catch { /* corrupted — ignore */ }
        }
      }

      // No patientId → stay blank, clear any stale patient
      setSelectedPatient(null);
      setLoading(false);
    };

    fetchPatient();
  }, [patientId]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExamSubmitted = (msg) => {
    showMessage(msg);
    setExamStarted(false);
    setResetKey(k => k + 1);
  };

  const handleTabChange = (key) => {
    setExamTab(key);
  };

  const handleBack = () => {
    setExamStarted(false);
    setResetKey(k => k + 1);
    localStorage.removeItem('selectedPatient');
    navigate('/records');
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] bg-white">
        <div className="text-center text-slate-400">
          <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block text-[#466460]"></i>
          <p className="text-sm font-semibold">Loading patient data…</p>
        </div>
      </div>
    );
  }

  // ── No patient selected at all ────────────────────────────────────────────
  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] bg-white gap-4">
        <i className="fa-regular fa-user-circle text-slate-200 text-6xl"></i>
        <p className="text-slate-400 text-sm">No patient selected.</p>
        <button
          onClick={() => navigate('/records')}
          className="bg-[#466460] text-white px-5 py-2 rounded-full text-xs font-bold hover:opacity-90 transition"
        >
          ← Back to Records
        </button>
      </div>
    );
  }

  // ── No exam started yet — blank prompt (NO patient banner) ────────────────
  if (!examStarted) {
    return (
      <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

        {/* Tabs (visible but inactive) */}
        <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
          {availableTabs.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setExamTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold relative ${examTab === key ? 'text-[#466460]' : 'text-slate-500'}`}
            >
              <i className={`fa-solid ${icon} mr-2`}></i>{label}
              {examTab === key && (
                <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>
              )}
            </button>
          ))}
        </div>

        {/* Blank prompt */}
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-20 h-20 rounded-full bg-[#e0eceb] flex items-center justify-center">
            <i className={`fa-solid ${examTab === 'medical' ? 'fa-stethoscope' : 'fa-tooth'} text-3xl text-[#466460]`}></i>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-base">
              {examTab === 'medical' ? 'Medical Examination' : 'Dental Examination'} is ready to begin.
            </p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs">
              Select a patient from Records to begin a new examination.
            </p>
          </div>
          <button
            onClick={() => navigate('/records')}
            className="flex items-center gap-2 bg-[#466460] text-white px-7 py-3 rounded-xl font-bold text-sm hover:bg-[#3a524f] transition shadow-sm"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Go to Records
          </button>
        </div>

      </div>
    );
  }

  // ── Exam in progress — show banner + form ─────────────────────────────────
  return (
    <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

      {/* Header Section: Back Button + Compact Patient Banner */}
      <div className="flex items-center gap-3 mb-6">

        {/* Inline Back button (Icon only) */}
        <button
          onClick={handleBack}
          title="Back to Records"
          className="flex items-center justify-center w-9 h-9 rounded-full text-slate-500 hover:text-[#466460] hover:bg-[#e0eceb] transition-colors shrink-0"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>

        {/* Patient banner — Compact */}
        <div className="flex-1 bg-gradient-to-r from-[#e0eceb] to-white rounded-xl px-4 py-2 border border-[#d1e7e5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#466460] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-user text-white text-sm"></i>
          </div>

          <div>
            <p className="font-bold text-sm text-slate-800 leading-tight">{selectedPatient.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedPatient.id}
              {selectedPatient.department ? ` • ${selectedPatient.department}` : ''}
              {selectedPatient.prog       ? ` • ${selectedPatient.prog}`       : ''}
              {selectedPatient.year       ? ` ${selectedPatient.year}`         : ''}
            </p>
          </div>

          <div className="ml-auto flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#466460] text-white capitalize">
              {selectedPatient.role || 'student'}
            </span>
            {selectedPatient.gender && (
              <span className="text-[10px] text-slate-500">{selectedPatient.gender} · Age {selectedPatient.age || '—'}</span>
            )}
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
        {availableTabs.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-5 py-2.5 text-sm font-semibold relative ${examTab === key ? 'text-[#466460]' : 'text-slate-500'}`}
          >
            <i className={`fa-solid ${icon} mr-2`}></i>{label}
            {examTab === key && (
              <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>
            )}
          </button>
        ))}
      </div>

      {/* Form */}
      {examTab === 'medical' && (
        <Medical
          key={`medical-${resetKey}`}
          selectedPatient={selectedPatient}
          showMessage={handleExamSubmitted}
        />
      )}
      {examTab === 'dental' && (
        <Dental
          key={`dental-${resetKey}`}
          selectedPatient={selectedPatient}
          showMessage={handleExamSubmitted}
        />
      )}

      {/* Toast */}
      {message && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-lg font-bold animate-[fadeIn_0.3s_ease-out] z-50">
          <i className="fa-solid fa-circle-check mr-2"></i>{message}
        </div>
      )}

    </div>
  );
};

export default Examinations;