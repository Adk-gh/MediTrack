// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examinations.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';

const normalizePatient = (uid, d) => {
  const firstName     = d.firstName    || '';
  const lastName      = d.lastName     || '';
  const middleInitial = d.middleInitial || '';
  const suffix        = d.suffix       || '';
  const name = lastName
    ? `${lastName}, ${firstName}${middleInitial ? ` ${middleInitial}.` : ''}${suffix ? ` ${suffix}` : ''}`.trim()
    : firstName || '—';
  return {
    uid, name, firstName, lastName, middleInitial, suffix,
    id:             d.universityId     || d.studentId || uid,
    universityId:   d.universityId     || d.studentId || uid,
    studentId:      d.studentId        || d.universityId || '',
    role:           d.role             || '',
    prog:           d.program          || d.course    || '',
    program:        d.program          || d.course    || '',
    year:           d.yearLevel        || '',
    yearLevel:      d.yearLevel        || '',
    section:        d.section          || '',
    age:            d.age              || '',
    gender:         d.gender           || d.sex       || '',
    sex:            d.gender           || d.sex       || '',
    birthdate:      d.birthday         || '',
    birthday:       d.birthday         || '',
    email:          d.email            || '',
    phoneNumber:    d.phoneNumber      || '',
    department:     d.department       || '',
    jobTitle:       d.jobTitle         || '',
    classification: d.classification   || '',
    homeAddress:    d.homeAddress      || '',
    religion:       d.religion         || '',
    nationality:    d.nationality      || '',
    civilStatus:    d.civilStatus      || '',
    bloodType:      d.bloodType        || '',
    emergencyContact: d.emergencyContact || { name: '', relationship: '', phone: '', address: '' },
    vaccinations: d.vaccinations || {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  };
};

export const Examinations = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const patientId      = searchParams.get('patientId');

  const [examTab, setExamTab]                 = useState('medical');
  const [message, setMessage]                 = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [examStarted, setExamStarted]         = useState(false);
  const [resetKey, setResetKey]               = useState(0);

useEffect(() => {
  const fetchPatient = async () => {
    setLoading(true);
    setExamStarted(false);
    setResetKey(k => k + 1);

    if (patientId) {
      try {
        const snap = await getDoc(doc(db, 'users', patientId));
        if (snap.exists()) {
          setSelectedPatient(normalizePatient(patientId, snap.data()));
          setExamStarted(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('[Examinations] Firestore fetch error:', err);
      }

      // Only fall back to localStorage if we had a patientId but Firestore failed
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
  localStorage.removeItem('selectedPatient'); // ← clear cache so tab nav stays blank
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
          {[
            { key: 'medical', icon: 'fa-stethoscope', label: 'Medical Examination' },
            { key: 'dental',  icon: 'fa-tooth',       label: 'Dental Record'       },
          ].map(({ key, icon, label }) => (
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
              {examTab === 'medical' ? 'Medical Examination' : 'Dental Record'}
            </p>
            <p className="text-slate-400 text-sm mt-1 max-w-xs">
              Select a patient from Records to begin a new examination.
            </p>
          </div>
          {/* Redirects to Records tab instead of opening the form */}
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

      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#466460] mb-5 transition-colors"
      >
        <i className="fa-solid fa-arrow-left"></i> Back to Records
      </button>

      {/* Patient banner — only shown when exam is active */}
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
        {[
          { key: 'medical', icon: 'fa-stethoscope', label: 'Medical Examination' },
          { key: 'dental',  icon: 'fa-tooth',       label: 'Dental Record'       },
        ].map(({ key, icon, label }) => (
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