import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Medical } from './Examination/Medical';
import { Dental } from './Examination/Dental';

const DOCUMENTS_BUCKET = 'health-documents';

// ============================================================
// SNACKBAR
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
    ${visible ? '-translate-x-1/2 translate-y-0 opacity-100' : '-translate-x-1/2 translate-y-32 opacity-0 pointer-events-none'}
    ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}>
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// DOCUMENT PREVIEW MODAL (PORTAL)
// ============================================================
const DocViewerModal = ({ isOpen, onClose, doc }) => {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen || !doc) {
      setSignedUrl('');
      setLoading(false);
      setLoadError(false);
      return;
    }

    const fetchSignedUrl = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        if (doc.url && !doc.path) {
          setSignedUrl(doc.url);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(doc.path, 300); // 5 minutes

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('[DocViewerModal] Error getting signed url:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const isPdf = doc.type === 'application/pdf' || doc.name?.toLowerCase().endsWith('.pdf');
  const isImage = doc.type?.startsWith('image/') || ['jpg', 'jpeg', 'png'].some(ext => doc.name?.toLowerCase().endsWith(`.${ext}`));

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div
        className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeInSlide_0.3s_ease-out_forwards]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#e0eceb] to-white border-b border-[#d1e7e5] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#466460] flex items-center justify-center text-white shrink-0">
              <i className={isPdf ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-image'}></i>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-800 truncate">{doc.name}</h3>
              {doc.uploadedAt && (
                <p className="text-xs text-slate-500">
                  Uploaded on {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {signedUrl && (
              <a
                href={signedUrl}
                download={doc.name}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white border border-[#c8ddd8] text-[#466460] hover:bg-[#e0eceb] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <i className="fa-solid fa-download"></i> Download
              </a>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 min-h-0 bg-slate-100 flex items-center justify-center p-4 overflow-auto">
          {loading ? (
            <div className="text-center text-slate-500">
              <i className="fa-solid fa-spinner fa-spin text-3xl mb-3 text-[#466460]"></i>
              <p className="text-sm font-semibold">Generating document preview...</p>
            </div>
          ) : loadError ? (
            <div className="text-center text-red-600 p-6 bg-white rounded-xl shadow-sm border border-red-100">
              <i className="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
              <p className="text-sm font-bold">Failed to load document preview</p>
              <p className="text-xs text-slate-500 mt-1">Please verify storage permissions or try downloading directly.</p>
            </div>
          ) : isPdf ? (
            <iframe
              src={`${signedUrl}#toolbar=0`}
              title={doc.name}
              className="w-full h-full rounded-lg bg-white border border-slate-200 shadow-inner"
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center overflow-auto">
              <img
                src={signedUrl}
                alt={doc.name}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-md border border-slate-200"
              />
            </div>
          ) : (
            <div className="text-center text-slate-600 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <i className="fa-solid fa-file text-4xl text-slate-400 mb-3"></i>
              <p className="text-sm font-bold">Preview is not supported for this file format</p>
              <p className="text-xs text-slate-500 mt-1">Click the download button above to view the file locally.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================
// HELPERS
// ============================================================
const typeBadgeClass = (roleStr) => {
  const t = (roleStr || '').toLowerCase();
  if (t.includes('student')) return 'bg-blue-100 text-blue-600';
  if (['instructor', 'faculty', 'lecturer', 'professor', 'doctor', 'nurse'].some(k => t.includes(k)))
    return 'bg-purple-100 text-purple-600';
  return 'bg-green-100 text-green-600';
};

const normalizeUser = (doc) => {
  const d = doc;
  const firstName = d.first_name || d.firstName || '';
  const lastName  = d.last_name  || d.lastName  || '';
  const middle    = d.middle_name || '';
  const suffix    = d.suffix ? ` ${d.suffix}` : '';
  const name = lastName
    ? `${lastName}, ${firstName} ${middle} ${suffix}`.trim()
    : `${firstName} ${middle} ${suffix}`.trim() || '—';

  return {
    uid:              doc.id || doc.uid,
    name,
    firstName,
    lastName,
    middleName:       d.middle_name        || '',
    suffix:           d.suffix             || '',
    id:               d.university_id      || d.universityId      || doc.id,
    role:             d.role || d.type     || 'staff',
    prog:             d.program            || d.course            || '',
    year:             d.year_level         || d.yearLevel         || '',
    section:          d.section            || '',
    age:              d.age                || '',
    gender:           d.sex                || d.gender            || '',
    birthdate:        d.birthday           || '',
    email:            d.email              || '',
    phoneNumber:      d.phone_number       || d.phoneNumber       || '',
    department:       d.department         || '',
    jobTitle:         d.job_title          || d.jobTitle          || '',
    classification:   d.classification     || '',
    emergencyContact: d.emergency_contact  || d.emergencyContact  || {},
    vaccinations:     d.vaccinations       || {},
    documents:        Array.isArray(d.documents) ? d.documents : [],
    _raw:             d,
  };
};

// ============================================================
// PROFILE PANEL
// ============================================================
const ProfilePanel = ({ person, onExamine, onClose, navigate, showSnackbar, currentUserRole, onPreviewDoc }) => {
  if (!person) return null;

  const userRole = String(currentUserRole || '').toLowerCase().trim();
  const canDoMedical = ['nurse', 'doctor', 'sysadmin', 'administrator'].includes(userRole);
  const canDoDental = ['dentist', 'sysadmin', 'administrator'].includes(userRole);
  const isStudent = person.role === 'student';

  const rawData = person._raw || {};
  const userDocuments = person.documents || rawData.documents || [];

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(',').map(p => p.trim());
    const lastName = parts[0] || '';
    const firstName = parts[1] || '';
    const lastInitial = lastName.charAt(0).toUpperCase();
    const firstInitial = firstName.charAt(0).toUpperCase();
    return lastInitial + firstInitial || lastInitial || '?';
  };

  const initials = getInitials(person.name);

  return (
    <div className="animate-[fadeInSlide_0.3s_ease-out_forwards] flex flex-col">
      {onClose && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm uppercase text-[#466460]">Clinical Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-4 h-4 fill-current">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="w-14 h-14 rounded-full bg-[#e0eceb] flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-[#466460]">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-800 truncate">{person.name}</h3>
              <p className="text-sm text-slate-500">{person.id} • {person.role?.charAt(0).toUpperCase() + person.role?.slice(1) || person.type}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {person.department && <span className="text-xs px-2.5 py-1 rounded-full bg-[#e0eceb] text-[#466460]">{person.department}</span>}
                {person.prog && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{person.prog}</span>}
                {person.jobTitle && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{person.jobTitle}</span>}
              </div>
            </div>

            <div className="flex gap-2 shrink-0 items-center">
              {canDoMedical && (
                <button onClick={() => onExamine(person, 'medical')} className="bg-gradient-to-br from-[#e07a5f] to-[#c96a5f] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:scale-105 hover:shadow-lg transition-all flex items-center gap-2 shadow-md border border-[#e07a5f]">
                  <i className="fa-solid fa-stethoscope"></i> Medical Exam
                </button>
              )}
              {canDoDental && (
                <button onClick={() => onExamine(person, 'dental')} className="bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:scale-105 hover:shadow-lg transition-all flex items-center gap-2 shadow-md border border-[#3b82f6]">
                  <i className="fa-solid fa-tooth"></i> Dental Exam
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-[#466460] uppercase mb-2 flex items-center gap-2">
          <i className="fa-solid fa-id-card"></i> Personal Information
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Age', value: person.age || '-' },
            { label: 'Gender', value: person.gender || rawData.sex || '-' },
            { label: 'Birthdate', value: person.birthdate || rawData.birthday || '-' },
            { label: 'Blood Type', value: rawData.blood_type || '-' },
            { label: 'Civil Status', value: rawData.civil_status || '-' },
            { label: 'Nationality', value: rawData.nationality || '-' },
            { label: 'Religion', value: rawData.religion || '-' },
            { label: 'Home Address', value: rawData.home_address || '-' },
          ].map(({ label, value }) => (
            <div key={label} className={`p-3 bg-slate-50 rounded-lg border border-slate-100 ${label === 'Home Address' ? 'col-span-2' : ''}`}>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">{label}</p>
              <p className={`text-sm font-bold text-slate-700 ${label === 'Home Address' ? 'whitespace-normal break-words' : 'truncate'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Academic/Work Info */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-[#466460] uppercase mb-2 flex items-center gap-2">
          <i className="fa-solid fa-graduation-cap"></i> {isStudent ? 'Academic' : 'Work'} Information
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isStudent ? (
            <>
              {[
                { label: 'Year Level', value: person.year || 'N/A' },
                { label: 'Section', value: person.section || 'N/A' },
                { label: 'Classification', value: rawData.student_classification || '-' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">{label}</p>
                  <p className="text-sm font-bold text-slate-700">{value}</p>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                { label: 'Job Title', value: rawData.job_title || '-' },
                { label: 'Classification', value: rawData.classification || '-' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">{label}</p>
                  <p className="text-sm font-bold text-slate-700">{value}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-[#466460] uppercase mb-2 flex items-center gap-2">
          <i className="fa-solid fa-phone"></i> Contact Information
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Email</p>
            <p className="text-sm font-bold text-slate-700 truncate">{person.email || '-'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Phone</p>
            <p className="text-sm font-bold text-slate-700">{person.phoneNumber || rawData.phone_number || '-'}</p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation"></i> Emergency Contact
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] text-red-500 uppercase font-semibold">Name</p>
            <p className="text-sm font-bold text-slate-700">
              {person.emergencyContact?.name || rawData.emergency_contact?.name || '-'}
              {person.emergencyContact?.relationship && ` (${person.emergencyContact.relationship})`}
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-[10px] text-red-500 uppercase font-semibold">Phone</p>
            <p className="text-sm font-bold text-slate-700">{person.emergencyContact?.phone || rawData.emergency_contact?.phone || '-'}</p>
          </div>
        </div>
      </div>

{/* COVID-19 Vaccination History Table */}
{(() => {
  const vaxData = typeof person.vaccinations === 'string'
    ? parseJsonField(person.vaccinations)
    : (person.vaccinations || person._raw?.vaccinations || {});

  const doseRows = [
    { key: 'dose1', label: '1st Dose' },
    { key: 'dose2', label: '2nd Dose' },
    { key: 'booster1', label: 'Booster (1)' },
    { key: 'booster2', label: 'Booster (2)' },
  ];

  const declined = vaxData.declined || {};
  const history = vaxData.history || '';

  return (
    <div className="mb-4">
      <h4 className="text-xs font-bold text-[#466460] uppercase mb-2 flex items-center gap-2">
        <i className="fa-solid fa-syringe"></i> COVID-19 Vaccination History
      </h4>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-4">Dose</th>
              <th className="py-2.5 px-4">Vaccine</th>
              <th className="py-2.5 px-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {doseRows.map(({ key, label }) => {
              const dose = vaxData[key] || {};
              const isDeclined = !!declined[key];
              const vaccine = dose.vaccineName || '';
              const date = dose.date || '';

              return (
                <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{label}</td>
                  <td className="py-2.5 px-4">
                    {isDeclined ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        N/A (Skipped)
                      </span>
                    ) : vaccine ? (
                      vaccine
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {isDeclined ? (
                      <span className="text-slate-400">—</span>
                    ) : date ? (
                      date
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* COVID-19 History Note */}
        <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 text-[11px] text-slate-600 italic">
          <strong className="not-italic text-slate-700 font-semibold">COVID-19 History: </strong>
          {declined.history ? 'Not applicable / None' : history || 'None recorded'}
        </div>
      </div>
    </div>
  );
})()}

      {/* Health Documents (Personnel Only) */}
      {!isStudent && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-[#466460] uppercase mb-2 flex items-center gap-2">
            <i className="fa-solid fa-folder-open"></i> Health Documents
          </h4>
          {userDocuments.length === 0 ? (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-xs italic text-amber-800 m-0">No clinic documents uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {userDocuments.map((doc) => (
                <button
                  key={doc.id || doc.path || doc.name}
                  type="button"
                  onClick={() => onPreviewDoc(doc)}
                  className="p-3 bg-slate-50 hover:bg-[#e0eceb] border border-slate-200 hover:border-[#8aacaa] rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#466460] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      <i className={doc.type === 'application/pdf' || doc.name?.endsWith('.pdf') ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-image'}></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate group-hover:text-[#466460]">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Attached File'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#466460] opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 flex items-center gap-1">
                    <i className="fa-solid fa-eye"></i> View
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// EXAMINATION MODAL
// ============================================================
const normalizePatientData = (uid, d) => {
  const firstName    = d.firstName    || d.first_name    || '';
  const lastName     = d.lastName     || d.last_name     || '';
  const middleName   = d.middleName   || d.middle_name   || '';
  const suffix       = d.suffix       || '';
  const universityId = d.universityId || d.university_id || d.studentId || d.student_id || (d.id !== uid ? d.id : '') || '';

  const name = lastName
    ? `${lastName}, ${firstName} ${middleName} ${suffix}`.trim()
    : firstName || '—';

  return {
    uid, name, firstName, lastName, middleName, suffix,
    uid:              doc.uid || doc.id,
    universityId,
    studentId:        d.studentId  || d.student_id  || universityId || '',
    role:             d.role       || '',
    prog:             d.program    || d.course       || '',
    program:          d.program    || d.course       || '',
    year:             d.yearLevel  || d.year_level   || '',
    yearLevel:        d.yearLevel  || d.year_level   || '',
    section:          d.section    || '',
    age:              d.age        || '',
    gender:           d.gender     || d.sex          || '',
    sex:              d.gender     || d.sex          || '',
    birthdate:        d.birthday   || d.birthdate    || '',
    birthday:         d.birthday   || d.birthdate    || '',
    email:            d.email      || '',
    phoneNumber:      d.phoneNumber || d.phone_number || d.contact_no || '',
    department:       d.department || '',
    jobTitle:         d.jobTitle   || d.job_title    || '',
    classification:   d.classification || '',
    homeAddress:      d.homeAddress || d.home_address || d.address || '',
    religion:         d.religion   || '',
    nationality:      d.nationality || '',
    civilStatus:      d.civilStatus || d.civil_status || '',
    bloodType:        d.bloodType  || d.blood_type   || '',
    emergencyContact: d.emergencyContact || d.emergency_contact || {
      name: '', relationship: '', phone: '', address: ''
    },
    vaccinations: d.vaccinations || {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
    dentalHistory: d.dentalHistory || d.dental_history || {},
    documents: Array.isArray(d.documents) ? d.documents : [],
  };
};

const ExaminationModal = ({ isOpen, onClose, patient, examType, setExamType, onExamSubmitted, resetKey, currentUserRole }) => {
  const [loading, setLoading] = useState(true);
  const [normalizedPatient, setNormalizedPatient] = useState(null);
  const [schoolYear, setSchoolYear] = useState(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    if (currentMonth >= 7) return `${currentYear}-${currentYear + 1}`;
    return `${currentYear - 1}-${currentYear}`;
  });
  const [semester, setSemester] = useState(() => {
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 7 && currentMonth <= 11) return '1st Semester';
    if (currentMonth >= 0 && currentMonth <= 4) return '2nd Semester';
    return 'Mid Year';
  });

  const schoolYearOptions = Array.from({ length: 10 }, (_, i) => {
    const y = new Date().getFullYear() - 5 + i;
    return `${y}-${y + 1}`;
  });

  const userRole = String(currentUserRole || '').toLowerCase().trim();
  const canDoMedical = ['nurse', 'doctor', 'sysadmin', 'administrator'].includes(userRole);
  const canDoDental = ['dentist', 'sysadmin', 'administrator'].includes(userRole);

  const availableTabs = [
    { key: 'medical', icon: 'fa-stethoscope', label: 'Medical Examination' },
    { key: 'dental', icon: 'fa-tooth', label: 'Dental Examination' },
  ].filter(tab => {
    if (tab.key === 'medical') return canDoMedical;
    if (tab.key === 'dental') return canDoDental;
    return true;
  });

  useEffect(() => {
    if (!isOpen || !patient) {
      setNormalizedPatient(null);
      return;
    }

    const fetchPatientData = async () => {
      setLoading(true);
      const userId = patient.uid || patient.id;
      const matchCol = patient.uid ? 'uid' : 'university_id';

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq(matchCol, userId)
          .maybeSingle();

        if (data && !error) {
          setNormalizedPatient(normalizePatientData(userId, data));
        } else {
          setNormalizedPatient(normalizePatientData(userId, patient));
        }
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setNormalizedPatient(normalizePatientData(userId, patient));
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [isOpen, patient, resetKey]);

  if (!isOpen || !patient) return null;

  const displayPatient = normalizedPatient || patient;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full h-full max-w-6xl mx-4 my-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeInSlide_0.3s_ease-out_forwards]">
        <div className="shrink-0 bg-gradient-to-r from-[#e0eceb] to-white border-b border-[#d1e7e5] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#466460] flex items-center justify-center">
              <i className="fa-solid fa-user text-white text-lg"></i>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{displayPatient.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {displayPatient.id} • {displayPatient.department || ''} {displayPatient.prog ? `• ${displayPatient.prog}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-5 h-5 fill-current">
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256l105.4-105.4c12.5-12.5 12.5-32.8 0-45.3z"/>
            </svg>
          </button>
        </div>

        <div className="shrink-0 flex gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50 items-center">
          <div className="flex gap-2">
            {availableTabs.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setExamType(key)}
                className={`px-6 py-3 text-base font-semibold rounded-lg transition-all flex items-center gap-2 ${
                  examType === key
                    ? 'bg-[#466460] text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <i className={`fa-solid ${icon}`}></i>
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">School Year:</span>
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent shadow-sm cursor-pointer"
            >
              {schoolYearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent shadow-sm cursor-pointer"
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Mid Year">Mid Year</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-slate-400">
                <i className="fa-solid fa-spinner fa-spin text-2xl mb-3 block text-[#466460]"></i>
                <p className="text-sm font-semibold">Loading patient data…</p>
              </div>
            </div>
          ) : (
            <>
              {examType === 'medical' && (
                <Medical
                  key={`medical-${resetKey}`}
                  selectedPatient={displayPatient}
                  showMessage={onExamSubmitted}
                  defaultSchoolYear={schoolYear}
                  defaultSemester={semester}
                />
              )}
              {examType === 'dental' && (
                <Dental
                  key={`dental-${resetKey}`}
                  selectedPatient={displayPatient}
                  showMessage={onExamSubmitted}
                  defaultSchoolYear={schoolYear}
                  defaultSemester={semester}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Records = () => {
  const navigate = useNavigate();

  const [peopleData, setPeopleData]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [currentDept, setCurrentDept]       = useState('All');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');

  const [filterYear, setFilterYear]       = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterRole, setFilterRole]       = useState('All');
  const [sortOrder, setSortOrder]         = useState('asc');
  const [profileOpen, setProfileOpen]     = useState(false);

  // Document Viewer Modal State
  const [previewDoc, setPreviewDoc]       = useState(null);
  const [previewOpen, setPreviewOpen]     = useState(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examType, setExamType]           = useState('medical');
  const [examResetKey, setExamResetKey]   = useState(0);

  const [currentUserRole] = useState(() => {
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? JSON.parse(rawUser)?.role || 'student' : 'student';
    } catch {
      return 'student';
    }
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      if (!data || data.length === 0) {
        setPeopleData([]);
        setLoading(false);
        return;
      }

      const normalized = (data || [])
        .filter(doc => {
          if (doc.is_archived === true || doc.is_archived === 'true') return false;
          const role = String(doc.role || doc.type || '').toLowerCase().trim();
          return role !== 'sysadmin' && role !== 'administrator' && role !== 'admin';
        })
        .map(doc => ({
          ...normalizeUser(doc),
          department: doc.department || 'Unassigned',
        }));

      setPeopleData(normalized);
    } catch (err) {
      console.error('Failed to load users:', err);
      showSnackbar('Could not load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const departments = ['All', ...new Set(peopleData.map(p => p.department).filter(Boolean))].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  const uniqueYears = ['All', ...new Set(
    peopleData.filter(p => (currentDept === 'All' || p.department === currentDept) && p.year).map(p => p.year)
  )].sort();

  const uniqueSections = ['All', ...new Set(
    peopleData
      .filter(p => (currentDept === 'All' || p.department === currentDept) && (filterYear === 'All' || p.year === filterYear) && p.section)
      .map(p => p.section)
  )].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  const uniquePrograms = ['All', ...new Set(
    peopleData.filter(p => (currentDept === 'All' || p.department === currentDept) && p.prog).map(p => p.prog)
  )].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  const uniqueRoles = ['All', ...new Set(
    peopleData.filter(p => (currentDept === 'All' || p.department === currentDept) && p.role).map(p => p.role)
  )].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return a.localeCompare(b);
  });

  const roleLabel = (r) => r === 'All' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1);

  const handleSelectDept = (dept) => {
    setCurrentDept(dept);
    setSelectedPerson(null);
    setSearchQuery('');
    setFilterYear('All');
    setFilterSection('All');
    setFilterRole('All');
    setFilterProgram('All');
    setProfileOpen(false);
  };

  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  const filteredPeople = peopleData
    .filter(p => {
      const inDept    = currentDept === 'All' || p.department === currentDept;
      const inYear    = filterYear    === 'All' ? true : p.year    === filterYear;
      const inSection = filterSection === 'All' ? true : p.section === filterSection;
      const inRole    = filterRole    === 'All' ? true : p.role    === filterRole;
      const inProgram = filterProgram === 'All' ? true : p.prog    === filterProgram;
      if (!inDept || !inYear || !inSection || !inRole || !inProgram) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
    setProfileOpen(true);
  };

  const handleExamine = (person, type = 'medical') => {
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    setExamType(type);
    setExamResetKey(k => k + 1);
    setExamModalOpen(true);
  };

  const handleExamModalClose = () => {
    setExamModalOpen(false);
    localStorage.removeItem('selectedPatient');
    setExamResetKey(k => k + 1);
  };

  const handleExamSubmitted = (msg) => {
    showSnackbar(msg, 'success');
    setExamModalOpen(false);
    localStorage.removeItem('selectedPatient');
    setExamResetKey(k => k + 1);
  };

  const handleOpenDocPreview = (doc) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const FilterSelects = ({ size = 'sm' }) => {
    const base = size === 'sm'
      ? 'px-2 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[11px] outline-none focus:border-[#466460] transition-all text-slate-600 min-w-0 truncate'
      : 'px-1 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[10px] outline-none focus:border-[#466460] transition-all text-slate-600 min-w-0 truncate';
    const roleCls = `${base} flex-1 min-w-[70px] max-w-[100px]`;
    const deptCls = `${base} flex-1 min-w-[80px] max-w-[120px]`;
    const progCls = `${base} flex-1 min-w-[100px] max-w-[200px]`;
    const yearCls = `${base} flex-1 min-w-[60px] max-w-[90px]`;
    const secCls = `${base} flex-1 min-w-[60px] max-w-[90px]`;

    return (
      <>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={roleCls}>
          {uniqueRoles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
        <select value={currentDept} onChange={e => handleSelectDept(e.target.value)} className={deptCls}>
          {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>)}
        </select>
        <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterYear('All'); setFilterSection('All'); }} className={progCls}>
          {uniquePrograms.map(p => <option key={p} value={p}>{p === 'All' ? 'All Programs' : p}</option>)}
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterSection('All'); }} className={yearCls}>
          {uniqueYears.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : y}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={secCls}>
          {uniqueSections.map(s => <option key={s} value={s}>{s === 'All' ? 'All Secs' : `Sec ${s}`}</option>)}
        </select>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* MOBILE VIEW */}
        <div className="flex flex-col lg:hidden h-full bg-white overflow-hidden">
          <div className="shrink-0 border-b border-[#eef2f6] px-3 py-3">
            {loading ? (
              <div className="text-xs text-slate-400 py-1 px-1">
                <i className="fa-solid fa-spinner fa-spin mr-1"></i> Loading departments...
              </div>
            ) : (
              <div className="relative">
                <p className="text-[9px] font-bold uppercase text-[#466460] mb-1.5 px-0.5">Department</p>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <select
                    value={currentDept}
                    onChange={e => handleSelectDept(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#f4f8f6] border border-[#c8ddd8] rounded-xl text-[12px] font-semibold text-[#1a2e22] outline-none appearance-none focus:border-[#466460] focus:bg-white transition-all cursor-pointer"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                  <span className="text-[9px] font-semibold text-[#466460] bg-[#e0eceb] px-2 py-0.5 rounded-full">
                    {filteredPeople.length} record{filteredPeople.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[9px] text-slate-400">{currentDept === 'All' ? 'across all departments' : 'in selected department'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 px-3 py-3 border-b border-[#eef2f6]">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                <input
                  type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name or ID..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs outline-none focus:border-[#466460] focus:bg-white transition-all"
                />
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{ minWidth: '38px', minHeight: '38px', flexShrink: 0 }}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-slate-500 hover:border-[#466460] hover:text-[#466460] hover:bg-[#e0eceb] transition-all flex items-center justify-center text-[10px] font-bold"
              >
                {sortOrder === 'asc' ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <text x="1" y="7" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                    <text x="1" y="13" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                    <path d="M11 2v10M11 12l-2-2M11 12l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <text x="1" y="7" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                    <text x="1" y="13" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                    <path d="M11 14V4M11 4l-2 2M11 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 overflow-hidden">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 2.5h10M3 6h6M5 9.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </span>
              <div className="flex flex-1 gap-1.5 min-w-0 overflow-hidden">
                <FilterSelects size="sm" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
            {filteredPeople.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-12">No records found</div>
            ) : (
              <div className="space-y-1.5">
                {filteredPeople.map(person => (
                  <div
                    key={person.uid}
                    onClick={() => handleSelectPerson(person)}
                    className={`p-4 cursor-pointer rounded-xl transition-all border ${
                      selectedPerson?.uid === person.uid
                        ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                        : 'border-slate-100 hover:bg-slate-50 active:bg-[#e0eceb]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-700 truncate">{person.name}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {person.id}{person.prog ? ` • ${person.prog}` : ''}{person.year ? ` ${person.year}` : ''}{person.section ? ` • Sec ${person.section}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full ${typeBadgeClass(person.role || person.type)}`}>
                          {person.role || person.type}
                        </span>
                        <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {profileOpen && (
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setProfileOpen(false)} />
          )}
          <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out lg:hidden max-h-[85vh] flex flex-col ${profileOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200"></div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8 pt-2 [&::-webkit-scrollbar]:hidden">
              <ProfilePanel
                person={selectedPerson}
                onExamine={handleExamine}
                onClose={() => setProfileOpen(false)}
                navigate={navigate}
                showSnackbar={showSnackbar}
                currentUserRole={currentUserRole}
                onPreviewDoc={handleOpenDocPreview}
              />
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden lg:flex h-full bg-white overflow-hidden">
          {/* Column 1 — People */}
          <div className="w-1/3 border-r border-[#eef2f6] flex flex-col overflow-hidden">
            <div className="shrink-0 bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-[11px] uppercase text-[#466460]">People</h3>
                <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">{filteredPeople.length}</span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name or ID..."
                    className="w-full pl-8 pr-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[11px] outline-none focus:border-[#466460] focus:bg-white transition-all"
                  />
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  style={{ minWidth: '34px', minHeight: '34px', flexShrink: 0 }}
                  className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-slate-500 hover:border-[#466460] hover:text-[#466460] hover:bg-[#e0eceb] transition-all flex items-center justify-center"
                >
                  {sortOrder === 'asc' ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <text x="1" y="7" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                      <text x="1" y="13" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                      <path d="M11 2v10M11 12l-2-2M11 12l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <text x="1" y="7" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                      <text x="1" y="13" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                      <path d="M11 14V4M11 4l-2 2M11 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 2.5h10M3 6h6M5 9.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </span>
                <div className="flex flex-1 gap-1.5 min-w-0 overflow-hidden">
                  <FilterSelects size="xs" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              {filteredPeople.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-12">No records found</div>
              ) : (
                <div className="space-y-1">
                  {filteredPeople.map(person => (
                    <div
                      key={person.uid}
                      onClick={() => setSelectedPerson(person)}
                      className={`p-4 mb-1 cursor-pointer rounded-xl transition-all border relative ${
                        selectedPerson?.uid === person.uid
                          ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                          : 'border-transparent hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:border-[#8aacaa] hover:translate-x-0.5'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-700 truncate">{person.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {person.id} {person.prog ? `• ${person.prog}` : ''} {person.year || ''} {person.section ? `• Sec ${person.section}` : ''}
                          </p>
                        </div>
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${typeBadgeClass(person.role)}`}>{person.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2 — Clinical Profile */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="shrink-0 bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase text-[#466460]">Clinical Profile</h3>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              {!selectedPerson ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <i className="fa-regular fa-user-circle text-slate-200 text-5xl mb-3"></i>
                  <p className="text-slate-400 text-sm">Select a person from the list</p>
                </div>
              ) : (
                <ProfilePanel
                  person={selectedPerson}
                  onExamine={handleExamine}
                  navigate={navigate}
                  showSnackbar={showSnackbar}
                  currentUserRole={currentUserRole}
                  onPreviewDoc={handleOpenDocPreview}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Examination Modal */}
      {examModalOpen && createPortal(
        <ExaminationModal
          isOpen={examModalOpen}
          onClose={handleExamModalClose}
          patient={selectedPerson}
          examType={examType}
          setExamType={setExamType}
          onExamSubmitted={handleExamSubmitted}
          resetKey={examResetKey}
          currentUserRole={currentUserRole}
        />,
        document.body
      )}

      {/* In-App Document Preview Modal */}
      <DocViewerModal
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
        }}
        doc={previewDoc}
      />

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Records;