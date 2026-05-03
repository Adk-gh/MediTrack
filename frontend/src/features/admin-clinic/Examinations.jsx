// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examinations.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';

// ── Normalize a Firestore user doc into the shape Medical/Dental expect ───────
const normalizePatient = (uid, d) => {
  const firstName     = d.firstName    || '';
  const lastName      = d.lastName     || '';
  const middleInitial = d.middleInitial || '';
  const suffix        = d.suffix       || '';

  // "Surname, Firstname MI." — matches what Medical/Dental split on ", "
  const name = lastName
    ? `${lastName}, ${firstName}${middleInitial ? ` ${middleInitial}.` : ''}${suffix ? ` ${suffix}` : ''}`.trim()
    : firstName || '—';

  return {
    uid,
    name,
    firstName,
    lastName,
    middleInitial,
    suffix,

    // University / student ID shown on the form
    id:           d.universityId   || d.studentId || uid,
    universityId: d.universityId   || d.studentId || uid,
    studentId:    d.studentId      || d.universityId || '',

    role:         d.role           || '',
    prog:         d.program        || d.course    || '',
    program:      d.program        || d.course    || '',
    year:         d.yearLevel      || '',
    yearLevel:    d.yearLevel      || '',
    section:      d.section        || '',

    // Demographics
    age:          d.age            || '',
    gender:       d.gender         || d.sex       || '',
    sex:          d.gender         || d.sex       || '',
    birthdate:    d.birthday       || '',
    birthday:     d.birthday       || '',

    // Contact
    email:        d.email          || '',
    phoneNumber:  d.phoneNumber    || '',

    // Academic / Work
    department:   d.department     || '',
    jobTitle:     d.jobTitle       || '',
    classification: d.classification || '',

    // Address / personal
    homeAddress:  d.homeAddress    || '',
    religion:     d.religion       || '',
    nationality:  d.nationality    || '',
    civilStatus:  d.civilStatus    || '',
    bloodType:    d.bloodType      || '',

    // Emergency contact — passed straight to the Medical form
    emergencyContact: d.emergencyContact || {
      name: '', relationship: '', phone: '', address: '',
    },

    // Vaccinations — passed straight to the Medical form
    vaccinations: d.vaccinations || {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
export const Examinations = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const patientId       = searchParams.get('patientId'); // Firestore UID

  const [examTab, setExamTab]             = useState('medical');
  const [message, setMessage]             = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading]             = useState(true);

  // ── Fetch patient from Firestore (or fall back to localStorage cache) ─────
  useEffect(() => {
    const fetchPatient = async () => {
      setLoading(true);

      // 1. Try Firestore first (authoritative)
      if (patientId) {
        try {
          const snap = await getDoc(doc(db, 'users', patientId));
          if (snap.exists()) {
            setSelectedPatient(normalizePatient(patientId, snap.data()));
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('[Examinations] Firestore fetch error:', err);
        }
      }

      // 2. Fall back to localStorage cache set by Records.jsx
      const cached = localStorage.getItem('selectedPatient');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Re-normalize in case the cached shape differs
          setSelectedPatient(normalizePatient(parsed.uid || patientId || '', parsed._raw || parsed));
        } catch {
          // cache is corrupted — ignore
        }
      }

      setLoading(false);
    };

    fetchPatient();
  }, [patientId]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
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

  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] bg-white gap-4">
        <i className="fa-regular fa-user-circle text-slate-200 text-6xl"></i>
        <p className="text-slate-400 text-sm">No patient selected.</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-[#466460] text-white px-5 py-2 rounded-full text-xs font-bold hover:opacity-90 transition"
        >
          ← Back to Records
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#466460] mb-5 transition-colors"
      >
        <i className="fa-solid fa-arrow-left"></i> Back to Records
      </button>

      {/* Patient banner */}
      <div className="bg-gradient-to-r from-[#e0eceb] to-white rounded-xl px-5 py-4 mb-6 border border-[#d1e7e5] flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[#466460] flex items-center justify-center shrink-0">
          <i className="fa-solid fa-user text-white text-base"></i>
        </div>
        <div>
          <p className="font-bold text-base text-slate-800 leading-tight">{selectedPatient.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {selectedPatient.id}
            {selectedPatient.department ? ` • ${selectedPatient.department}` : ''}
            {selectedPatient.prog       ? ` • ${selectedPatient.prog}`       : ''}
            {selectedPatient.year       ? ` ${selectedPatient.year}`         : ''}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#466460] text-white capitalize">
            {selectedPatient.role || 'student'}
          </span>
          {selectedPatient.gender && (
            <span className="text-[10px] text-slate-500">{selectedPatient.gender} · Age {selectedPatient.age || '—'}</span>
          )}
        </div>
      </div>

      {/* Exam Subtabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
        <button
          onClick={() => setExamTab('medical')}
          className={`px-5 py-2.5 text-sm font-semibold relative ${examTab === 'medical' ? 'text-[#466460]' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-stethoscope mr-2"></i>Medical Examination
          {examTab === 'medical' && (
            <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>
          )}
        </button>
        <button
          onClick={() => setExamTab('dental')}
          className={`px-5 py-2.5 text-sm font-semibold relative ${examTab === 'dental' ? 'text-[#466460]' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-tooth mr-2"></i>Dental Record
          {examTab === 'dental' && (
            <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {examTab === 'medical' && (
        <Medical selectedPatient={selectedPatient} showMessage={showMessage} />
      )}
      {examTab === 'dental' && (
        <Dental selectedPatient={selectedPatient} showMessage={showMessage} />
      )}

      {/* Success Toast */}
      {message && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-lg font-bold animate-[fadeIn_0.3s_ease-out] z-50">
          <i className="fa-solid fa-circle-check mr-2"></i>{message}
        </div>
      )}

    </div>
  );
};

export default Examinations;