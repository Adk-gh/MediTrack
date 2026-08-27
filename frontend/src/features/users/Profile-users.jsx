// C:\Users\HP\MediTrack\frontend\src\features\profile\ProfileUsers.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker.jsx';
import AddressModal from '../../components/AddressModal.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTranslation } from 'react-i18next';
import { useDocumentManager } from '../../hooks/useDocumentManager'; // <-- Imported hook

// ─── Constants & Icons ────────────────────────────────────────────────────────
const DocIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>);
const EditIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>);

// ─── Shared Components & Styles ───────────────────────────────────────────────
const fmt = (val) => (!val || val === '') ? '—' : val;

const SectionHeader = ({ label, onEdit, hasEmpty }) => {
  const { t, i18n } = useTranslation();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: hasEmpty ? '#92400e' : '#466460', borderLeft: `3px solid ${hasEmpty ? '#f59e0b' : '#466460'}`, paddingLeft: 8 }}>{label}</div>
        {hasEmpty && <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: 10 }}>{t('profile.incomplete')}</span>}
      </div>
      {onEdit && <button onClick={onEdit} style={{ background: '#e0eceb', border: 'none', color: '#466460', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6 }}><EditIcon /> {t('common.edit')}</button>}
    </div>
  );
};

const InfoRow = ({ label, value, last, empty, attention = false }) => {
  const highlighted = empty || attention;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #edf3f0', backgroundColor: highlighted ? '#fffbeb' : 'transparent', marginLeft: highlighted ? -16 : 0, marginRight: highlighted ? -16 : 0, paddingLeft: highlighted ? 16 : 0, paddingRight: highlighted ? 16 : 0, borderRadius: highlighted ? '8px' : 0 }}>
      <span style={{ fontWeight: 600, fontSize: 12, color: highlighted ? '#92400e' : '#6b8577', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 13, color: highlighted ? '#92400e' : '#1a2e22', textAlign: 'right' }}>{fmt(value)}</span>
    </div>
  );
};

const Card = ({ children, style, id }) => (<div id={id} style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #edf3f0', ...style }}>{children}</div>);
const FormGroup = ({ label, children }) => (<div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#6b8577', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>{children}</div>);

const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #c4dbd8', fontSize: 13, backgroundColor: '#fbfcfc', color: '#1a2e22', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' };

const CustomSelect = ({ value, onChange, options, style, dropUp = false }) => {
const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside); document.addEventListener('touchstart', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('touchstart', handleClickOutside); };
  }, []);

  const normalized = options.map(opt => typeof opt === 'object' && opt !== null ? opt : { value: opt, label: opt });
  const currentOption = normalized.find(o => o.value === value);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: `1px solid ${open ? '#81b29a' : '#c4dbd8'}`, background: '#fbfcfc', color: currentOption ? '#1a2e22' : '#9bb5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left', boxSizing: 'border-box' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentOption ? currentOption.label : t('common.select')}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="3" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: dropUp ? 'auto' : 'calc(100% + 6px)', bottom: dropUp ? 'calc(100% + 6px)' : 'auto', background: '#fff', border: '1px solid #c4dbd8', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
          {normalized.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: value === opt.value ? '#e0eceb' : 'transparent', color: value === opt.value ? '#466460' : '#1a2e22' }}>{opt.label}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Static Data Arrays ───────────────────────────────────────────────────────
const STUDENT_CLASSIFICATIONS = ['Regular', 'Irregular', 'Returning'];
const RELIGIONS = ['Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Seventh-day Adventist', 'Protestant', 'Born Again Christian', 'Buddhism', 'Hinduism', 'Other'];
const NATIONALITIES = ['Filipino', 'American', 'Chinese', 'Japanese', 'Korean', 'Indian', 'British', 'Australian', 'Canadian', 'Other'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
const EMERGENCY_RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Child', 'Grandparent', 'Relative', 'Guardian', 'Friend', 'Other'];
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const VACCINE_BRANDS = ['Pfizer', 'Moderna', 'AstraZeneca', 'Sinovac', 'Janssen', 'Novavax', 'Covaxin', 'Sputnik', 'Other'];
const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
const SEX_OPTIONS = ['Male', 'Female'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const DENTAL_PROCEDURES = ['Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy', 'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDisplayDateWithMonth = (raw, preferences) => {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);

  const formatString = preferences?.dateFormat?.toUpperCase() || 'MM/DD/YYYY';
  const monthStr = date.toLocaleDateString('en-US', { month: 'long' });
  const dayStr = String(date.getDate()).padStart(2, '0');
  const yearStr = date.getFullYear();

  if (formatString.startsWith('DD')) {
    return `${dayStr} ${monthStr} ${yearStr}`;
  } else if (formatString.startsWith('YYYY')) {
    return `${yearStr} ${monthStr} ${dayStr}`;
  } else {
    return `${monthStr} ${dayStr}, ${yearStr}`;
  }
};

const normalizeName = (name) => name ? name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase() : '';
const toTitleCase = (str) => str ? str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) : '';
const isValidPhoneNumber = (phone) => !phone || /^09\d{9}$/.test(phone);
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return (digits.length === 10 && digits.startsWith('9')) ? '0' + digits : digits.startsWith('63') ? '0' + digits.substring(2) : digits;
};
const calculateAge = (birthday) => {
  if (!birthday) return '';
  const today = new Date(), birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return '';
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? age.toString() : '';
};
const classificationColors = { Regular: { bg: '#e0eceb', text: '#466460', dot: '#466460' }, Irregular: { bg: '#fff7e6', text: '#92400e', dot: '#f59e0b' }, Returning: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' } };

const ptrStyles = `@keyframes ptr-spin { to { transform: rotate(360deg); } } [data-spin="true"] [data-ptr-icon] { display: none; } [data-spin="true"] [data-ptr-spin] { display: block; } [data-spin="false"] [data-ptr-icon] { display: block; } [data-spin="false"] [data-ptr-spin] { display: none; }`;
const PullIndicator = ({ indicatorRef }) => (
  <div ref={indicatorRef} data-spin="false" style={{ overflow: 'hidden', height: 0, opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'height 0.2s ease, opacity 0.2s ease' }}>
    <svg data-ptr-icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9" /></svg>
    <svg data-ptr-spin width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" style={{ animation: 'ptr-spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" strokeOpacity="0.2" /><path d="M12 3 a9 9 0 0 1 9 9" /></svg>
  </div>
);

// ─── DB → Component Mapper ────────────────────────────────────────────────────
const mapDbToProfile = (db, fallbackEmail = '') => ({
  firstName: db.first_name || '', middleName: db.middle_name || '', lastName: db.last_name || '', suffix: db.suffix || '',
  birthday: db.birthday || '', age: db.age || '', sex: db.sex || '', bloodType: db.blood_type || '', homeAddress: db.home_address || '',
  addressCountry: db.address_country || '', addressRegion: db.address_region || '', addressRegionCode: db.address_region_code || '',
  addressProvince: db.address_province || '', addressProvinceCode: db.address_province_code || '', addressCity: db.address_city || '',
  addressCityCode: db.address_city_code || '', addressBarangay: db.address_barangay || '', addressBarangayCode: db.address_barangay_code || '',
  addressStreet: db.address_street || '', addressZipCode: db.address_zip_code || '', religion: db.religion || '', nationality: db.nationality || '',
  civilStatus: db.civil_status || '', universityId: db.university_id || '', role: db.role || '', studentId: db.student_id || '',
  department: db.department || '', program: db.program || '', yearLevel: db.year_level || '', section: db.section || '',
  academicInfoAcknowledgedVersion: Number(db.academic_info_acknowledged_version || 0), studentClassification: db.student_classification || 'Regular',
  classification: db.classification || '', jobTitle: db.job_title || '', licenseNumber: db.license_number || '', email: db.email || fallbackEmail,
  phoneNumber: db.phone_number || '',
  preferences: { language: db.preferences?.language || 'English', dateFormat: db.preferences?.dateFormat || 'MM/DD/YYYY' },
  emergencyContact: {
    name: db.emergency_contact?.name || '', relationship: db.emergency_contact?.relationship || '', phone: db.emergency_contact?.phone || '', address: db.emergency_contact?.address || '',
    addressCountry: db.emergency_contact?.addressCountry || '', addressRegion: db.emergency_contact?.addressRegion || '', addressRegionCode: db.emergency_contact?.addressRegionCode || '',
    addressProvince: db.emergency_contact?.addressProvince || '', addressProvinceCode: db.emergency_contact?.addressProvinceCode || '', addressCity: db.emergency_contact?.addressCity || '',
    addressCityCode: db.emergency_contact?.addressCityCode || '', addressBarangay: db.emergency_contact?.addressBarangay || '', addressBarangayCode: db.emergency_contact?.addressBarangayCode || '',
    addressStreet: db.emergency_contact?.addressStreet || '', addressZipCode: db.emergency_contact?.addressZipCode || '',
  },
  vaccinations: {
    dose1: { vaccineName: db.vaccinations?.dose1?.vaccineName || '', date: db.vaccinations?.dose1?.date || '' },
    dose2: { vaccineName: db.vaccinations?.dose2?.vaccineName || '', date: db.vaccinations?.dose2?.date || '' },
    booster1: { vaccineName: db.vaccinations?.booster1?.vaccineName || '', date: db.vaccinations?.booster1?.date || '' },
    booster2: { vaccineName: db.vaccinations?.booster2?.vaccineName || '', date: db.vaccinations?.booster2?.date || '' },
    history: db.vaccinations?.history || '',
    declined: typeof db.vaccinations?.declined === 'object'
      ? { dose1: !!db.vaccinations.declined.dose1, dose2: !!db.vaccinations.declined.dose2, booster1: !!db.vaccinations.declined.booster1, booster2: !!db.vaccinations.declined.booster2, history: !!db.vaccinations.declined.history }
      : db.vaccinations?.declined ? { dose1: true, dose2: true, booster1: true, booster2: true, history: true } : { dose1: false, dose2: false, booster1: false, booster2: false, history: false },
  },
  dentalHistory: { lastVisit: db.dental_history?.lastVisit || '', prevDentist: db.dental_history?.prevDentist || '', declined: db.dental_history?.declined || false, procedures: db.dental_history?.procedures || {} },
  surgicalHistory: { operations: Array.isArray(db.surgical_history?.operations) ? db.surgical_history.operations : [], declined: db.surgical_history?.declined || false },
  documents: Array.isArray(db.documents) ? db.documents : [],
});

const getActiveUid = async () => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        '[ProfileUsers] Failed to get Supabase session:',
        sessionError.message
      );
      return null;
    }

    if (session?.user?.id) {
      return session.user.id;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        '[ProfileUsers] Failed to get Supabase user:',
        userError.message
      );
    }

    return user?.id || null;
  } catch (error) {
    console.error(
      '[ProfileUsers] getActiveUid error:',
      error
    );

    return null;
  }
};

const getAuthenticatedApiHeaders = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      error.message || 'Unable to retrieve authentication session.'
    );
  }

  if (!session?.access_token) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
};

// ─── Document Preview Modal ───────────────────────────────────────────────────
// Passed getSignedUrl from the hook so we use the single source of truth for URLs
const DocViewerModal = ({ isOpen, onClose, doc, preferences, getSignedUrl }) => {
  const { t, i18n } = useTranslation();
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => { document.body.style.overflow = isOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !doc) { setSignedUrl(''); setLoading(false); setLoadError(false); return; }
    const fetchSignedUrl = async () => {
      setLoading(true); setLoadError(false);
      try {
        const url = await getSignedUrl(doc, 300);
        setSignedUrl(url);
      } catch (err) { console.error('[DocViewerModal] Error:', err); setLoadError(true); } finally { setLoading(false); }
    };
    fetchSignedUrl();
  }, [isOpen, doc, getSignedUrl]);

  if (!isOpen || !doc) return null;
  const isPdf = doc.type === 'application/pdf' || doc.name?.toLowerCase().endsWith('.pdf');
  const isImage = doc.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].some(ext => doc.name?.toLowerCase().endsWith(`.${ext}`));

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(15, 23, 20, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '860px', height: '88vh', backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ flexShrink: 0, background: 'linear-gradient(to right, #e0eceb, #ffffff)', borderBottom: '1px solid #d1e7e5', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#466460', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}><DocIcon /></div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{doc.name}</h3>
              {doc.uploadedAt && <p style={{ fontSize: '10.5px', color: '#64748b', margin: '2px 0 0' }}>{t('documents.uploaded')} {formatDisplayDateWithMonth(doc.uploadedAt, preferences)}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {signedUrl && <a href={signedUrl} download={doc.name} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #c8ddd8', color: '#466460', fontSize: '11px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>{t('common.download')}</a>}
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f4f7f5', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflowY: 'auto' }}>
          {loading ? <div style={{ textAlign: 'center', color: '#64748b' }}>{t('common.loading')}</div> : loadError ? <div style={{ textAlign: 'center', color: '#dc2626' }}>{t('messages.somethingWentWrong')}</div> : isPdf ? <iframe src={`${signedUrl}#view=FitH&toolbar=0&navpanes=0`} title={doc.name} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} /> : isImage ? <img src={signedUrl} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} /> : <div>Preview unsupported. Download to view.</div>}
        </div>
      </div>
    </div>, document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileUsers({ onLogout }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate(), location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [scrollToSection, setScrollToSection] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [dentalDeclined, setDentalDeclined] = useState(false);
  const [surgicalDeclined, setSurgicalDeclined] = useState(false);
  const [vaccinationsDeclined, setVaccinationsDeclined] = useState({ dose1: false, dose2: false, booster1: false, booster2: false, history: false });
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState(null);
  const [configData, setConfigData] = useState({ departments: [], non_academic_offices: [], classifications: {}, job_titles: {}, sections: [], prompt_student_academic_update: false, academic_update_version: 1 });

  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [profile, setProfile] = useState({ firstName: '', middleName: '', lastName: '', suffix: '', birthday: '', age: '', sex: '', bloodType: '', homeAddress: '', addressCountry: '', addressRegion: '', addressRegionCode: '', addressProvince: '', addressProvinceCode: '', addressCity: '', addressCityCode: '', addressBarangay: '', addressBarangayCode: '', addressStreet: '', addressZipCode: '', religion: '', nationality: '', civilStatus: '', universityId: '', role: '', studentId: '', department: '', program: '', yearLevel: '', section: '', academicInfoAcknowledgedVersion: 0, studentClassification: '', classification: '', jobTitle: '', licenseNumber: '', email: '', phoneNumber: '', preferences: { language: 'English', dateFormat: 'MM/DD/YYYY' }, emergencyContact: {}, vaccinations: { dose1: {}, dose2: {}, booster1: {}, booster2: {}, history: '', declined: {} }, dentalHistory: { procedures: {} }, surgicalHistory: { operations: [] }, documents: [] });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ─── Document Manager Hook ───
  const {
    uploadingDocs,
    docToDelete,
    setDocToDelete,
    isDeletingDoc,
    documentsInputRef,
    handleDocumentUpload,
    confirmDeleteDocument,
    getSignedUrl,
  } = useDocumentManager(
    profile.documents,
    (newDocuments) => setProfile(prev => ({ ...prev, documents: newDocuments })),
    (msg, type) => showToast(msg) // ignores type, always uses toast
  );
  // ─────────────────────────────

  const fetchProfile = useCallback(async () => {
    try {
      const activeUid = await getActiveUid();
      if (!activeUid) return setLoading(false);
      const { data, error } = await supabase.from('users').select('*').eq('uid', activeUid).limit(1);
      if (error) throw error;
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (data?.[0]) setProfile(mapDbToProfile(data[0], currentUser?.email || ''));
      else setProfile(prev => ({ ...prev, email: currentUser?.email || '' }));
    } catch (err) { console.error('[ProfileUsers] Fetch error:', err); } finally { setLoading(false); }
  }, []);

const fetchSystemConfig = useCallback(async () => {
    try {
      // 1. Get the token from storage (change 'token' if you named it something else)
      const token = localStorage.getItem('token');

      // 2. Add the headers object to the fetch request
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await res.json();
      if (result.success) setConfigData(prev => ({ ...prev, ...result.data }));
    } catch (error) {
      console.error('Failed config:', error);
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  const { scrollElRef, indicatorRef } = usePullToRefresh(async () => { await Promise.all([fetchProfile(), fetchSystemConfig()]); });

  useEffect(() => { fetchProfile(); fetchSystemConfig(); }, [fetchProfile, fetchSystemConfig]);

  useEffect(() => { if (location.state?.scrollTo && !scrollToSection) setScrollToSection(location.state.scrollTo); }, [location.state, scrollToSection]);

  useEffect(() => {
    if (!loading && !isConfigLoading && scrollToSection) {
      const sectionRefs = { academic: 'academic-section', contact: 'contact-section', emergency: 'emergency-section', vaccinations: 'vaccinations-section', dental: 'dental-section', surgical: 'surgical-section' };
      const elementId = sectionRefs[scrollToSection];
      if (elementId) setTimeout(() => { const el = document.getElementById(elementId); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }, 300);
      setScrollToSection(null);
    }
  }, [loading, isConfigLoading, scrollToSection]);

useEffect(() => { document.body.style.overflow = (editingSection || docToDelete || addressModalOpen) ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [editingSection, docToDelete, addressModalOpen]);

  // Sync i18next with the user's database preference
  useEffect(() => {
    if (profile?.preferences?.language) {
      const langCode = profile.preferences.language.toLowerCase() === 'filipino' ? 'fil' : 'en';
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [profile?.preferences?.language, i18n]);

  const selectedDept = configData.departments.find(d => d.full === editData.department || d.abbr === editData.department);
  const availablePrograms = selectedDept ? selectedDept.programs : [...new Set(configData.departments.flatMap(d => d.programs))];
  const uniqueClassifications = Array.from(new Set(Object.values(configData.classifications)));
  const uniqueJobTitles = Array.from(new Set(Object.values(configData.job_titles)));
  const departmentOptions = configData.departments.map(d => d.full);

  const fullName = [profile.firstName, profile.middleName || '', profile.lastName, profile.suffix].filter(Boolean).join(' ');
  const isStudent = profile.role?.toLowerCase() === 'student';
  const isFieldEmpty = (value) => !value || value === '';
  const userDate = (value) => value ? formatDisplayDateWithMonth(value, profile.preferences) : '';

  const personalFields = [profile.birthday, profile.age, profile.sex, profile.bloodType, profile.civilStatus, profile.religion, profile.nationality, profile.homeAddress];
  const hasEmptyPersonal = personalFields.some(isFieldEmpty);
 const academicFields = isStudent ? [profile.universityId || profile.studentId, profile.department, profile.program, profile.yearLevel, profile.section, profile.studentClassification] : [profile.classification, profile.department, profile.jobTitle];
  const hasEmptyAcademic = academicFields.some(isFieldEmpty);

  // Safely check for true, "true", or 1 in case the API serializes the boolean differently
  const isPromptUpdateEnabled =
    configData?.prompt_student_academic_update === true ||
    String(configData?.prompt_student_academic_update).toLowerCase() === 'true' ||
    Number(configData?.prompt_student_academic_update) === 1;

  const academicUpdateRequired = isStudent && isPromptUpdateEnabled && Number(profile.academicInfoAcknowledgedVersion || 0) < Number(configData?.academic_update_version || 1);

  const hasAcademicAttention = hasEmptyAcademic || academicUpdateRequired;
  const contactFields = [profile.email, profile.phoneNumber];
  const hasEmptyContact = contactFields.some(isFieldEmpty);
  const emergencyFields = [profile.emergencyContact?.name, profile.emergencyContact?.relationship, profile.emergencyContact?.phone, profile.emergencyContact?.address];
  const hasEmptyEmergency = emergencyFields.some(isFieldEmpty);
  const hasEmptyVaccinations = (!profile.vaccinations?.declined?.dose1 && !profile.vaccinations?.dose1?.vaccineName && !profile.vaccinations?.dose1?.date) || (!profile.vaccinations?.declined?.dose2 && !profile.vaccinations?.dose2?.vaccineName && !profile.vaccinations?.dose2?.date) || (!profile.vaccinations?.declined?.booster1 && !profile.vaccinations?.booster1?.vaccineName && !profile.vaccinations?.booster1?.date) || (!profile.vaccinations?.declined?.booster2 && !profile.vaccinations?.booster2?.vaccineName && !profile.vaccinations?.booster2?.date) || (!profile.vaccinations?.declined?.history && isFieldEmpty(profile.vaccinations?.history));
  const dentalFields = [profile.dentalHistory?.lastVisit, profile.dentalHistory?.prevDentist];
  const hasEmptyDental = !profile.dentalHistory?.declined && dentalFields.every(isFieldEmpty);
  const hasEmptySurgical = !profile.surgicalHistory?.declined && (!profile.surgicalHistory?.operations || profile.surgicalHistory.operations.length === 0);

  const openAddressModal = (target) => { setAddressModalTarget(target); setAddressModalOpen(true); };
  const closeAddressModal = () => { setAddressModalOpen(false); setAddressModalTarget(null); };

  const handleAddressConfirm = (addr) => {
    const struct = { addressCountry: addr.addressCountry, addressRegion: addr.addressRegion, addressRegionCode: addr.addressRegionCode, addressProvince: addr.addressProvince, addressProvinceCode: addr.addressProvinceCode, addressCity: addr.addressCity, addressCityCode: addr.addressCityCode, addressBarangay: addr.addressBarangay, addressBarangayCode: addr.addressBarangayCode, addressStreet: addr.addressStreet, addressZipCode: addr.addressZipCode };
    if (addressModalTarget === 'personal') setEditData(prev => ({ ...prev, homeAddress: addr.homeAddress, ...struct }));
    else if (addressModalTarget === 'emergency') setEditData(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, address: addr.homeAddress, ...struct } }));
  };

  const addressInitialData = addressModalTarget === 'personal' ? { addressCountry: editData.addressCountry, addressRegion: editData.addressRegion, addressRegionCode: editData.addressRegionCode, addressProvince: editData.addressProvince, addressProvinceCode: editData.addressProvinceCode, addressCity: editData.addressCity, addressCityCode: editData.addressCityCode, addressBarangay: editData.addressBarangay, addressBarangayCode: editData.addressBarangayCode, addressStreet: editData.addressStreet, addressZipCode: editData.addressZipCode } : addressModalTarget === 'emergency' ? { addressCountry: editData.emergencyContact?.addressCountry, addressRegion: editData.emergencyContact?.addressRegion, addressRegionCode: editData.emergencyContact?.addressRegionCode, addressProvince: editData.emergencyContact?.addressProvince, addressProvinceCode: editData.emergencyContact?.addressProvinceCode, addressCity: editData.emergencyContact?.addressCity, addressCityCode: editData.emergencyContact?.addressCityCode, addressBarangay: editData.emergencyContact?.addressBarangay, addressBarangayCode: editData.emergencyContact?.addressBarangayCode, addressStreet: editData.emergencyContact?.addressStreet, addressZipCode: editData.emergencyContact?.addressZipCode } : {};

  const handleViewDocument = (doc) => { setPreviewDoc(doc); setPreviewOpen(true); };

  const openEdit = (section) => {
    setEditData(JSON.parse(JSON.stringify(profile)));
    setEditingSection(section);
    setDentalDeclined(profile.dentalHistory?.declined || false);
    setSurgicalDeclined(profile.surgicalHistory?.declined || false);
    setVaccinationsDeclined(profile.vaccinations?.declined || { dose1: false, dose2: false, booster1: false, booster2: false, history: false });
  };

  const closeEdit = () => { setEditingSection(null); setEditData({}); };

  const handleChange = (field, value) => {
    if (field === 'birthday') setEditData(prev => ({ ...prev, birthday: value, age: calculateAge(value) }));
    else setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => setEditData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const handleVaxChange = (dose, field, value) => setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, [dose]: { ...prev.vaccinations[dose], [field]: value } } }));
  const handleCovidHistoryChange = (value) => setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, history: value } }));
  const handleDentalChange = (field, value) => setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, [field]: value } }));
  const handleDentalProcChange = (proc, value) => setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, procedures: { ...(prev.dentalHistory.procedures || {}), [proc]: value } } }));
  const handleAddOperation = () => setEditData(prev => ({ ...prev, surgicalHistory: { ...prev.surgicalHistory, operations: [...(prev.surgicalHistory?.operations || []), { id: crypto.randomUUID(), operation: '', date: '', notes: '' }] } }));
  const handleRemoveOperation = (id) => setEditData(prev => ({ ...prev, surgicalHistory: { ...prev.surgicalHistory, operations: (prev.surgicalHistory?.operations || []).filter(op => op.id !== id) } }));
  const handleOperationChange = (id, field, value) => setEditData(prev => ({ ...prev, surgicalHistory: { ...prev.surgicalHistory, operations: (prev.surgicalHistory?.operations || []).map(op => op.id === id ? { ...op, [field]: value } : op) } }));

  const extractSectionData = (data, section, isStudentUser) => {
    const s = {
      personal: ['firstName', 'middleName', 'lastName', 'suffix', 'birthday', 'age', 'sex', 'bloodType', 'civilStatus', 'religion', 'nationality', 'homeAddress'],
      academic: isStudentUser ? ['universityId', 'department', 'program', 'yearLevel', 'section', 'studentClassification'] : ['classification', 'department', 'jobTitle', 'licenseNumber'],
      contact: ['email', 'phoneNumber'], emergency: ['emergencyContact'], vaccinations: ['vaccinations'], dental: ['dentalHistory'], surgical: ['surgicalHistory'],
    };
    const fields = s[section] || [], sectionData = {};
    fields.forEach(field => { sectionData[field] = data[field]; });
    return sectionData;
  };

  const saveProfileEdits = async () => {
    if (isSaving) return;

    setIsSaving(true);

    console.log('=== SAVE PROFILE START ===');
    console.log('Editing Section:', editingSection);

    try {
      // ==========================================================
      // GET CURRENT SUPABASE SESSION
      // ==========================================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message ||
          'Unable to retrieve your authentication session.'
        );
      }

      if (!session?.user?.id || !session.access_token) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      const activeUid = session.user.id;

      console.log('>>> [Auth] Active Supabase Auth UID:', activeUid);

      // ==========================================================
      // EXTRACT SECTION DATA
      // ==========================================================

      let sectionData = extractSectionData(editData, editingSection, isStudent);

      // ==========================================================
      // NORMALIZE NAMES
      // ==========================================================

      if (sectionData.firstName) sectionData.firstName = normalizeName(sectionData.firstName);
      if (sectionData.middleName) sectionData.middleName = normalizeName(sectionData.middleName);
      if (sectionData.lastName) sectionData.lastName = normalizeName(sectionData.lastName);
      if (sectionData.emergencyContact?.name) sectionData.emergencyContact.name = normalizeName(sectionData.emergencyContact.name);

      // ==========================================================
      // ACADEMIC UPDATE ACKNOWLEDGMENT
      // ==========================================================

      if (isStudent && editingSection === 'academic' && configData?.prompt_student_academic_update === true) {
        sectionData.academicInfoAcknowledgedVersion = Number(configData.academic_update_version || 1);
      }

      let isEmailUpdatePending = false;

      // ==========================================================
      // EMAIL CHANGE
      // ==========================================================
      //
      // IMPORTANT:
      //
      // Email is controlled by Supabase Auth.
      //
      // We DO NOT send email to /user/profile.
      //
      // We DO NOT modify public.users.uid.
      //
      // We DO NOT manually modify public.users.email before
      // the verification process completes.
      //
      // Supabase will send the confirmation email according
      // to the project's Auth email-change configuration.
      // ==========================================================

      if (editingSection === 'contact') {
        const { email: newEmail, ...backendData } = sectionData;

        const normalizedNewEmail = String(newEmail || '').trim().toLowerCase();
        const normalizedCurrentEmail = String(profile.email || '').trim().toLowerCase();

        console.log('>>> [Email] Current:', normalizedCurrentEmail);
        console.log('>>> [Email] Requested:', normalizedNewEmail);

        // --------------------------------------------------------
        // EMAIL WAS CHANGED
        // --------------------------------------------------------

        if (normalizedNewEmail && normalizedNewEmail !== normalizedCurrentEmail) {
          // ------------------------------------------------------
          // BASIC EMAIL VALIDATION
          // ------------------------------------------------------

          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          if (!emailPattern.test(normalizedNewEmail)) {
            throw new Error('Please enter a valid email address.');
          }

          // ------------------------------------------------------
          // CHECK public.users FOR DUPLICATE ACTIVE EMAIL
          // ------------------------------------------------------

          console.log('>>> [Email] Checking public.users for duplicate email...');

          const {
            data: existingEmailUser,
            error: emailCheckError,
          } = await supabase
            .from('users')
            .select('id, uid, email, is_archived')
            .eq('email', normalizedNewEmail)
            .eq('is_archived', false)
            .maybeSingle();

          if (emailCheckError) {
            console.error('>>> [Email] Duplicate email check failed:', emailCheckError);
            throw new Error(
              emailCheckError.message ||
              'Unable to verify whether this email is available.'
            );
          }

          if (existingEmailUser && existingEmailUser.uid !== activeUid) {
            throw new Error('That email is already in use.');
          }

          // ------------------------------------------------------
          // UPDATE SUPABASE AUTH
          // ------------------------------------------------------

          console.log('>>> [Auth] Requesting Supabase Auth email change...');

          const {
            data: emailUpdateData,
            error: emailUpdateError,
          } = await supabase.auth.updateUser(
            { email: normalizedNewEmail },
            { emailRedirectTo: 'https://meditrack-2-tvck.onrender.com/#/login' }
          );

          if (emailUpdateError) {
            console.error('>>> [Auth] Supabase email update failed:', emailUpdateError);
            throw new Error(emailUpdateError.message || 'Failed to request email change.');
          }

          console.log('>>> [Auth] Email change requested successfully:', emailUpdateData);

          isEmailUpdatePending = true;
        }

        // --------------------------------------------------------
        // NEVER SEND EMAIL TO BACKEND
        // --------------------------------------------------------

        sectionData = backendData;
      }

      // ==========================================================
      // UPDATE OTHER PROFILE DATA
      // ==========================================================

      let updatedProfile = { ...profile };

      if (Object.keys(sectionData).length > 0) {
        console.log('>>> [Backend] Sending profile update:', sectionData);

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const headers = await getAuthenticatedApiHeaders();

        const res = await fetch(`${apiUrl}/user/profile`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(sectionData),
        });

        let responseData;

        try {
          responseData = await res.json();
        } catch {
          throw new Error('The server returned an invalid response.');
        }

        if (!res.ok) {
          throw new Error(responseData?.message || 'Failed to update profile.');
        }

        if (responseData?.data) {
          updatedProfile = { ...updatedProfile, ...responseData.data };
        }
      }

      // ==========================================================
      // REFRESH PROFILE FROM DATABASE
      // ==========================================================
      //
      // This keeps the UI synchronized with public.users.
      //
      // IMPORTANT:
      // If an email change is pending verification,
      // public.users.email may intentionally still contain
      // the old email.
      // ==========================================================

      try {
        const {
          data: refreshedProfile,
          error: refreshedProfileError,
        } = await supabase
          .from('users')
          .select('*')
          .eq('uid', activeUid)
          .eq('is_archived', false)
          .maybeSingle();

        if (!refreshedProfileError && refreshedProfile) {
          const currentLocalUser = JSON.parse(localStorage.getItem('user') || '{}');

          updatedProfile = mapDbToProfile(
            refreshedProfile,
            currentLocalUser?.email || profile.email || ''
          );
        }
      } catch (refreshError) {
        console.warn('>>> [Profile] Could not refresh profile after update:', refreshError);
      }

      // ==========================================================
      // SUCCESS MESSAGE
      // ==========================================================

      if (isEmailUpdatePending) {
        showToast('Verification link sent! Please check your new email inbox to confirm the change.');
      } else {
        showToast(t('messages.profileUpdated'));
      }

      // ==========================================================
      // UPDATE LOCAL UI
      // ==========================================================

      setProfile(updatedProfile);

      // Keep the UI user cache synchronized.
      //
      // Do NOT store access_token or refresh_token here.
      // Supabase manages those tokens.
      try {
        const existingLocalUser = JSON.parse(localStorage.getItem('user') || '{}');

        localStorage.setItem('user', JSON.stringify({
          ...existingLocalUser,
          uid: activeUid,
          email: isEmailUpdatePending ? (existingLocalUser.email || profile.email) : updatedProfile.email,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          middleName: updatedProfile.middleName,
          suffix: updatedProfile.suffix,
          role: updatedProfile.role,
          universityId: updatedProfile.universityId,
          department: updatedProfile.department,
          program: updatedProfile.program,
          section: updatedProfile.section,
        }));
      } catch (storageError) {
        console.warn('[ProfileUsers] Failed to update local user cache:', storageError);
      }

      closeEdit();

      console.log('>>> [Profile] Profile update completed successfully.');
    } catch (err) {
      console.error('>>> [Profile] Error updating profile:', err);
      showToast(err?.message || t('messages.profileUpdateFailed'));
    } finally {
      console.log('=== SAVE PROFILE END ===');
      setIsSaving(false);
    }
  };

  if ((loading || isConfigLoading) && !profile.email) return <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#466460', fontSize: 13, fontWeight: 600 }}>{t('messages.loadingProfile')}</div>;
  const clsColors = classificationColors[profile.studentClassification] || classificationColors.Regular;

  // We map DOSE_LABELS dynamically based on JSON config here
  const DOSE_LABELS_MAPPED = [
    { key: 'dose1', label: t('vaccination.dose1') },
    { key: 'dose2', label: t('vaccination.dose2') },
    { key: 'booster1', label: t('vaccination.booster1') },
    { key: 'booster2', label: t('vaccination.booster2') }
  ];

  return (
    <>
      <div ref={scrollElRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14, scrollbarWidth: 'none', touchAction: 'pan-y' }}>
        <style>{ptrStyles}</style>
        <PullIndicator indicatorRef={indicatorRef} />

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#1a2e22', fontFamily: "'DM Serif Display', serif", lineHeight: 1.2 }}>{fullName || 'No Name Set'}</div>
              <div style={{ fontSize: 11, color: '#6b8577', marginTop: 3, fontWeight: 500 }}>{isStudent ? (profile.program || profile.department || 'Student') : (profile.jobTitle || profile.classification || 'Personnel')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ background: '#e0eceb', padding: '4px 12px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: '#466460' }}>{isStudent ? `ID: ${profile.universityId}` : profile.classification}</div>
              {isStudent && profile.studentClassification && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: clsColors.bg, padding: '3px 10px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: clsColors.text }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: clsColors.dot, display: 'inline-block' }} />{profile.studentClassification}
                </div>
              )}
              <div style={{ background: '#f4f7f5', padding: '3px 10px', borderRadius: 40, fontSize: 10, fontWeight: 600, color: '#6b8577', textTransform: 'capitalize' }}>{profile.role || 'student'}</div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader label={t('profile.personalInformation')} onEdit={() => openEdit('personal')} hasEmpty={hasEmptyPersonal} />
          <InfoRow label={t('profile.birthday')} value={profile.birthday ? userDate(profile.birthday) : ''} empty={isFieldEmpty(profile.birthday)} />
          <InfoRow label={t('profile.age')} value={profile.age} empty={isFieldEmpty(profile.age)} />
          <InfoRow label={t('profile.sex')} value={profile.sex} empty={isFieldEmpty(profile.sex)} />
          <InfoRow label={t('profile.bloodType')} value={profile.bloodType} empty={isFieldEmpty(profile.bloodType)} />
          <InfoRow label={t('profile.civilStatus')} value={profile.civilStatus} empty={isFieldEmpty(profile.civilStatus)} />
          <InfoRow label={t('profile.religion')} value={profile.religion} empty={isFieldEmpty(profile.religion)} />
          <InfoRow label={t('profile.nationality')} value={profile.nationality} empty={isFieldEmpty(profile.nationality)} />
          <InfoRow label={t('profile.homeAddress')} value={profile.homeAddress} empty={isFieldEmpty(profile.homeAddress)} last />
        </Card>

        <Card id="academic-section">
          <SectionHeader label={isStudent ? t('profile.academicInformation') : 'Work Information'} onEdit={() => openEdit('academic')} hasEmpty={isStudent ? hasAcademicAttention : hasEmptyAcademic} />
          {isStudent && academicUpdateRequired && (
            <div style={{ marginBottom: 10, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, color: '#92400e' }}>
              <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 3 }}>{t('profile.pleaseReviewAcademic')}</div>
              <div style={{ fontSize: 11, lineHeight: 1.5 }}>{t('profile.confirmAcademic')}</div>
            </div>
          )}
          {isStudent ? (
            <>
              <InfoRow label={t('profile.studentNumber')} value={profile.universityId || profile.studentId} empty={isFieldEmpty(profile.universityId || profile.studentId)} />
              <InfoRow label={t('profile.department')} value={profile.department} empty={isFieldEmpty(profile.department)} />
              <InfoRow label={t('profile.program')} value={profile.program} empty={isFieldEmpty(profile.program)} />
              <InfoRow label={t('profile.yearLevel')} value={profile.yearLevel} empty={isFieldEmpty(profile.yearLevel)} attention={academicUpdateRequired} />
              <InfoRow label={t('profile.section')} value={profile.section} empty={isFieldEmpty(profile.section)} attention={academicUpdateRequired} />
              <InfoRow label={t('profile.classification')} value={profile.studentClassification} empty={isFieldEmpty(profile.studentClassification)} last />
            </>
          ) : (
            <>
              <InfoRow label={t('profile.classification')} value={profile.classification} empty={isFieldEmpty(profile.classification)} />
              <InfoRow label={t('profile.department')} value={profile.department} empty={isFieldEmpty(profile.department)} />
              <InfoRow label={t('profile.jobTitle')} value={profile.jobTitle} last />
            </>
          )}
        </Card>

        <Card>
          <SectionHeader label={t('profile.contactDetails')} onEdit={() => openEdit('contact')} hasEmpty={hasEmptyContact} />
          <InfoRow label={t('profile.email')} value={profile.email} empty={isFieldEmpty(profile.email)} />
          <InfoRow label={t('profile.phoneNumber')} value={profile.phoneNumber} empty={isFieldEmpty(profile.phoneNumber)} last />
        </Card>

        <Card id="emergency-section">
          <SectionHeader label={t('profile.emergencyContact')} onEdit={() => openEdit('emergency')} hasEmpty={hasEmptyEmergency} />
          <InfoRow label={t('profile.emergencyName')} value={profile.emergencyContact?.name} empty={isFieldEmpty(profile.emergencyContact?.name)} />
          <InfoRow label={t('profile.relationship')} value={profile.emergencyContact?.relationship} empty={isFieldEmpty(profile.emergencyContact?.relationship)} />
          <InfoRow label={t('profile.emergencyPhone')} value={profile.emergencyContact?.phone} empty={isFieldEmpty(profile.emergencyContact?.phone)} />
          <InfoRow label={t('profile.emergencyAddress')} value={profile.emergencyContact?.address} empty={isFieldEmpty(profile.emergencyContact?.address)} last />
        </Card>

        <Card id="vaccinations-section">
          <SectionHeader label={`COVID-19 ${t('profile.vaccinationHistory')}`} onEdit={() => openEdit('vaccinations')} hasEmpty={hasEmptyVaccinations} />
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #edf3f0' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Dose</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>{t('vaccination.vaccineName')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase', textAlign: 'right' }}>{t('vaccination.date')}</span>
          </div>
          {DOSE_LABELS_MAPPED.map(({ key, label }) => {
            const v = profile.vaccinations?.[key], isDeclined = profile.vaccinations?.declined?.[key];
            const doseEmpty = !v?.vaccineName && !v?.date, showEmpty = !isDeclined && doseEmpty;
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, padding: '9px 0', borderBottom: '1px solid #edf3f0', alignItems: 'center', backgroundColor: isDeclined ? '#e0eceb' : showEmpty ? '#fffbeb' : 'transparent', marginLeft: isDeclined || showEmpty ? -16 : 0, marginRight: isDeclined || showEmpty ? -16 : 0, paddingLeft: isDeclined || showEmpty ? 16 : 0, paddingRight: isDeclined || showEmpty ? 16 : 0, borderRadius: isDeclined || showEmpty ? '8px' : 0 }}>
                <span style={{ background: '#e0eceb', color: '#466460', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textAlign: 'center', width: 'fit-content' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDeclined ? '#466460' : showEmpty ? '#92400e' : '#1a2e22' }}>{isDeclined ? 'N/A' : doseEmpty ? 'Not recorded' : fmt(v?.vaccineName)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isDeclined ? '#466460' : showEmpty ? '#92400e' : '#6b8577', textAlign: 'right' }}>{isDeclined ? '' : doseEmpty ? '—' : userDate(v?.date)}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 12, paddingTop: 10 }}>
            <InfoRow label="COVID-19 History" value={profile.vaccinations?.declined?.history ? 'N/A' : profile.vaccinations?.history} empty={!profile.vaccinations?.declined?.history && isFieldEmpty(profile.vaccinations?.history)} last />
          </div>
        </Card>

        <Card id="dental-section">
          <SectionHeader label={t('profile.dentalInformation')} onEdit={() => openEdit('dental')} hasEmpty={hasEmptyDental} />
          {profile.dentalHistory?.declined ? (
            <div style={{ padding: '12px 16px', background: '#e0eceb', borderRadius: 10, marginTop: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#466460' }}>No dental history / Not applicable</span></div>
          ) : (
            <>
              <InfoRow label="Last Dental Visit" value={profile.dentalHistory?.lastVisit ? userDate(profile.dentalHistory.lastVisit) : ''} empty={isFieldEmpty(profile.dentalHistory?.lastVisit)} />
              <InfoRow label="Previous Dentist" value={profile.dentalHistory?.prevDentist ? `Dr. ${profile.dentalHistory.prevDentist}` : ''} empty={isFieldEmpty(profile.dentalHistory?.prevDentist)} last />
            </>
          )}
        </Card>

        <Card id="surgical-section">
          <SectionHeader label={t('profile.surgicalHistory')} onEdit={() => openEdit('surgical')} hasEmpty={hasEmptySurgical} />
          {profile.surgicalHistory?.declined ? (
            <div style={{ padding: '12px 16px', background: '#e0eceb', borderRadius: 10, marginTop: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#466460' }}>No surgical history / Not applicable</span></div>
          ) : profile.surgicalHistory?.operations?.length ? (
            profile.surgicalHistory.operations.map((op, i) => (
              <InfoRow key={op.id || i} label={op.operation || 'Operation'} value={[op.date ? userDate(op.date) : '', op.notes].filter(Boolean).join(' · ')} empty={!op.date && !op.notes} last={i === profile.surgicalHistory.operations.length - 1} />
            ))
          ) : (
            <p style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic', padding: '12px 0', textAlign: 'center', margin: 0 }}>No surgical history recorded.</p>
          )}
        </Card>

        {!isStudent && (
          <Card>
            <SectionHeader label={t('profile.documents')} />
            <p style={{ fontSize: 11, color: '#6b8577', margin: '-4px 0 14px', lineHeight: 1.5 }}>Upload X-rays, drug test results, or other clinic-required documents. PDF, JPG, or PNG · max 5MB each.</p>
            {(profile.documents || []).length === 0 && !uploadingDocs && (
              <p style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic', padding: '12px 0', textAlign: 'center', margin: 0 }}>{t('profile.noDocuments')}</p>
            )}
            {(profile.documents || []).map(doc => (
              <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #edf3f0' }}>
                <button type="button" onClick={() => handleViewDocument(doc)} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1a2e22', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                  <span style={{ color: '#466460', flexShrink: 0 }}><DocIcon /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{doc.name}</span>
                    <span style={{ fontSize: 10, color: '#9bb5a5' }}>{doc.uploadedAt ? userDate(doc.uploadedAt) : '—'}</span>
                  </span>
                </button>
                <button type="button" onClick={() => setDocToDelete(doc)} style={{ background: '#fef2f2', color: '#e07a5f', border: 'none', width: 26, height: 26, borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>×</button>
              </div>
            ))}
            <button type="button" onClick={() => documentsInputRef.current?.click()} disabled={uploadingDocs} style={{ width: '100%', marginTop: 12, background: uploadingDocs ? '#9bb5a5' : '#466460', color: '#fff', border: 'none', padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: uploadingDocs ? 'not-allowed' : 'pointer' }}>
              {uploadingDocs ? t('common.uploading') : `+ ${t('documents.upload')}`}
            </button>
            <input ref={documentsInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple hidden onChange={handleDocumentUpload} />
          </Card>
        )}
      </div>

      {docToDelete && createPortal(
        <div onClick={(e) => { if (e.target === e.currentTarget && !isDeletingDoc) setDocToDelete(null); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26, 46, 34, 0.45)', backdropFilter: 'blur(3px)', zIndex: 99997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, padding: 24, boxShadow: '0 12px 35px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#1a2e22' }}>{t('documents.delete')}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#6b8577', lineHeight: 1.5 }}>{t('documents.deleteConfirmation')} <strong style={{ color: '#1a2e22', wordBreak: 'break-all' }}>"{docToDelete.name}"</strong>? {t('profile.permanentDelete')}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" disabled={isDeletingDoc} onClick={() => setDocToDelete(null)} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #c4dbd8', background: '#fbfcfc', color: '#6b8577', fontSize: 12, fontWeight: 700, cursor: isDeletingDoc ? 'not-allowed' : 'pointer' }}>{t('common.cancel')}</button>
              <button type="button" disabled={isDeletingDoc} onClick={confirmDeleteDocument} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#e07a5f', color: '#fff', fontSize: 12, fontWeight: 700, cursor: isDeletingDoc ? 'not-allowed' : 'pointer', opacity: isDeletingDoc ? 0.7 : 1 }}>{isDeletingDoc ? t('common.removing') : t('common.remove')}</button>
            </div>
          </div>
        </div>, document.body
      )}

      {editingSection && createPortal(
        <div onClick={e => e.target === e.currentTarget && closeEdit()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26, 46, 34, 0.4)', backdropFilter: 'blur(3px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
            <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #edf3f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#466460', textTransform: 'capitalize' }}>{t('common.edit')} {editingSection} Info</span>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: '#9bb5a5', cursor: 'pointer', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

              {/* Personal */}
              {editingSection === 'personal' && (
                <>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label={t('profile.firstName')}><input style={inputStyle} value={editData.firstName} onChange={e => handleChange('firstName', toTitleCase(e.target.value))} onBlur={e => handleChange('firstName', toTitleCase(e.target.value))} /></FormGroup>
                    <FormGroup label={t('profile.middleName')}><input style={{ ...inputStyle, width: 120 }} value={editData.middleName} onChange={e => handleChange('middleName', toTitleCase(e.target.value))} onBlur={e => handleChange('middleName', toTitleCase(e.target.value))} /></FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label={t('profile.lastName')}><input style={{ ...inputStyle, flex: 1 }} value={editData.lastName} onChange={e => handleChange('lastName', toTitleCase(e.target.value))} onBlur={e => handleChange('lastName', toTitleCase(e.target.value))} /></FormGroup>
                    <FormGroup label={t('profile.suffix')}><CustomSelect style={{ width: 100 }} value={editData.suffix} onChange={val => handleChange('suffix', val)} options={SUFFIXES} /></FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><FormGroup label={t('profile.birthday')}><DatePicker value={editData.birthday || ''} onChange={val => handleChange('birthday', val)} /></FormGroup></div>
                    <FormGroup label={t('profile.ageAuto')}><input type="text" style={{ ...inputStyle, width: 80, backgroundColor: '#f4f7f5', cursor: 'not-allowed' }} value={editData.age} readOnly /></FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label={t('profile.sex')}><CustomSelect value={editData.sex} onChange={val => handleChange('sex', val)} options={SEX_OPTIONS} /></FormGroup>
                    <FormGroup label={t('profile.bloodType')}><CustomSelect value={editData.bloodType} onChange={val => handleChange('bloodType', val)} options={BLOOD_TYPES} /></FormGroup>
                  </div>
                  <FormGroup label={t('profile.civilStatus')}><CustomSelect value={editData.civilStatus} onChange={val => handleChange('civilStatus', val)} options={CIVIL_STATUSES} /></FormGroup>
                  <FormGroup label={t('profile.religion')}><CustomSelect value={editData.religion} onChange={val => handleChange('religion', val)} options={RELIGIONS} dropUp={true} /></FormGroup>
                  <FormGroup label={t('profile.nationality')}><CustomSelect value={editData.nationality} onChange={val => handleChange('nationality', val)} options={NATIONALITIES} dropUp={true} /></FormGroup>
                  <FormGroup label={t('profile.homeAddress')}>
                    <button type="button" onClick={() => openAddressModal('personal')} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: editData.homeAddress ? '#1a2e22' : '#9bb5a5' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editData.homeAddress || t('profile.selectAddress')}</span>
                      <span style={{ flexShrink: 0, color: '#466460' }}><EditIcon /></span>
                    </button>
                  </FormGroup>
                </>
              )}

              {/* Academic - Student */}
              {editingSection === 'academic' && isStudent && (
                <>
                  {academicUpdateRequired && (
                    <div style={{ marginBottom: 14, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, color: '#92400e', fontSize: 11, lineHeight: 1.5 }}>
                      <strong>{t('profile.pleaseReviewAcademic')}</strong> {t('profile.confirmAcademic')}
                    </div>
                  )}
                  <FormGroup label={t('profile.studentNumber')}><input style={inputStyle} value={editData.universityId || editData.studentId} onChange={e => handleChange('universityId', e.target.value)} /></FormGroup>
                  <FormGroup label={t('profile.department')}><CustomSelect value={editData.department} onChange={val => { handleChange('department', val); handleChange('program', ''); }} options={departmentOptions} /></FormGroup>
                  <FormGroup label={t('profile.program')}><CustomSelect value={editData.program} onChange={val => handleChange('program', val)} options={availablePrograms} /></FormGroup>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label={t('profile.yearLevel')}><CustomSelect value={editData.yearLevel} onChange={val => handleChange('yearLevel', val)} options={YEAR_LEVELS} dropUp={true} /></FormGroup>
                    <FormGroup label={t('profile.section')}><CustomSelect value={editData.section} onChange={val => handleChange('section', val)} options={configData.sections || []} dropUp={true} /></FormGroup>
                  </div>
                  <FormGroup label={t('profile.studentClassification')}>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {STUDENT_CLASSIFICATIONS.map(cls => {
                        const isActive = editData.studentClassification === cls, colors = classificationColors[cls];
                        return (
                          <button key={cls} type="button" onClick={() => handleChange('studentClassification', cls)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${isActive ? colors.dot : '#c4dbd8'}`, background: isActive ? colors.bg : '#fbfcfc', color: isActive ? colors.text : '#94a3b8', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? colors.dot : '#cbd5d1', flexShrink: 0 }} />{cls}
                          </button>
                        );
                      })}
                    </div>
                  </FormGroup>
                </>
              )}

              {/* Academic - Staff */}
              {editingSection === 'academic' && !isStudent && (
                <>
                  <FormGroup label={t('profile.classification')}><CustomSelect value={editData.classification} onChange={val => handleChange('classification', val)} options={uniqueClassifications} /></FormGroup>
                  <FormGroup label={t('profile.department')}><CustomSelect value={editData.department} onChange={val => handleChange('department', val)} options={configData.non_academic_offices} /></FormGroup>
                  <FormGroup label={t('profile.jobTitle')}><CustomSelect value={editData.jobTitle} onChange={val => handleChange('jobTitle', val)} options={uniqueJobTitles} /></FormGroup>
                  <FormGroup label={t('profile.licenseNumber')}><input style={inputStyle} value={editData.licenseNumber || ''} placeholder="e.g., PRC-123456" onChange={e => handleChange('licenseNumber', e.target.value.toUpperCase())} /></FormGroup>
                </>
              )}

              {/* Contact */}
              {editingSection === 'contact' && (
                <>
                  <FormGroup label={t('profile.email')}><input style={inputStyle} type="email" value={editData.email} onChange={e => handleChange('email', e.target.value)} /></FormGroup>
                  <FormGroup label={`${t('profile.phoneNumber')} (11 digits)`}>
                    <input style={inputStyle} value={editData.phoneNumber} placeholder="09123456789" maxLength={11} onChange={e => handleChange('phoneNumber', formatPhoneNumber(e.target.value))} onBlur={e => { if (e.target.value && !isValidPhoneNumber(e.target.value)) alert('Phone number must be exactly 11 digits (e.g., 09123456789)'); }} />
                    <span style={{ fontSize: 10, color: '#9bb5a5' }}>Format: 09XXXXXXXXX (11 digits)</span>
                  </FormGroup>
                  <p style={{ fontSize: 11, color: '#9bb5a5', marginTop: -4 }}>Note: Changing your email may require you to verify your identity by signing in again.</p>
                </>
              )}

              {/* Emergency */}
              {editingSection === 'emergency' && (
                <>
                  <FormGroup label={t('profile.emergencyName')}><input style={inputStyle} value={editData.emergencyContact?.name} onChange={e => handleNestedChange('emergencyContact', 'name', toTitleCase(e.target.value))} onBlur={e => handleNestedChange('emergencyContact', 'name', toTitleCase(e.target.value))} /></FormGroup>
                  <FormGroup label={t('profile.relationship')}><CustomSelect value={editData.emergencyContact?.relationship} onChange={val => handleNestedChange('emergencyContact', 'relationship', val)} options={EMERGENCY_RELATIONSHIPS} /></FormGroup>
                  <FormGroup label={`${t('profile.emergencyPhone')} (11 digits)`}><input style={inputStyle} value={editData.emergencyContact?.phone} placeholder="09123456789" maxLength={11} onChange={e => handleNestedChange('emergencyContact', 'phone', formatPhoneNumber(e.target.value))} onBlur={e => { if (e.target.value && !isValidPhoneNumber(e.target.value)) alert('Phone number must be exactly 11 digits (e.g., 09123456789)'); }} /></FormGroup>
                  <FormGroup label={t('profile.emergencyAddress')}>
                    <button type="button" onClick={() => openAddressModal('emergency')} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: editData.emergencyContact?.address ? '#1a2e22' : '#9bb5a5' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editData.emergencyContact?.address || t('profile.selectAddress')}</span>
                      <span style={{ flexShrink: 0, color: '#466460' }}><EditIcon /></span>
                    </button>
                  </FormGroup>
                </>
              )}

              {/* Vaccinations */}
              {editingSection === 'vaccinations' && (
                <>
                  {DOSE_LABELS_MAPPED.map(({ key, label }) => {
                    const isDeclined = vaccinationsDeclined[key];
                    return (
                      <div key={key} style={{ background: isDeclined ? '#fef3c7' : '#f4f7f5', padding: 16, borderRadius: 12, marginBottom: 16, border: isDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 800, color: '#466460', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={isDeclined} onChange={e => { setVaccinationsDeclined(prev => ({ ...prev, [key]: e.target.checked })); setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, declined: { ...(prev.vaccinations?.declined || {}), [key]: e.target.checked } } })); }} style={{ accentColor: '#466460', width: 16, height: 16 }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: isDeclined ? '#92400e' : '#6b8577' }}>N/A</span>
                          </label>
                        </div>
                        {!isDeclined && (
                          <>
                            <FormGroup label={t('vaccination.vaccineName')}><CustomSelect style={{ backgroundColor: '#fff' }} value={editData.vaccinations[key]?.vaccineName || ''} onChange={val => handleVaxChange(key, 'vaccineName', val)} options={VACCINE_BRANDS} /></FormGroup>
                            <FormGroup label={t('vaccination.date')}><DatePicker value={editData.vaccinations[key]?.date || ''} onChange={val => handleVaxChange(key, 'date', val)} /></FormGroup>
                          </>
                        )}
                        {isDeclined && <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Skipped / Not applicable</span>}
                      </div>
                    );
                  })}
                  <div style={{ background: vaccinationsDeclined.history ? '#fef3c7' : '#f4f7f5', padding: 16, borderRadius: 12, marginBottom: 16, border: vaccinationsDeclined.history ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: vaccinationsDeclined.history ? 0 : 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#466460', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>COVID-19 History</p>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={vaccinationsDeclined.history || false} onChange={e => { setVaccinationsDeclined(prev => ({ ...prev, history: e.target.checked })); setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, declined: { ...(prev.vaccinations?.declined || {}), history: e.target.checked } } })); }} style={{ accentColor: '#466460', width: 16, height: 16 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: vaccinationsDeclined.history ? '#92400e' : '#6b8577' }}>N/A</span>
                      </label>
                    </div>
                    {!vaccinationsDeclined.history ? (
                      <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80, backgroundColor: '#fff' }} placeholder="Date of infection, severity, treatment, recovery details..." value={editData.vaccinations?.history || ''} onChange={e => handleCovidHistoryChange(e.target.value)} />
                    ) : <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#92400e' }}>Not applicable / No history</div>}
                  </div>
                </>
              )}

              {/* Dental */}
              {editingSection === 'dental' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: dentalDeclined ? '#fef3c7' : '#f4f7f5', borderRadius: 10, marginBottom: 16, cursor: 'pointer', border: dentalDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                    <input type="checkbox" checked={dentalDeclined} onChange={e => { setDentalDeclined(e.target.checked); setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, declined: e.target.checked } })); }} style={{ accentColor: '#466460', width: 18, height: 18 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: dentalDeclined ? '#92400e' : '#466460' }}>I don't have dental history / Not applicable</span>
                  </label>
                  {!dentalDeclined && (
                    <>
                      <FormGroup label="Last Dental Visit"><DatePicker value={editData.dentalHistory.lastVisit || ''} onChange={val => handleDentalChange('lastVisit', val)} /></FormGroup>
                      <FormGroup label="Previous Dentist (Dr.)"><input style={inputStyle} value={editData.dentalHistory.prevDentist} placeholder="e.g. Smith" onChange={e => handleDentalChange('prevDentist', e.target.value)} /></FormGroup>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#466460', margin: '24px 0 12px 0', textTransform: 'uppercase', borderTop: '1px solid #edf3f0', paddingTop: 20, letterSpacing: 0.5 }}>Procedures History</p>
                      {DENTAL_PROCEDURES.map(proc => {
                        const isYes = editData.dentalHistory.procedures?.[proc] === 'Yes', isNo = editData.dentalHistory.procedures?.[proc] === 'No' || !editData.dentalHistory.procedures?.[proc];
                        return (
                          <div key={proc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: '#1a2e22', background: '#fbfcfc', border: '1px solid #edf3f0', padding: '10px 14px', borderRadius: 10 }}>
                            <span style={{ fontWeight: 600 }}>{proc}</span>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}><input type="radio" name={`modal_dh_${proc}`} checked={isYes} onChange={() => handleDentalProcChange(proc, 'Yes')} style={{ accentColor: '#466460' }} />{t('common.yes')}</label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}><input type="radio" name={`modal_dh_${proc}`} checked={isNo} onChange={() => handleDentalProcChange(proc, 'No')} style={{ accentColor: '#466460' }} />{t('common.no')}</label>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}

              {/* Surgical */}
              {editingSection === 'surgical' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: surgicalDeclined ? '#fef3c7' : '#f4f7f5', borderRadius: 10, marginBottom: 16, cursor: 'pointer', border: surgicalDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                    <input type="checkbox" checked={surgicalDeclined} onChange={e => { setSurgicalDeclined(e.target.checked); setEditData(prev => ({ ...prev, surgicalHistory: { ...prev.surgicalHistory, declined: e.target.checked } })); }} style={{ accentColor: '#466460', width: 18, height: 18 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: surgicalDeclined ? '#92400e' : '#466460' }}>I don't have surgical history / Not applicable</span>
                  </label>
                  {!surgicalDeclined && (
                    <>
                      {(editData.surgicalHistory?.operations || []).length === 0 ? (
                        <p style={{ fontSize: 12, color: '#9bb5a5', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No operations added yet.</p>
                      ) : (
                        editData.surgicalHistory.operations.map(op => (
                          <div key={op.id} style={{ position: 'relative', background: '#fbfcfc', border: '1px solid #edf3f0', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                            <button type="button" onClick={() => handleRemoveOperation(op.id)} style={{ position: 'absolute', top: 10, right: 10, background: '#e07a5f', color: '#fff', border: 'none', width: 22, height: 22, borderRadius: 6, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
                            <FormGroup label="Operation Name"><input style={inputStyle} placeholder="Operation/Procedure Name" value={op.operation} onChange={e => handleOperationChange(op.id, 'operation', e.target.value)} /></FormGroup>
                            <FormGroup label="Date"><DatePicker value={op.date || ''} onChange={val => handleOperationChange(op.id, 'date', val)} /></FormGroup>
                            <FormGroup label="Notes"><input style={inputStyle} placeholder="Hospital / complications" value={op.notes} onChange={e => handleOperationChange(op.id, 'notes', e.target.value)} /></FormGroup>
                          </div>
                        ))
                      )}
                      <button type="button" onClick={handleAddOperation} style={{ width: '100%', background: '#466460', color: '#fff', border: 'none', padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add Operation</button>
                    </>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #edf3f0', display: 'flex', gap: 12, background: '#fff' }}>
              <button onClick={closeEdit} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#f4f7f5', cursor: 'pointer', fontWeight: 600, color: '#6b8577' }}>{t('common.cancel')}</button>

              <button
                type="button"
                onClick={async () => {
                  console.log(">>> BUTTON CLICKED EXPLICITLY");
                  await saveProfileEdits();
                }}
                disabled={isSaving}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#466460', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      <AddressModal isOpen={addressModalOpen} onClose={closeAddressModal} onConfirm={handleAddressConfirm} initialData={addressInitialData} zIndex={100000} />
      <DocViewerModal isOpen={previewOpen} onClose={() => { setPreviewOpen(false); setPreviewDoc(null); }} doc={previewDoc} preferences={profile.preferences} getSignedUrl={getSignedUrl} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#466460', color: '#fff', padding: '12px 24px', borderRadius: 40, fontSize: 13, fontWeight: 600, zIndex: 5000, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast}
        </div>
      )}
    </>
  );
}