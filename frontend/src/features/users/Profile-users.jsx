import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker.jsx';
import AddressModal from '../../components/AddressModal.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// ─── Constants ────────────────────────────────────────────────────────────────
const DOCUMENTS_BUCKET = 'health-documents';
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

// ─── Icons ────────────────────────────────────────────────────────────────────
const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) => (!val || val === '') ? '—' : val;

const SectionHeader = ({ label, onEdit, hasEmpty }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: hasEmpty ? '#92400e' : '#466460', borderLeft: `3px solid ${hasEmpty ? '#f59e0b' : '#466460'}`, paddingLeft: 8 }}>
        {label}
      </div>
      {hasEmpty && (
        <span style={{ fontSize: 9, fontWeight: 700, color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: 10 }}>
          INCOMPLETE
        </span>
      )}
    </div>
    {onEdit && (
      <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#466460', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, backgroundColor: '#e0eceb' }}>
        <EditIcon /> Edit
      </button>
    )}
  </div>
);

const InfoRow = ({ label, value, last, empty }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #edf3f0', backgroundColor: empty ? '#fffbeb' : 'transparent', marginLeft: empty ? -16 : 0, marginRight: empty ? -16 : 0, paddingLeft: empty ? 16 : 0, paddingRight: empty ? 16 : 0, borderRadius: empty ? '8px' : 0 }}>
    <span style={{ fontWeight: 600, fontSize: 12, color: '#6b8577', flexShrink: 0, marginRight: 12 }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: 13, color: empty ? '#92400e' : '#1a2e22', textAlign: 'right' }}>{fmt(value)}</span>
  </div>
);

const Card = ({ children, style, id }) => (
  <div id={id} style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #edf3f0', ...style }}>
    {children}
  </div>
);

const FormGroup = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#6b8577', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #c4dbd8',
  fontSize: 13,
  backgroundColor: '#fbfcfc',
  color: '#1a2e22',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border 0.2s',
};

// ─── Custom Select (dropdown) ─────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder = 'Select', style, dropUp = false }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const normalized = options.map(opt =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: opt }
  );
  const currentOption = normalized.find(o => o.value === value);
  const currentLabel = currentOption ? currentOption.label : placeholder;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '11px 14px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          border: `1px solid ${open ? '#81b29a' : '#c4dbd8'}`,
          background: '#fbfcfc',
          color: currentOption ? '#1a2e22' : '#9bb5a5',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          boxSizing: 'border-box',
          transition: 'border 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentLabel}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="3"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: dropUp ? 'auto' : 'calc(100% + 6px)',
            bottom: dropUp ? 'calc(100% + 6px)' : 'auto',
            background: '#fff', border: '1px solid #c4dbd8', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', zIndex: 100,
            maxHeight: 240, overflowY: 'auto',
          }}
        >
          {normalized.map(opt => {
            const isActive = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: isActive ? '#e0eceb' : 'transparent',
                  color: isActive ? '#466460' : '#1a2e22',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Standard Static Arrays ───────────────────────────────────────────────────
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

const normalizeName = (name) => {
  if (!name) return '';
  let trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const isValidPhoneNumber = (phone) => {
  if (!phone) return true;
  return /^09\d{9}$/.test(phone);
};

const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  if (digits.startsWith('63')) return '0' + digits.substring(2);
  return digits;
};

const calculateAge = (birthday) => {
  if (!birthday) return '';
  const today = new Date();
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return '';
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? age.toString() : '';
};

const classificationColors = {
  Regular: { bg: '#e0eceb', text: '#466460', dot: '#466460' },
  Irregular: { bg: '#fff7e6', text: '#92400e', dot: '#f59e0b' },
  Returning: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

const DENTAL_PROCEDURES = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

const DOSE_LABELS = [
  { key: 'dose1', label: 'Dose 1' },
  { key: 'dose2', label: 'Dose 2' },
  { key: 'booster1', label: 'Booster 1' },
  { key: 'booster2', label: 'Booster 2' },
];

const ptrStyles = `
  @keyframes ptr-spin { to { transform: rotate(360deg); } }
  [data-spin="true"]  [data-ptr-icon] { display: none;  }
  [data-spin="true"]  [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none;  }
`;

const PullIndicator = ({ indicatorRef }) => (
  <div
    ref={indicatorRef}
    data-spin="false"
    style={{
      overflow: 'hidden',
      height: 0,
      opacity: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'height 0.2s ease, opacity 0.2s ease',
    }}
  >
    <svg data-ptr-icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
    <svg data-ptr-spin width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2.5" style={{ animation: 'ptr-spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3 a9 9 0 0 1 9 9" />
    </svg>
  </div>
);

// ─── DB → component shape mapper ──────────────────────────────────────────────
const mapDbToProfile = (profileData, fallbackEmail = '') => ({
  firstName: profileData.first_name || '',
  middleName: profileData.middle_name || '',
  lastName: profileData.last_name || '',
  suffix: profileData.suffix || '',
  birthday: profileData.birthday || '',
  age: profileData.age || '',
  sex: profileData.sex || '',
  bloodType: profileData.blood_type || '',
  homeAddress: profileData.home_address || '',
  addressCountry: profileData.address_country || '',
  addressRegion: profileData.address_region || '',
  addressRegionCode: profileData.address_region_code || '',
  addressProvince: profileData.address_province || '',
  addressProvinceCode: profileData.address_province_code || '',
  addressCity: profileData.address_city || '',
  addressCityCode: profileData.address_city_code || '',
  addressBarangay: profileData.address_barangay || '',
  addressBarangayCode: profileData.address_barangay_code || '',
  addressStreet: profileData.address_street || '',
  addressZipCode: profileData.address_zip_code || '',
  religion: profileData.religion || '',
  nationality: profileData.nationality || '',
  civilStatus: profileData.civil_status || '',
  universityId: profileData.university_id || '',
  role: profileData.role || '',
  studentId: profileData.student_id || '',
  department: profileData.department || '',
  program: profileData.program || '',
  yearLevel: profileData.year_level || '',
  section: profileData.section || '',
  studentClassification: profileData.student_classification || 'Regular',
  classification: profileData.classification || '',
  jobTitle: profileData.job_title || '',
  licenseNumber: profileData.license_number || '',
  email: profileData.email || fallbackEmail,
  phoneNumber: profileData.phone_number || '',
  emergencyContact: {
    name: profileData.emergency_contact?.name || '',
    relationship: profileData.emergency_contact?.relationship || '',
    phone: profileData.emergency_contact?.phone || '',
    address: profileData.emergency_contact?.address || '',
    addressCountry: profileData.emergency_contact?.addressCountry || '',
    addressRegion: profileData.emergency_contact?.addressRegion || '',
    addressRegionCode: profileData.emergency_contact?.addressRegionCode || '',
    addressProvince: profileData.emergency_contact?.addressProvince || '',
    addressProvinceCode: profileData.emergency_contact?.addressProvinceCode || '',
    addressCity: profileData.emergency_contact?.addressCity || '',
    addressCityCode: profileData.emergency_contact?.addressCityCode || '',
    addressBarangay: profileData.emergency_contact?.addressBarangay || '',
    addressBarangayCode: profileData.emergency_contact?.addressBarangayCode || '',
    addressStreet: profileData.emergency_contact?.addressStreet || '',
    addressZipCode: profileData.emergency_contact?.addressZipCode || '',
  },
  vaccinations: {
    dose1: { vaccineName: profileData.vaccinations?.dose1?.vaccineName || '', date: profileData.vaccinations?.dose1?.date || '' },
    dose2: { vaccineName: profileData.vaccinations?.dose2?.vaccineName || '', date: profileData.vaccinations?.dose2?.date || '' },
    booster1: { vaccineName: profileData.vaccinations?.booster1?.vaccineName || '', date: profileData.vaccinations?.booster1?.date || '' },
    booster2: { vaccineName: profileData.vaccinations?.booster2?.vaccineName || '', date: profileData.vaccinations?.booster2?.date || '' },
    history: profileData.vaccinations?.history || '',
    declined: typeof profileData.vaccinations?.declined === 'object' ? {
      dose1: !!profileData.vaccinations.declined.dose1,
      dose2: !!profileData.vaccinations.declined.dose2,
      booster1: !!profileData.vaccinations.declined.booster1,
      booster2: !!profileData.vaccinations.declined.booster2,
      history: !!profileData.vaccinations.declined.history
    } : (profileData.vaccinations?.declined ? { dose1: true, dose2: true, booster1: true, booster2: true, history: true } : { dose1: false, dose2: false, booster1: false, booster2: false, history: false }),
  },
  dentalHistory: {
    lastVisit: profileData.dental_history?.lastVisit || '',
    prevDentist: profileData.dental_history?.prevDentist || '',
    procedures: profileData.dental_history?.procedures || {},
    declined: profileData.dental_history?.declined || false,
  },
  surgicalHistory: {
    operations: Array.isArray(profileData.surgical_history?.operations) ? profileData.surgical_history.operations : [],
    declined: profileData.surgical_history?.declined || false,
  },
  documents: Array.isArray(profileData.documents) ? profileData.documents : [],
});

const getActiveUid = async () => {
  const accessToken = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token') || '';
  if (accessToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
  const { data: { user } } = await supabase.auth.getUser();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  return user?.id || currentUser?.uid;
};

// ============================================================
// DOCUMENT PREVIEW MODAL (PORTAL - MOBILE SCROLLABLE)
// ============================================================
const DocViewerModal = ({ isOpen, onClose, doc }) => {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
          .createSignedUrl(doc.path, 300);

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
  const isImage = doc.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].some(ext => doc.name?.toLowerCase().endsWith(`.${ext}`));

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 20, 0.75)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: '860px',
          height: '88vh', maxHeight: '88vh', backgroundColor: '#ffffff',
          borderRadius: '20px', boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ flexShrink: 0, background: 'linear-gradient(to right, #e0eceb, #ffffff)', borderBottom: '1px solid #d1e7e5', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, paddingRight: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#466460', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
              <DocIcon />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {doc.name}
              </h3>
              {doc.uploadedAt && (
                <p style={{ fontSize: '10.5px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                  Uploaded on {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {signedUrl && (
              <a href={signedUrl} download={doc.name} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #c8ddd8', color: '#466460', fontSize: '11px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </a>
            )}
            <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f4f7f5', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <span className="lf-spinner" style={{ borderColor: '#466460', borderTopColor: 'transparent', width: '26px', height: '26px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px', color: '#475569' }}>Generating document preview...</p>
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', color: '#dc2626', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #fee2e2', maxWidth: '380px' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Failed to load document preview</p>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>Please verify storage permissions or try downloading directly.</p>
            </div>
          ) : isPdf ? (
            <iframe src={`${signedUrl}#view=FitH&toolbar=0&navpanes=0`} title={doc.name} style={{ width: '100%', height: '100%', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} />
          ) : isImage ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
              <img src={signedUrl} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#475569', backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Preview is not supported for this file format</p>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>Click the download button above to view the file locally.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileUsers({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState(null); // 'personal' | 'emergency'

  // System Config State
  const [configData, setConfigData] = useState({
    departments: [],
    non_academic_offices: [],
    classifications: {},
    job_titles: {},
    sections: [] // Dynamically loaded sections
  });

  // Document management state
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Document Viewer Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const documentsInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '',
    birthday: '', age: '', sex: '', bloodType: '',
    homeAddress: '',
    addressCountry: '', addressRegion: '', addressRegionCode: '',
    addressProvince: '', addressProvinceCode: '',
    addressCity: '', addressCityCode: '',
    addressBarangay: '', addressBarangayCode: '',
    addressStreet: '', addressZipCode: '',
    religion: '', nationality: '', civilStatus: '',
    universityId: '', role: '',
    studentId: '', department: '', program: '', yearLevel: '', section: '',
    studentClassification: '',
    classification: '', jobTitle: '', licenseNumber: '',
    email: '', phoneNumber: '',
    emergencyContact: {
      name: '', relationship: '', phone: '', address: '',
      addressCountry: '', addressRegion: '', addressRegionCode: '',
      addressProvince: '', addressProvinceCode: '',
      addressCity: '', addressCityCode: '',
      addressBarangay: '', addressBarangayCode: '',
      addressStreet: '', addressZipCode: '',
    },
    vaccinations: {
      dose1: { vaccineName: '', date: '' },
      dose2: { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
      history: '',
      declined: { dose1: false, dose2: false, booster1: false, booster2: false, history: false },
    },
    dentalHistory: {
      lastVisit: '', prevDentist: '',
      declined: false,
      procedures: {}
    },
    surgicalHistory: {
      operations: [],
      declined: false,
    },
    documents: [],
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch Profile ───────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const activeUid = await getActiveUid();
      if (!activeUid) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', activeUid)
        .limit(1);

      const profileData = data?.[0] || null;
      if (error) throw error;

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (profileData) {
        setProfile(mapDbToProfile(profileData, currentUser?.email || ''));
      } else {
        setProfile(prev => ({ ...prev, email: currentUser?.email || '' }));
      }
    } catch (err) {
      console.error('[ProfileUsers] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch System Configuration ──────────────────────────────────────────────
  const fetchSystemConfig = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system-config`);
      const result = await res.json();
      if (result.success) {
        setConfigData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch system configuration:', error);
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  const { scrollElRef, indicatorRef } = usePullToRefresh(async () => {
    await Promise.all([fetchProfile(), fetchSystemConfig()]);
  });

  useEffect(() => {
    fetchProfile();
    fetchSystemConfig();
  }, [fetchProfile, fetchSystemConfig]);

  useEffect(() => {
    if (location.state?.scrollTo && !scrollToSection) {
      setScrollToSection(location.state.scrollTo);
    }
  }, [location.state, scrollToSection]);

  useEffect(() => {
    if (!loading && !isConfigLoading && scrollToSection) {
      const sectionRefs = {
        academic: 'academic-section',
        contact: 'contact-section',
        emergency: 'emergency-section',
        vaccinations: 'vaccinations-section',
        dental: 'dental-section',
        surgical: 'surgical-section',
      };
      const elementId = sectionRefs[scrollToSection];

      if (elementId) {
        setTimeout(() => {
          const element = document.getElementById(elementId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 300);
      }
      setScrollToSection(null);
    }
  }, [loading, isConfigLoading, scrollToSection]);

  // Lock background scroll whenever the edit modal, address modal, or delete-confirm modal is open
  useEffect(() => {
    const shouldLock = !!editingSection || !!docToDelete || addressModalOpen;
    if (shouldLock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingSection, docToDelete, addressModalOpen]);

  // ── Derived Configuration Data ───────────────────────────────────────────────
  const selectedDept = configData.departments.find(d =>
    d.full === editData.department || d.abbr === editData.department
  );

  const availablePrograms = selectedDept
    ? selectedDept.programs
    : [...new Set(configData.departments.flatMap(d => d.programs))];

  const uniqueClassifications = Array.from(new Set(Object.values(configData.classifications)));
  const uniqueJobTitles = Array.from(new Set(Object.values(configData.job_titles)));
  const departmentOptions = configData.departments.map(d => d.full);

  // ── View Variables ───────────────────────────────────────────────────────────
  const fullName = [
    profile.firstName,
    profile.middleName || '',
    profile.lastName,
    profile.suffix,
  ].filter(Boolean).join(' ');

  const isStudent = profile.role?.toLowerCase() === 'student';
  const isFieldEmpty = (value) => !value || value === '';

  const personalFields = [profile.birthday, profile.age, profile.sex, profile.bloodType, profile.civilStatus, profile.religion, profile.nationality, profile.homeAddress];
  const hasEmptyPersonal = personalFields.some(isFieldEmpty);

  const academicFields = isStudent
    ? [profile.universityId || profile.studentId, profile.department, profile.program, profile.yearLevel, profile.section, profile.studentClassification]
    : [profile.classification, profile.department, profile.jobTitle];
  const hasEmptyAcademic = academicFields.some(isFieldEmpty);

  const contactFields = [profile.email, profile.phoneNumber];
  const hasEmptyContact = contactFields.some(isFieldEmpty);

  const emergencyFields = [profile.emergencyContact?.name, profile.emergencyContact?.relationship, profile.emergencyContact?.phone, profile.emergencyContact?.address];
  const hasEmptyEmergency = emergencyFields.some(isFieldEmpty);

  const hasEmptyVaccinations =
    (!profile.vaccinations?.declined?.dose1 && !profile.vaccinations?.dose1?.vaccineName && !profile.vaccinations?.dose1?.date) ||
    (!profile.vaccinations?.declined?.dose2 && !profile.vaccinations?.dose2?.vaccineName && !profile.vaccinations?.dose2?.date) ||
    (!profile.vaccinations?.declined?.booster1 && !profile.vaccinations?.booster1?.vaccineName && !profile.vaccinations?.booster1?.date) ||
    (!profile.vaccinations?.declined?.booster2 && !profile.vaccinations?.booster2?.vaccineName && !profile.vaccinations?.booster2?.date) ||
    (!profile.vaccinations?.declined?.history && isFieldEmpty(profile.vaccinations?.history));

  const dentalFields = [profile.dentalHistory?.lastVisit, profile.dentalHistory?.prevDentist];
  const hasEmptyDental = !profile.dentalHistory?.declined && dentalFields.every(isFieldEmpty);

  const hasEmptySurgical = !profile.surgicalHistory?.declined && (!profile.surgicalHistory?.operations || profile.surgicalHistory.operations.length === 0);

  // ── Address Modal Handlers ───────────────────────────────────────────────────
  const openAddressModal = (target) => {
    setAddressModalTarget(target);
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setAddressModalOpen(false);
    setAddressModalTarget(null);
  };

  const handleAddressConfirm = (addressData) => {
    const structured = {
      addressCountry: addressData.addressCountry,
      addressRegion: addressData.addressRegion,
      addressRegionCode: addressData.addressRegionCode,
      addressProvince: addressData.addressProvince,
      addressProvinceCode: addressData.addressProvinceCode,
      addressCity: addressData.addressCity,
      addressCityCode: addressData.addressCityCode,
      addressBarangay: addressData.addressBarangay,
      addressBarangayCode: addressData.addressBarangayCode,
      addressStreet: addressData.addressStreet,
      addressZipCode: addressData.addressZipCode,
    };

    if (addressModalTarget === 'personal') {
      setEditData(prev => ({
        ...prev,
        homeAddress: addressData.homeAddress,
        ...structured,
      }));
    } else if (addressModalTarget === 'emergency') {
      setEditData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          address: addressData.homeAddress,
          ...structured,
        },
      }));
    }
  };

  // Prefill data passed into the modal so re-opening it shows the last selection
  const addressInitialData = (() => {
    if (addressModalTarget === 'personal') {
      return {
        addressCountry: editData.addressCountry,
        addressRegion: editData.addressRegion,
        addressRegionCode: editData.addressRegionCode,
        addressProvince: editData.addressProvince,
        addressProvinceCode: editData.addressProvinceCode,
        addressCity: editData.addressCity,
        addressCityCode: editData.addressCityCode,
        addressBarangay: editData.addressBarangay,
        addressBarangayCode: editData.addressBarangayCode,
        addressStreet: editData.addressStreet,
        addressZipCode: editData.addressZipCode,
      };
    }
    if (addressModalTarget === 'emergency') {
      return {
        addressCountry: editData.emergencyContact?.addressCountry,
        addressRegion: editData.emergencyContact?.addressRegion,
        addressRegionCode: editData.emergencyContact?.addressRegionCode,
        addressProvince: editData.emergencyContact?.addressProvince,
        addressProvinceCode: editData.emergencyContact?.addressProvinceCode,
        addressCity: editData.emergencyContact?.addressCity,
        addressCityCode: editData.emergencyContact?.addressCityCode,
        addressBarangay: editData.emergencyContact?.addressBarangay,
        addressBarangayCode: editData.emergencyContact?.addressBarangayCode,
        addressStreet: editData.emergencyContact?.addressStreet,
        addressZipCode: editData.emergencyContact?.addressZipCode,
      };
    }
    return {};
  })();

  // ── Document Handlers ──────────────────────────────────────────────────────
  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const invalid = files.find(f => !ALLOWED_DOC_TYPES.includes(f.type) || f.size > MAX_DOC_SIZE);
    if (invalid) {
      showToast(`"${invalid.name}" is invalid. PDF/JPG/PNG only, max 5MB.`);
      return;
    }

    setUploadingDocs(true);
    const uploadedPaths = [];

    try {
      const uid = await getActiveUid();
      if (!uid) throw new Error('Not authenticated');

      const uploadedDocs = [];

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;
        uploadedPaths.push(path);

        uploadedDocs.push({
          id: crypto.randomUUID(),
          name: file.name,
          path,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }

      const newDocuments = [...(profile.documents || []), ...uploadedDocs];

      const { error: updateError } = await supabase
        .from('users')
        .update({ documents: newDocuments })
        .eq('uid', uid);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, documents: newDocuments }));
      showToast(uploadedDocs.length > 1 ? 'Documents uploaded successfully!' : 'Document uploaded successfully!');
    } catch (err) {
      console.error('[ProfileUsers] Document upload error:', err);
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove(uploadedPaths);
      }
      showToast('Failed to upload document(s).');
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);

    try {
      const uid = await getActiveUid();
      if (!uid) throw new Error('Not authenticated');

      if (docToDelete.path) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([docToDelete.path]);
      }

      const newDocuments = (profile.documents || []).filter(d => d.id !== docToDelete.id);

      const { error: updateError } = await supabase
        .from('users')
        .update({ documents: newDocuments })
        .eq('uid', uid);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, documents: newDocuments }));
      showToast('Document removed.');
      setDocToDelete(null);
    } catch (err) {
      console.error('[ProfileUsers] Document delete error:', err);
      showToast('Failed to remove document.');
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleViewDocument = (doc) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  // ── Profile Editing Handlers ───────────────────────────────────────────────
  const openEdit = (section) => {
    setEditData(JSON.parse(JSON.stringify(profile)));
    setEditingSection(section);
    setDentalDeclined(profile.dentalHistory?.declined || false);
    setSurgicalDeclined(profile.surgicalHistory?.declined || false);
    setVaccinationsDeclined(profile.vaccinations?.declined || { dose1: false, dose2: false, booster1: false, booster2: false, history: false });
  };
  const closeEdit = () => { setEditingSection(null); setEditData({}); };

  const handleChange = (field, value) => {
    if (field === 'birthday') {
      const calculatedAge = calculateAge(value);
      setEditData(prev => ({ ...prev, birthday: value, age: calculatedAge }));
    } else {
      setEditData(prev => ({ ...prev, [field]: value }));
    }
  };
  const handleNestedChange = (parent, field, value) => setEditData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const handleVaxChange = (dose, field, value) => setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, [dose]: { ...prev.vaccinations[dose], [field]: value } } }));
  const handleCovidHistoryChange = (value) => setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, history: value } }));
  const handleDentalChange = (field, value) => setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, [field]: value } }));
  const handleDentalProcChange = (proc, value) => setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, procedures: { ...(prev.dentalHistory.procedures || {}), [proc]: value } } }));

  const handleAddOperation = () => setEditData(prev => ({
    ...prev,
    surgicalHistory: {
      ...prev.surgicalHistory,
      operations: [...(prev.surgicalHistory?.operations || []), { id: crypto.randomUUID(), operation: '', date: '', notes: '' }],
    },
  }));
  const handleRemoveOperation = (id) => setEditData(prev => ({
    ...prev,
    surgicalHistory: {
      ...prev.surgicalHistory,
      operations: (prev.surgicalHistory?.operations || []).filter(op => op.id !== id),
    },
  }));
  const handleOperationChange = (id, field, value) => setEditData(prev => ({
    ...prev,
    surgicalHistory: {
      ...prev.surgicalHistory,
      operations: (prev.surgicalHistory?.operations || []).map(op => op.id === id ? { ...op, [field]: value } : op),
    },
  }));

  const getSectionFields = (section, isStudentUser) => {
    const sectionFields = {
      personal: [
        'firstName', 'middleName', 'lastName', 'suffix', 'birthday', 'age', 'sex',
        'bloodType', 'civilStatus', 'religion', 'nationality', 'homeAddress',
        'addressCountry', 'addressRegion', 'addressRegionCode',
        'addressProvince', 'addressProvinceCode',
        'addressCity', 'addressCityCode',
        'addressBarangay', 'addressBarangayCode',
        'addressStreet', 'addressZipCode',
      ],
      academic: isStudentUser
        ? ['universityId', 'department', 'program', 'yearLevel', 'section', 'studentClassification']
        : ['classification', 'department', 'jobTitle', 'licenseNumber'],
      contact: ['email', 'phoneNumber'],
      emergency: ['emergencyContact'],
      vaccinations: ['vaccinations'],
      dental: ['dentalHistory'],
      surgical: ['surgicalHistory'],
    };
    return sectionFields[section] || [];
  };

  const extractSectionData = (data, section, isStudentUser) => {
    const fields = getSectionFields(section, isStudentUser);
    const sectionData = {};
    fields.forEach(field => {
      sectionData[field] = data[field];
    });
    return sectionData;
  };

  const saveProfileEdits = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      let sectionData = extractSectionData(editData, editingSection, isStudent);

      if (sectionData.firstName) sectionData.firstName = normalizeName(sectionData.firstName);
      if (sectionData.middleName) sectionData.middleName = normalizeName(sectionData.middleName);
      if (sectionData.lastName) sectionData.lastName = normalizeName(sectionData.lastName);
      if (sectionData.emergencyContact?.name) {
        sectionData.emergencyContact.name = normalizeName(sectionData.emergencyContact.name);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sectionData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      const updatedProfile = { ...profile };
      Object.keys(data.data).forEach(key => {
        updatedProfile[key] = data.data[key];
      });

      setProfile(updatedProfile);
      showToast('Profile updated successfully!');
      closeEdit();
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('Error updating profile.');
    }
    setIsSaving(false);
  };

  if ((loading || isConfigLoading) && !profile.email) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#466460', fontSize: 13, fontWeight: 600 }}>
        Loading profile...
      </div>
    );
  }

  const clsColors = classificationColors[profile.studentClassification] || classificationColors.Regular;

  return (
    <>
      <div
        ref={scrollElRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '18px 16px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          scrollbarWidth: 'none',
          touchAction: 'pan-y',
        }}
      >
        <style>{ptrStyles}</style>
        <PullIndicator indicatorRef={indicatorRef} />

        {/* ── Profile Header ── */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#1a2e22', fontFamily: "'DM Serif Display', serif", lineHeight: 1.2 }}>
                {fullName || 'No Name Set'}
              </div>
              <div style={{ fontSize: 11, color: '#6b8577', marginTop: 3, fontWeight: 500 }}>
                {isStudent ? (profile.program || profile.department || 'Student') : (profile.jobTitle || profile.classification || 'Personnel')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ background: '#e0eceb', padding: '4px 12px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: '#466460' }}>
                {isStudent ? `ID: ${profile.universityId}` : profile.classification}
              </div>
              {isStudent && profile.studentClassification && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: clsColors.bg, padding: '3px 10px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: clsColors.text }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: clsColors.dot, display: 'inline-block' }} />
                  {profile.studentClassification}
                </div>
              )}
              <div style={{ background: '#f4f7f5', padding: '3px 10px', borderRadius: 40, fontSize: 10, fontWeight: 600, color: '#6b8577', textTransform: 'capitalize' }}>
                {profile.role || 'student'}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Personal Information ── */}
        <Card>
          <SectionHeader label="Personal Information" onEdit={() => openEdit('personal')} hasEmpty={hasEmptyPersonal} />
          <InfoRow label="Birthday" value={profile.birthday} empty={isFieldEmpty(profile.birthday)} />
          <InfoRow label="Age" value={profile.age} empty={isFieldEmpty(profile.age)} />
          <InfoRow label="Sex" value={profile.sex} empty={isFieldEmpty(profile.sex)} />
          <InfoRow label="Blood Type" value={profile.bloodType} empty={isFieldEmpty(profile.bloodType)} />
          <InfoRow label="Civil Status" value={profile.civilStatus} empty={isFieldEmpty(profile.civilStatus)} />
          <InfoRow label="Religion" value={profile.religion} empty={isFieldEmpty(profile.religion)} />
          <InfoRow label="Nationality" value={profile.nationality} empty={isFieldEmpty(profile.nationality)} />
          <InfoRow label="Home Address" value={profile.homeAddress} empty={isFieldEmpty(profile.homeAddress)} last />
        </Card>

        {/* ── Academic / Work Info ── */}
        <Card id="academic-section">
          <SectionHeader label={isStudent ? 'Academic Information' : 'Work Information'} onEdit={() => openEdit('academic')} hasEmpty={hasEmptyAcademic} />
          {isStudent ? (
            <>
              <InfoRow label="Student No." value={profile.universityId || profile.studentId} empty={isFieldEmpty(profile.universityId || profile.studentId)} />
              <InfoRow label="Department" value={profile.department} empty={isFieldEmpty(profile.department)} />
              <InfoRow label="Program" value={profile.program} empty={isFieldEmpty(profile.program)} />
              <InfoRow label="Year Level" value={profile.yearLevel} empty={isFieldEmpty(profile.yearLevel)} />
              <InfoRow label="Section" value={profile.section} empty={isFieldEmpty(profile.section)} />
              <InfoRow label="Classification" value={profile.studentClassification} empty={isFieldEmpty(profile.studentClassification)} last />
            </>
          ) : (
            <>
              <InfoRow label="Classification" value={profile.classification} empty={isFieldEmpty(profile.classification)} />
              <InfoRow label="Department" value={profile.department} empty={isFieldEmpty(profile.department)} />
              <InfoRow label="Job Title" value={profile.jobTitle} last />
            </>
          )}
        </Card>

        {/* ── Contact Details ── */}
        <Card>
          <SectionHeader label="Contact Details" onEdit={() => openEdit('contact')} hasEmpty={hasEmptyContact} />
          <InfoRow label="Email Address" value={profile.email} empty={isFieldEmpty(profile.email)} />
          <InfoRow label="Phone Number" value={profile.phoneNumber} empty={isFieldEmpty(profile.phoneNumber)} last />
        </Card>

        {/* ── Emergency Contact ── */}
        <Card id="emergency-section">
          <SectionHeader label="Emergency Contact" onEdit={() => openEdit('emergency')} hasEmpty={hasEmptyEmergency} />
          <InfoRow label="Name" value={profile.emergencyContact.name} empty={isFieldEmpty(profile.emergencyContact?.name)} />
          <InfoRow label="Relationship" value={profile.emergencyContact.relationship} empty={isFieldEmpty(profile.emergencyContact?.relationship)} />
          <InfoRow label="Phone" value={profile.emergencyContact.phone} empty={isFieldEmpty(profile.emergencyContact?.phone)} />
          <InfoRow label="Address" value={profile.emergencyContact.address} empty={isFieldEmpty(profile.emergencyContact?.address)} last />
        </Card>

        {/* ── COVID-19 Vaccination History ── */}
        <Card id="vaccinations-section">
          <SectionHeader label="COVID-19 Vaccination History" onEdit={() => openEdit('vaccinations')} hasEmpty={hasEmptyVaccinations} />
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #edf3f0' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Dose</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Vaccine Brand</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase', textAlign: 'right' }}>Date Given</span>
          </div>
          {DOSE_LABELS.map(({ key, label }) => {
            const v = profile.vaccinations?.[key];
            const isDeclined = profile.vaccinations?.declined?.[key];
            const doseEmpty = !v?.vaccineName && !v?.date;
            const showEmpty = !isDeclined && doseEmpty;
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, padding: '9px 0', borderBottom: '1px solid #edf3f0', alignItems: 'center', backgroundColor: isDeclined ? '#e0eceb' : (showEmpty ? '#fffbeb' : 'transparent'), marginLeft: isDeclined || showEmpty ? -16 : 0, marginRight: isDeclined || showEmpty ? -16 : 0, paddingLeft: isDeclined || showEmpty ? 16 : 0, paddingRight: isDeclined || showEmpty ? 16 : 0, borderRadius: (isDeclined || showEmpty) ? '8px' : 0 }}>
                <span style={{ background: '#e0eceb', color: '#466460', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textAlign: 'center', width: 'fit-content' }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDeclined ? '#466460' : (showEmpty ? '#92400e' : '#1a2e22') }}>
                  {isDeclined ? 'N/A' : (doseEmpty ? 'Not recorded' : fmt(v?.vaccineName))}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isDeclined ? '#466460' : (showEmpty ? '#92400e' : '#6b8577'), textAlign: 'right' }}>
                  {isDeclined ? '' : (doseEmpty ? '—' : fmt(v?.date))}
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: 12, paddingTop: 10 }}>
            <InfoRow
              label="COVID-19 History"
              value={profile.vaccinations?.declined?.history ? 'N/A' : profile.vaccinations?.history}
              empty={!profile.vaccinations?.declined?.history && isFieldEmpty(profile.vaccinations?.history)}
              last
            />
          </div>
        </Card>

        {/* ── Dental History ── */}
        <Card id="dental-section">
          <SectionHeader label="Dental History" onEdit={() => openEdit('dental')} hasEmpty={hasEmptyDental} />
          {profile.dentalHistory?.declined ? (
            <div style={{ padding: '12px 16px', background: '#e0eceb', borderRadius: 10, marginTop: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#466460' }}>No dental history / Not applicable</span>
            </div>
          ) : (
            <>
              <InfoRow label="Last Dental Visit" value={profile.dentalHistory.lastVisit} empty={isFieldEmpty(profile.dentalHistory?.lastVisit)} />
              <InfoRow label="Previous Dentist" value={profile.dentalHistory.prevDentist ? `Dr. ${profile.dentalHistory.prevDentist}` : ''} empty={isFieldEmpty(profile.dentalHistory?.prevDentist)} last />
            </>
          )}
        </Card>

        {/* ── Past Surgical History ── */}
        <Card id="surgical-section">
          <SectionHeader label="Past Surgical History" onEdit={() => openEdit('surgical')} hasEmpty={hasEmptySurgical} />
          {profile.surgicalHistory?.declined ? (
            <div style={{ padding: '12px 16px', background: '#e0eceb', borderRadius: 10, marginTop: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#466460' }}>No surgical history / Not applicable</span>
            </div>
          ) : profile.surgicalHistory?.operations?.length ? (
            profile.surgicalHistory.operations.map((op, i) => (
              <InfoRow
                key={op.id || i}
                label={op.operation || 'Operation'}
                value={[op.date, op.notes].filter(Boolean).join(' · ')}
                empty={!op.date && !op.notes}
                last={i === profile.surgicalHistory.operations.length - 1}
              />
            ))
          ) : (
            <p style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic', padding: '12px 0', textAlign: 'center', margin: 0 }}>No surgical history recorded.</p>
          )}
        </Card>

        {/* ── Health Documents (Personnel Only) ── */}
        {!isStudent && (
          <Card>
            <SectionHeader label="Health Documents" />
            <p style={{ fontSize: 11, color: '#6b8577', margin: '-4px 0 14px', lineHeight: 1.5 }}>
              Upload X-rays, drug test results, or other clinic-required documents. PDF, JPG, or PNG · max 5MB each.
            </p>

            {(profile.documents || []).length === 0 && !uploadingDocs && (
              <p style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic', padding: '12px 0', textAlign: 'center', margin: 0 }}>
                No documents uploaded yet.
              </p>
            )}

            {(profile.documents || []).map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #edf3f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleViewDocument(doc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#1a2e22',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    minWidth: 0,
                  }}
                >
                  <span style={{ color: '#466460', flexShrink: 0 }}><DocIcon /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                      {doc.name}
                    </span>
                    <span style={{ fontSize: 10, color: '#9bb5a5' }}>
                      {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocToDelete(doc)}
                  style={{
                    background: '#fef2f2',
                    color: '#e07a5f',
                    border: 'none',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => documentsInputRef.current?.click()}
              disabled={uploadingDocs}
              style={{
                width: '100%',
                marginTop: 12,
                background: uploadingDocs ? '#9bb5a5' : '#466460',
                color: '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: uploadingDocs ? 'not-allowed' : 'pointer',
              }}
            >
              {uploadingDocs ? 'Uploading...' : '+ Add Document(s)'}
            </button>
            <input
              ref={documentsInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              hidden
              onChange={handleDocumentUpload}
            />
          </Card>
        )}
      </div>

      {/* ── Delete Document Confirmation Modal (portaled to <body>) ── */}
      {docToDelete && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingDoc) setDocToDelete(null);
          }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(26, 46, 34, 0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            zIndex: 99997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, padding: 24, boxShadow: '0 12px 35px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 800, color: '#1a2e22' }}>
                Remove Document?
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#6b8577', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong style={{ color: '#1a2e22', wordBreak: 'break-all' }}>"{docToDelete.name}"</strong>? This will permanently delete the file from your clinic record.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button" disabled={isDeletingDoc} onClick={() => setDocToDelete(null)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #c4dbd8', background: '#fbfcfc', color: '#6b8577', fontSize: 12, fontWeight: 700, cursor: isDeletingDoc ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button" disabled={isDeletingDoc} onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#e07a5f', color: '#fff', fontSize: 12, fontWeight: 700, cursor: isDeletingDoc ? 'not-allowed' : 'pointer', opacity: isDeletingDoc ? 0.7 : 1 }}
              >
                {isDeletingDoc ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Edit Profile Modal (portaled to <body>) ── */}
      {editingSection && createPortal(
        <div onClick={e => e.target === e.currentTarget && closeEdit()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26, 46, 34, 0.4)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>

            <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #edf3f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#466460', textTransform: 'capitalize' }}>Edit {editingSection} Info</span>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: '#9bb5a5', cursor: 'pointer', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

              {/* Personal Section */}
              {editingSection === 'personal' && (
                <>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="First Name">
                      <input style={inputStyle} value={editData.firstName} onChange={e => handleChange('firstName', toTitleCase(e.target.value))} onBlur={e => handleChange('firstName', toTitleCase(e.target.value))} />
                    </FormGroup>
                    <FormGroup label="Middle Name">
                      <input style={{ ...inputStyle, width: 120 }} value={editData.middleName} onChange={e => handleChange('middleName', toTitleCase(e.target.value))} onBlur={e => handleChange('middleName', toTitleCase(e.target.value))} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="Last Name">
                      <input style={{ ...inputStyle, flex: 1 }} value={editData.lastName} onChange={e => handleChange('lastName', toTitleCase(e.target.value))} onBlur={e => handleChange('lastName', toTitleCase(e.target.value))} />
                    </FormGroup>
                    <FormGroup label="Suffix">
                      <CustomSelect style={{ width: 100 }} value={editData.suffix} onChange={val => handleChange('suffix', val)} options={SUFFIXES} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <FormGroup label="Birthday">
                        <DatePicker value={editData.birthday || ''} onChange={val => handleChange('birthday', val)} />
                      </FormGroup>
                    </div>
                    <FormGroup label="Age (Auto)">
                      <input type="text" style={{ ...inputStyle, width: 80, backgroundColor: '#f4f7f5', cursor: 'not-allowed' }} value={editData.age} readOnly />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="Sex">
                      <CustomSelect value={editData.sex} onChange={val => handleChange('sex', val)} options={SEX_OPTIONS} />
                    </FormGroup>
                    <FormGroup label="Blood Type">
                      <CustomSelect value={editData.bloodType} onChange={val => handleChange('bloodType', val)} options={BLOOD_TYPES} />
                    </FormGroup>
                  </div>
                  <FormGroup label="Civil Status">
                    <CustomSelect value={editData.civilStatus} onChange={val => handleChange('civilStatus', val)} options={CIVIL_STATUSES} />
                  </FormGroup>
                  <FormGroup label="Religion">
                    <CustomSelect value={editData.religion} onChange={val => handleChange('religion', val)} options={RELIGIONS} dropUp={true} />
                  </FormGroup>
                  <FormGroup label="Nationality">
                    <CustomSelect value={editData.nationality} onChange={val => handleChange('nationality', val)} options={NATIONALITIES} dropUp={true} />
                  </FormGroup>
                  <FormGroup label="Home Address">
                    <button
                      type="button"
                      onClick={() => openAddressModal('personal')}
                      style={{
                        ...inputStyle,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        color: editData.homeAddress ? '#1a2e22' : '#9bb5a5',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {editData.homeAddress || 'Select address'}
                      </span>
                      <span style={{ flexShrink: 0, color: '#466460' }}><EditIcon /></span>
                    </button>
                  </FormGroup>
                </>
              )}

              {/* Academic Section (Student) */}
              {editingSection === 'academic' && isStudent && (
                <>
                  <FormGroup label="Student No.">
                    <input style={inputStyle} value={editData.universityId || editData.studentId} onChange={e => handleChange('universityId', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Department">
                    <CustomSelect
                      value={editData.department}
                      onChange={val => {
                        handleChange('department', val);
                        handleChange('program', ''); // Reset program when dept changes
                      }}
                      options={departmentOptions}
                    />
                  </FormGroup>
                  <FormGroup label="Program">
                    <CustomSelect
                      value={editData.program}
                      onChange={val => handleChange('program', val)}
                      options={availablePrograms}
                    />
                  </FormGroup>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="Year Level">
                      <CustomSelect value={editData.yearLevel} onChange={val => handleChange('yearLevel', val)} options={YEAR_LEVELS} dropUp={true} />
                    </FormGroup>
                    <FormGroup label="Section">
                      <CustomSelect
                        value={editData.section}
                        onChange={val => handleChange('section', val)}
                        options={configData.sections || []}
                        dropUp={true}
                      />
                    </FormGroup>
                  </div>
                  <FormGroup label="Student Classification">
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {STUDENT_CLASSIFICATIONS.map(cls => {
                        const isActive = editData.studentClassification === cls;
                        const colors = classificationColors[cls];
                        return (
                          <button
                            key={cls} type="button" onClick={() => handleChange('studentClassification', cls)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                              border: `1px solid ${isActive ? colors.dot : '#c4dbd8'}`,
                              background: isActive ? colors.bg : '#fbfcfc', color: isActive ? colors.text : '#94a3b8',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? colors.dot : '#cbd5d1', flexShrink: 0 }} />
                            {cls}
                          </button>
                        );
                      })}
                    </div>
                  </FormGroup>
                </>
              )}

              {/* Academic Section (Staff) */}
              {editingSection === 'academic' && !isStudent && (
                <>
                  <FormGroup label="Classification">
                    <CustomSelect value={editData.classification} onChange={val => handleChange('classification', val)} options={uniqueClassifications} />
                  </FormGroup>
                  <FormGroup label="Office / Department">
                    <CustomSelect value={editData.department} onChange={val => handleChange('department', val)} options={configData.non_academic_offices} />
                  </FormGroup>
                  <FormGroup label="Job Title">
                    <CustomSelect value={editData.jobTitle} onChange={val => handleChange('jobTitle', val)} options={uniqueJobTitles} />
                  </FormGroup>
                  <FormGroup label="License Number">
                    <input style={inputStyle} value={editData.licenseNumber || ''} placeholder="e.g., PRC-123456" onChange={e => handleChange('licenseNumber', e.target.value.toUpperCase())} />
                  </FormGroup>
                </>
              )}

              {/* Contact Section */}
              {editingSection === 'contact' && (
                <>
                  <FormGroup label="Email Address">
                    <input style={inputStyle} type="email" value={editData.email} onChange={e => handleChange('email', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Phone Number (11 digits)">
                    <input
                      style={inputStyle} value={editData.phoneNumber} placeholder="09123456789" maxLength={11}
                      onChange={e => handleChange('phoneNumber', formatPhoneNumber(e.target.value))}
                      onBlur={e => {
                        if (e.target.value && !isValidPhoneNumber(e.target.value)) {
                          alert('Phone number must be exactly 11 digits (e.g., 09123456789)');
                        }
                      }}
                    />
                    <span style={{ fontSize: 10, color: '#9bb5a5' }}>Format: 09XXXXXXXXX (11 digits)</span>
                  </FormGroup>
                  <p style={{ fontSize: 11, color: '#9bb5a5', marginTop: -4 }}>Note: Changing your email may require you to verify your identity by signing in again.</p>
                </>
              )}

              {/* Emergency Section */}
              {editingSection === 'emergency' && (
                <>
                  <FormGroup label="Contact Name">
                    <input style={inputStyle} value={editData.emergencyContact.name} onChange={e => handleNestedChange('emergencyContact', 'name', toTitleCase(e.target.value))} onBlur={e => handleNestedChange('emergencyContact', 'name', toTitleCase(e.target.value))} />
                  </FormGroup>
                  <FormGroup label="Relationship">
                    <CustomSelect value={editData.emergencyContact.relationship} onChange={val => handleNestedChange('emergencyContact', 'relationship', val)} options={EMERGENCY_RELATIONSHIPS} />
                  </FormGroup>
                  <FormGroup label="Phone Number (11 digits)">
                    <input
                      style={inputStyle} value={editData.emergencyContact.phone} placeholder="09123456789" maxLength={11}
                      onChange={e => handleNestedChange('emergencyContact', 'phone', formatPhoneNumber(e.target.value))}
                      onBlur={e => {
                        if (e.target.value && !isValidPhoneNumber(e.target.value)) {
                          alert('Phone number must be exactly 11 digits (e.g., 09123456789)');
                        }
                      }}
                    />
                  </FormGroup>
                  <FormGroup label="Address">
                    <button
                      type="button"
                      onClick={() => openAddressModal('emergency')}
                      style={{
                        ...inputStyle,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        color: editData.emergencyContact?.address ? '#1a2e22' : '#9bb5a5',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {editData.emergencyContact?.address || 'Select address'}
                      </span>
                      <span style={{ flexShrink: 0, color: '#466460' }}><EditIcon /></span>
                    </button>
                  </FormGroup>
                </>
              )}

              {/* Vaccinations Section */}
              {editingSection === 'vaccinations' && (
                <>
                  {DOSE_LABELS.map(({ key, label }) => {
                    const isDeclined = vaccinationsDeclined[key];
                    return (
                      <div key={key} style={{ background: isDeclined ? '#fef3c7' : '#f4f7f5', padding: 16, borderRadius: 12, marginBottom: 16, border: isDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 800, color: '#466460', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isDeclined}
                              onChange={(e) => {
                                setVaccinationsDeclined(prev => ({ ...prev, [key]: e.target.checked }));
                                setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, declined: { ...(prev.vaccinations?.declined || {}), [key]: e.target.checked } } }));
                              }}
                              style={{ accentColor: '#466460', width: 16, height: 16 }}
                            />
                            <span style={{ fontSize: 11, fontWeight: 600, color: isDeclined ? '#92400e' : '#6b8577' }}>N/A</span>
                          </label>
                        </div>
                        {!isDeclined && (
                          <>
                            <FormGroup label="Vaccine Brand">
                              <CustomSelect style={{ backgroundColor: '#fff' }} value={editData.vaccinations[key]?.vaccineName || ''} onChange={val => handleVaxChange(key, 'vaccineName', val)} options={VACCINE_BRANDS} />
                            </FormGroup>
                            <FormGroup label="Date Given">
                              <DatePicker value={editData.vaccinations[key]?.date || ''} onChange={val => handleVaxChange(key, 'date', val)} />
                            </FormGroup>
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
                        <input
                          type="checkbox"
                          checked={vaccinationsDeclined.history || false}
                          onChange={(e) => {
                            setVaccinationsDeclined(prev => ({ ...prev, history: e.target.checked }));
                            setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, declined: { ...(prev.vaccinations?.declined || {}), history: e.target.checked } } }));
                          }}
                          style={{ accentColor: '#466460', width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 600, color: vaccinationsDeclined.history ? '#92400e' : '#6b8577' }}>N/A</span>
                      </label>
                    </div>
                    {!vaccinationsDeclined.history ? (
                      <textarea
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 80, backgroundColor: '#fff' }}
                        placeholder="Date of infection, severity, treatment, recovery details..."
                        value={editData.vaccinations?.history || ''}
                        onChange={e => handleCovidHistoryChange(e.target.value)}
                      />
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#92400e' }}>Not applicable / No history</div>
                    )}
                  </div>
                </>
              )}

              {/* Dental Section */}
              {editingSection === 'dental' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: dentalDeclined ? '#fef3c7' : '#f4f7f5', borderRadius: 10, marginBottom: 16, cursor: 'pointer', border: dentalDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                    <input
                      type="checkbox" checked={dentalDeclined}
                      onChange={(e) => {
                        setDentalDeclined(e.target.checked);
                        setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, declined: e.target.checked } }));
                      }}
                      style={{ accentColor: '#466460', width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: dentalDeclined ? '#92400e' : '#466460' }}>
                      I don't have dental history / Not applicable
                    </span>
                  </label>
                  {!dentalDeclined && (
                    <>
                      <FormGroup label="Last Dental Visit">
                        <DatePicker value={editData.dentalHistory.lastVisit || ''} onChange={val => handleDentalChange('lastVisit', val)} />
                      </FormGroup>
                      <FormGroup label="Previous Dentist (Dr.)">
                        <input style={inputStyle} value={editData.dentalHistory.prevDentist} placeholder="e.g. Smith" onChange={e => handleDentalChange('prevDentist', e.target.value)} />
                      </FormGroup>

                      <p style={{ fontSize: 11, fontWeight: 800, color: '#466460', margin: '24px 0 12px 0', textTransform: 'uppercase', borderTop: '1px solid #edf3f0', paddingTop: 20, letterSpacing: 0.5 }}>Procedures History</p>
                      {DENTAL_PROCEDURES.map(proc => {
                        const isYes = editData.dentalHistory.procedures?.[proc] === 'Yes';
                        const isNo = editData.dentalHistory.procedures?.[proc] === 'No' || !editData.dentalHistory.procedures?.[proc];
                        return (
                          <div key={proc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: '#1a2e22', background: '#fbfcfc', border: '1px solid #edf3f0', padding: '10px 14px', borderRadius: 10 }}>
                            <span style={{ fontWeight: 600 }}>{proc}</span>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                                <input type="radio" name={`modal_dh_${proc}`} checked={isYes} onChange={() => handleDentalProcChange(proc, 'Yes')} style={{ accentColor: '#466460' }} /> Yes
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                                <input type="radio" name={`modal_dh_${proc}`} checked={isNo} onChange={() => handleDentalProcChange(proc, 'No')} style={{ accentColor: '#466460' }} /> No
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}

              {/* Surgical Section */}
              {editingSection === 'surgical' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: surgicalDeclined ? '#fef3c7' : '#f4f7f5', borderRadius: 10, marginBottom: 16, cursor: 'pointer', border: surgicalDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                    <input
                      type="checkbox" checked={surgicalDeclined}
                      onChange={(e) => {
                        setSurgicalDeclined(e.target.checked);
                        setEditData(prev => ({ ...prev, surgicalHistory: { ...prev.surgicalHistory, declined: e.target.checked } }));
                      }}
                      style={{ accentColor: '#466460', width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: surgicalDeclined ? '#92400e' : '#466460' }}>
                      I don't have surgical history / Not applicable
                    </span>
                  </label>

                  {!surgicalDeclined && (
                    <>
                      {(editData.surgicalHistory?.operations || []).length === 0 ? (
                        <p style={{ fontSize: 12, color: '#9bb5a5', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No operations added yet.</p>
                      ) : editData.surgicalHistory.operations.map(op => (
                        <div key={op.id} style={{ position: 'relative', background: '#fbfcfc', border: '1px solid #edf3f0', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                          <button
                            type="button" onClick={() => handleRemoveOperation(op.id)}
                            style={{ position: 'absolute', top: 10, right: 10, background: '#e07a5f', color: '#fff', border: 'none', width: 22, height: 22, borderRadius: 6, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                          >×</button>
                          <FormGroup label="Operation Name">
                            <input style={inputStyle} placeholder="Operation/Procedure Name" value={op.operation} onChange={e => handleOperationChange(op.id, 'operation', e.target.value)} />
                          </FormGroup>
                          <FormGroup label="Date">
                            <DatePicker value={op.date || ''} onChange={val => handleOperationChange(op.id, 'date', val)} />
                          </FormGroup>
                          <FormGroup label="Notes">
                            <input style={inputStyle} placeholder="Hospital / complications" value={op.notes} onChange={e => handleOperationChange(op.id, 'notes', e.target.value)} />
                          </FormGroup>
                        </div>
                      ))}
                      <button
                        type="button" onClick={handleAddOperation}
                        style={{ width: '100%', background: '#81b29a', color: '#fff', border: 'none', padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >+ Add Operation</button>
                    </>
                  )}
                </>
              )}

            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #edf3f0', display: 'flex', gap: 12, background: '#fff' }}>
              <button onClick={closeEdit} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#f4f7f5', cursor: 'pointer', fontWeight: 600, color: '#6b8577', transition: 'background 0.2s' }}>Cancel</button>
              <button onClick={saveProfileEdits} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#466460', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1, transition: 'background 0.2s' }}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Address Modal (used by both Personal Home Address and Emergency Contact Address) ── */}
      <AddressModal
        isOpen={addressModalOpen}
        onClose={closeAddressModal}
        onConfirm={handleAddressConfirm}
        initialData={addressInitialData}
        zIndex={100000}
      />

      {/* ── In-App Document Preview Modal ── */}
      <DocViewerModal
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
        }}
        doc={previewDoc}
      />

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#466460', color: '#fff', padding: '12px 24px', borderRadius: 40, fontSize: 13, fontWeight: 600, zIndex: 5000, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast}
        </div>
      )}
    </>
  );
}