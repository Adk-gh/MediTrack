// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Examinations.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';

/**
 * Normalize patient data from either:
 * - Supabase snake_case fields
 * - Cached camelCase fields
 */
const normalizePatient = (uid, d = {}) => {
  const firstName =
    d.firstName ||
    d.first_name ||
    '';

  const lastName =
    d.lastName ||
    d.last_name ||
    '';

  const middleName =
    d.middleName ||
    d.middle_name ||
    '';

  const suffix =
    d.suffix ||
    '';

  const universityId =
    d.universityId ||
    d.university_id ||
    d.studentId ||
    d.student_id ||
    '';

  const nameParts = [
    firstName,
    middleName,
    suffix,
  ].filter(Boolean);

  const name = lastName
    ? `${lastName}, ${nameParts.join(' ')}`
    : firstName || '—';

  return {
    uid,

    name,

    firstName,
    lastName,
    middleName,
    suffix,

    id:
      d.id ||
      d.university_id ||
      d.universityId ||
      uid,

    universityId,

    studentId:
      d.studentId ||
      d.student_id ||
      d.university_id ||
      d.universityId ||
      '',

    role:
      d.role ||
      '',

    prog:
      d.program ||
      d.course ||
      '',

    program:
      d.program ||
      d.course ||
      '',

    year:
      d.yearLevel ||
      d.year_level ||
      '',

    yearLevel:
      d.yearLevel ||
      d.year_level ||
      '',

    section:
      d.section ||
      '',

    age:
      d.age ||
      '',

    gender:
      d.gender ||
      d.sex ||
      '',

    sex:
      d.gender ||
      d.sex ||
      '',

    birthdate:
      d.birthday ||
      d.birthdate ||
      '',

    birthday:
      d.birthday ||
      d.birthdate ||
      '',

    email:
      d.email ||
      '',

    phoneNumber:
      d.phoneNumber ||
      d.phone_number ||
      d.contact_no ||
      '',

    department:
      d.department ||
      '',

    jobTitle:
      d.jobTitle ||
      d.job_title ||
      '',

    classification:
      d.classification ||
      '',

    homeAddress:
      d.homeAddress ||
      d.home_address ||
      d.address ||
      '',

    religion:
      d.religion ||
      '',

    nationality:
      d.nationality ||
      '',

    civilStatus:
      d.civilStatus ||
      d.civil_status ||
      '',

    bloodType:
      d.bloodType ||
      d.blood_type ||
      '',

    emergencyContact:
      d.emergencyContact ||
      d.emergency_contact || {
        name: '',
        relationship: '',
        phone: '',
        address: '',
      },

    vaccinations:
      d.vaccinations || {
        dose1: {
          vaccineName: '',
          date: '',
        },
        dose2: {
          vaccineName: '',
          date: '',
        },
        booster1: {
          vaccineName: '',
          date: '',
        },
        booster2: {
          vaccineName: '',
          date: '',
        },
      },

    dentalHistory:
      d.dentalHistory ||
      d.dental_history ||
      {},
  };
};

export const Examinations = ({
  currentUserRole = 'sysadmin',
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const patientId = searchParams.get('patientId');

  /**
   * Determine which examination tabs the current role can access.
   */
  const availableTabs = useMemo(() => {
    const role = String(currentUserRole || '').toLowerCase();

    if (role === 'dentist') {
      return [
        {
          key: 'dental',
          icon: 'fa-tooth',
          label: 'Dental Examination',
        },
      ];
    }

    if (role === 'nurse' || role === 'doctor') {
      return [
        {
          key: 'medical',
          icon: 'fa-stethoscope',
          label: 'Medical Examination',
        },
      ];
    }

    // Admin / Sysadmin / other roles
    return [
      {
        key: 'medical',
        icon: 'fa-stethoscope',
        label: 'Medical Examination',
      },
      {
        key: 'dental',
        icon: 'fa-tooth',
        label: 'Dental Examination',
      },
    ];
  }, [currentUserRole]);

  const [examTab, setExamTab] = useState(
    availableTabs[0]?.key || 'medical'
  );

  const [message, setMessage] = useState(null);

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [examStarted, setExamStarted] =
    useState(false);

  const [resetKey, setResetKey] = useState(0);

  /**
   * Keep active tab valid if the user's role changes.
   */
  useEffect(() => {
    const tabStillAvailable = availableTabs.some(
      (tab) => tab.key === examTab
    );

    if (!tabStillAvailable && availableTabs.length > 0) {
      setExamTab(availableTabs[0].key);
    }
  }, [availableTabs, examTab]);

  /**
   * Fetch the selected patient.
   *
   * Priority:
   * 1. Supabase UUID
   * 2. Supabase university_id
   * 3. localStorage selectedPatient
   */
  useEffect(() => {
    let cancelled = false;

    const fetchPatient = async () => {
      setLoading(true);
      setExamStarted(false);

      if (!patientId) {
        if (!cancelled) {
          setSelectedPatient(null);
          setLoading(false);
        }

        return;
      }

      let patient = null;

      try {
        console.log(
          '[Examinations] Fetching patient:',
          patientId
        );

        /**
         * -----------------------------------------
         * 1. Try UUID / primary ID
         * -----------------------------------------
         */
        const byId = await supabase
          .from('users')
          .select('*')
          .eq('id', patientId)
          .maybeSingle();

        if (byId.data) {
          patient = byId.data;

          console.log(
            '[Examinations] Patient found by UUID:',
            patient
          );
        }

        /**
         * -----------------------------------------
         * 2. Try university_id
         * -----------------------------------------
         */
        if (!patient) {
          const byUniversityId = await supabase
            .from('users')
            .select('*')
            .eq('university_id', patientId)
            .maybeSingle();

          if (byUniversityId.data) {
            patient = byUniversityId.data;

            console.log(
              '[Examinations] Patient found by university_id:',
              patient
            );
          }
        }
      } catch (error) {
        console.error(
          '[Examinations] Supabase fetch error:',
          error
        );
      }

      /**
       * -----------------------------------------
       * If Supabase found the patient
       * -----------------------------------------
       */
      if (patient) {
        if (!cancelled) {
          setSelectedPatient(
            normalizePatient(
              patient.id || patientId,
              patient
            )
          );

          setExamStarted(true);
          setLoading(false);
        }

        return;
      }

      /**
       * -----------------------------------------
       * 3. localStorage fallback
       * -----------------------------------------
       */
      try {
        const cached =
          localStorage.getItem('selectedPatient');

        if (cached) {
          const parsed = JSON.parse(cached);

          /**
           * Some parts of MediTrack store the actual
           * patient object inside `_raw`.
           */
          const patientData =
            parsed?._raw || parsed;

          /**
           * Make sure the cached patient actually
           * corresponds to the patientId in the URL.
           *
           * We accept either:
           * - uid
           * - id
           * - universityId
           * - university_id
           * - studentId
           * - student_id
           */
          const cachedIds = [
            parsed?.uid,
            parsed?.id,
            parsed?.universityId,
            parsed?.university_id,
            parsed?.studentId,
            parsed?.student_id,

            patientData?.uid,
            patientData?.id,
            patientData?.universityId,
            patientData?.university_id,
            patientData?.studentId,
            patientData?.student_id,
          ]
            .filter(Boolean)
            .map(String);

          const matchesPatient =
            cachedIds.length === 0 ||
            cachedIds.includes(String(patientId));

          if (matchesPatient) {
            console.log(
              '[Examinations] Patient loaded from localStorage:',
              patientData
            );

            if (!cancelled) {
              setSelectedPatient(
                normalizePatient(
                  parsed?.uid ||
                    patientData?.id ||
                    patientId,
                  patientData
                )
              );

              setExamStarted(true);
              setLoading(false);
            }

            return;
          }

          console.warn(
            '[Examinations] Cached patient does not match patientId:',
            {
              patientId,
              cachedIds,
            }
          );
        }
      } catch (error) {
        console.error(
          '[Examinations] Failed to parse cached patient:',
          error
        );
      }

      /**
       * -----------------------------------------
       * No patient found anywhere
       * -----------------------------------------
       */
      if (!cancelled) {
        setSelectedPatient(null);
        setExamStarted(false);
        setLoading(false);
      }
    };

    fetchPatient();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  /**
   * Show toast message.
   */
  const showMessage = (msg) => {
    setMessage(msg);

    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  /**
   * Called after Medical / Dental examination
   * has been submitted successfully.
   */
  const handleExamSubmitted = (msg) => {
    showMessage(msg);

    setExamStarted(false);

    setResetKey((key) => key + 1);
  };

  /**
   * Switch examination tab.
   */
  const handleTabChange = (key) => {
    setExamTab(key);
  };

  /**
   * Return to Records.
   */
  const handleBack = () => {
    setExamStarted(false);
    setResetKey((key) => key + 1);

    localStorage.removeItem('selectedPatient');

    navigate('/records');
  };

  /**
   * -----------------------------------------
   * Loading
   * -----------------------------------------
   */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-140px)] bg-white">
        <div className="text-center text-slate-400">
          <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block text-[#466460]"></i>

          <p className="text-sm font-semibold">
            Loading patient data…
          </p>
        </div>
      </div>
    );
  }

  /**
   * -----------------------------------------
   * No patient selected
   * -----------------------------------------
   */
  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] bg-white gap-4">
        <i className="fa-regular fa-user-circle text-slate-200 text-6xl"></i>

        <p className="text-slate-400 text-sm">
          No patient selected.
        </p>

        <button
          onClick={() => navigate('/records')}
          className="bg-[#466460] text-white px-5 py-2 rounded-full text-xs font-bold hover:opacity-90 transition"
        >
          ← Back to Records
        </button>
      </div>
    );
  }

  /**
   * -----------------------------------------
   * Patient exists but examination isn't started
   * -----------------------------------------
   */
  if (!examStarted) {
    return (
      <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
          {availableTabs.map(
            ({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setExamTab(key)}
                className={`px-5 py-2.5 text-sm font-semibold relative ${
                  examTab === key
                    ? 'text-[#466460]'
                    : 'text-slate-500'
                }`}
              >
                <i
                  className={`fa-solid ${icon} mr-2`}
                ></i>

                {label}

                {examTab === key && (
                  <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>
                )}
              </button>
            )
          )}
        </div>

        {/* Blank prompt */}
        <div className="flex flex-col items-center justify-center py-24 gap-5">

          <div className="w-20 h-20 rounded-full bg-[#e0eceb] flex items-center justify-center">
            <i
              className={`fa-solid ${
                examTab === 'medical'
                  ? 'fa-stethoscope'
                  : 'fa-tooth'
              } text-3xl text-[#466460]`}
            ></i>
          </div>

          <div className="text-center">
            <p className="font-bold text-slate-700 text-base">
              {examTab === 'medical'
                ? 'Medical Examination'
                : 'Dental Examination'}{' '}
              is ready to begin.
            </p>

            <p className="text-slate-400 text-sm mt-1 max-w-xs">
              Select a patient from Records to begin a
              new examination.
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

  /**
   * -----------------------------------------
   * Examination in progress
   * -----------------------------------------
   */
  return (
    <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">

        {/* Back button */}
        <button
          onClick={handleBack}
          title="Back to Records"
          className="flex items-center justify-center w-9 h-9 rounded-full text-slate-500 hover:text-[#466460] hover:bg-[#e0eceb] transition-colors shrink-0"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>

        {/* Patient banner */}
        <div className="flex-1 bg-gradient-to-r from-[#e0eceb] to-white rounded-xl px-4 py-2 border border-[#d1e7e5] flex items-center gap-3">

          <div className="w-9 h-9 rounded-full bg-[#466460] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-user text-white text-sm"></i>
          </div>

          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-800 leading-tight truncate">
              {selectedPatient.name}
            </p>

            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {selectedPatient.universityId ||
                'No University ID'}

              {selectedPatient.department
                ? ` • ${selectedPatient.department}`
                : ''}

              {selectedPatient.prog
                ? ` • ${selectedPatient.prog}`
                : ''}

              {selectedPatient.year
                ? ` • ${selectedPatient.year}`
                : ''}
            </p>
          </div>

          <div className="ml-auto flex flex-col items-end gap-0.5 shrink-0">

            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#466460] text-white capitalize">
              {selectedPatient.role || 'student'}
            </span>

            {selectedPatient.gender && (
              <span className="text-[10px] text-slate-500">
                {selectedPatient.gender} · Age{' '}
                {selectedPatient.age || '—'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Examination tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
        {availableTabs.map(
          ({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-5 py-2.5 text-sm font-semibold relative ${
                examTab === key
                  ? 'text-[#466460]'
                  : 'text-slate-500'
              }`}
            >
              <i
                className={`fa-solid ${icon} mr-2`}
              ></i>

              {label}

              {examTab === key && (
                <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>
              )}
            </button>
          )
        )}
      </div>

      {/* Medical examination */}
      {examTab === 'medical' && (
        <Medical
          key={`medical-${resetKey}`}
          selectedPatient={selectedPatient}
          showMessage={handleExamSubmitted}
        />
      )}

      {/* Dental examination */}
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
          <i className="fa-solid fa-circle-check mr-2"></i>

          {message}
        </div>
      )}
    </div>
  );
};

export default Examinations;