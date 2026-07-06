// C:\Users\HP\MediTrack\frontend\src\features\users\Profile-users.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker.jsx';
import AddressModal from '../../components/AddressModal.jsx';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

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

const SettingsGearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #edf3f0', ...style }}>
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

const STUDENT_CLASSIFICATIONS = ['Regular', 'Irregular', 'Returning'];

const RELIGIONS = ['Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Seventh-day Adventist', 'Protestant', 'Born Again Christian', 'Buddhism', 'Hinduism', 'Other'];
const NATIONALITIES = ['Filipino', 'American', 'Chinese', 'Japanese', 'Korean', 'Indian', 'British', 'Australian', 'Canadian', 'Other'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
const EMERGENCY_RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Child', 'Grandparent', 'Relative', 'Guardian', 'Friend', 'Other'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const VACCINE_BRANDS = ['Pfizer', 'Moderna', 'AstraZeneca', 'Sinovac', 'Janssen', 'Novavax', 'Covaxin', 'Sputnik', 'Other'];
const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

// Department and Program data (same as ProfileSetup)
const DEPARTMENTS_DATA = [
  { abbr: 'CCSE', full: 'College of Computing Science and Engineering', programs: ['BS in Information Technology', 'BS in Information System', 'BS in Computer Engineering', 'BS in Industrial Engineering'] },
  { abbr: 'CBAM', full: 'College of Business Administration and Management', programs: ['BS in Entrepreneurship', 'BS in Public Administration', 'BS in Office Administration', 'BS in Business Administration (HRDM)', 'BS in Business Administration (FM)', 'BS in Business Administration (MM)'] },
  { abbr: 'CAS', full: 'College of Art and Sciences', programs: ['BS in Economics', 'AB in Communication', 'BS in Psychology', 'AB in Political Science'] },
  { abbr: 'CTHM', full: 'College of Tourism and Hospitality Management', programs: ['BS in Tourism Management', 'BS in Hospitality Management'] },
  { abbr: 'COA', full: 'College of Accountancy', programs: ['BS in Accountancy', 'BS in Accountancy Information System', 'BS in Management Accounting'] },
  { abbr: 'CTE', full: 'College of Teacher Education', programs: ['BSEd Major in English', 'BSEd Major in Filipino', 'BSEd Major in Math', 'BSEd Major in Science', 'BSEd Major in Social Studies', 'BEED', 'BTVTEd', 'BSNEd'] },
  { abbr: 'CHK', full: 'College of Human Kinetics', programs: ['BS in Physical Education', 'BS in Sports Science'] },
  { abbr: 'CNAHS', full: 'College of Nursing and Allied Health Sciences', programs: ['BS in Nursing'] },
];
const DEPT_ABBR_TO_FULL = Object.fromEntries(DEPARTMENTS_DATA.map(d => [d.abbr, d.full]));
const PROGRAMS_BY_DEPT = Object.fromEntries(DEPARTMENTS_DATA.map(d => [d.abbr, d.programs]));
const DEPARTMENTS = DEPARTMENTS_DATA.map(d => d.abbr);
const ALL_PROGRAMS = [...new Set(DEPARTMENTS_DATA.flatMap(d => d.programs))];
const getProgramsByDept = (deptAbbr) => PROGRAMS_BY_DEPT[deptAbbr] || [];

const NON_ACADEMIC_OFFICES = ['Accounting Office', 'University Clinic', 'Human Resources', 'Library', 'Maintenance', 'Registrar Office', 'Security Services'];
const PLSP_OFFICES = [...DEPARTMENTS, ...NON_ACADEMIC_OFFICES];

const classificationColors = {
  Regular:   { bg: '#e0eceb', text: '#466460', dot: '#466460' },
  Irregular: { bg: '#fff7e6', text: '#92400e', dot: '#f59e0b' },
  Returning: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

const DENTAL_PROCEDURES = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

const DOSE_LABELS = [
  { key: 'dose1',    label: 'Dose 1' },
  { key: 'dose2',    label: 'Dose 2' },
  { key: 'booster1', label: 'Booster 1' },
  { key: 'booster2', label: 'Booster 2' },
];

// ── PTR spinner keyframe ──────────────────────────────────────────────────────
const ptrStyles = `
  @keyframes ptr-spin { to { transform: rotate(360deg); } }
  [data-spin="true"]  [data-ptr-icon] { display: none;  }
  [data-spin="true"]  [data-ptr-spin] { display: block; }
  [data-spin="false"] [data-ptr-icon] { display: block; }
  [data-spin="false"] [data-ptr-spin] { display: none;  }
`;

// ── Pull-to-Refresh Indicator ─────────────────────────────────────────────────
const PullIndicator = ({ indicatorRef }) => (
  <div
    ref={indicatorRef}
    data-spin="false"
    style={{
      overflow:       'hidden',
      height:         0,
      opacity:        0,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      transition:     'height 0.2s ease, opacity 0.2s ease',
    }}
  >
    {/* Arrow */}
    <svg
      data-ptr-icon
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#466460"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>

    {/* Spinner */}
    <svg
      data-ptr-spin
      width="20" height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#466460"
      strokeWidth="2.5"
      style={{ animation: 'ptr-spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3 a9 9 0 0 1 9 9" />
    </svg>
  </div>
);

// ─── DB → component shape mapper (used in both fetch and save) ────────────────
const mapDbToProfile = (profileData, fallbackEmail = '') => ({
  firstName:             profileData.first_name              || '',
  middleName:            profileData.middle_name             || '',
  lastName:              profileData.last_name               || '',
  suffix:                profileData.suffix                  || '',
  birthday:              profileData.birthday                || '',
  age:                   profileData.age                     || '',
  sex:                   profileData.sex                     || '',
  bloodType:             profileData.blood_type              || '',
  homeAddress:           profileData.home_address            || '',
  religion:              profileData.religion                || '',
  nationality:           profileData.nationality             || '',
  civilStatus:           profileData.civil_status            || '',
  universityId:          profileData.university_id           || '',
  role:                  profileData.role                    || '',
  studentId:             profileData.student_id              || '',
  department:            profileData.department              || '',
  program:               profileData.program                 || '',
  yearLevel:             profileData.year_level              || '',
  section:               profileData.section                 || '',
  studentClassification: profileData.student_classification  || 'Regular',
  classification:        profileData.classification          || '',
  jobTitle:              profileData.job_title               || '',
  email:                 profileData.email                   || fallbackEmail,
  phoneNumber:           profileData.phone_number            || '',
  emergencyContact: {
    name:         profileData.emergency_contact?.name         || '',
    relationship: profileData.emergency_contact?.relationship || '',
    phone:        profileData.emergency_contact?.phone        || '',
    address:      profileData.emergency_contact?.address      || '',
  },
  vaccinations: {
    dose1:    { vaccineName: profileData.vaccinations?.dose1?.vaccineName    || '', date: profileData.vaccinations?.dose1?.date    || '' },
    dose2:    { vaccineName: profileData.vaccinations?.dose2?.vaccineName    || '', date: profileData.vaccinations?.dose2?.date    || '' },
    booster1: { vaccineName: profileData.vaccinations?.booster1?.vaccineName || '', date: profileData.vaccinations?.booster1?.date || '' },
    booster2: { vaccineName: profileData.vaccinations?.booster2?.vaccineName || '', date: profileData.vaccinations?.booster2?.date || '' },
    declined: typeof profileData.vaccinations?.declined === 'object' ? profileData.vaccinations?.declined : (profileData.vaccinations?.declined ? { dose1: true, dose2: true, booster1: true, booster2: true } : { dose1: false, dose2: false, booster1: false, booster2: false }),
  },
  dentalHistory: {
    lastVisit:   profileData.dental_history?.lastVisit   || '',
    prevDentist: profileData.dental_history?.prevDentist || '',
    physician:   profileData.dental_history?.physician   || '',
    procedures:  profileData.dental_history?.procedures  || {},
    declined:    profileData.dental_history?.declined    || false,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileUsers({ onLogout }) {
  const navigate = useNavigate();

  const [loading, setLoading]         = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);
  const [toast, setToast]             = useState(null);

  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData]             = useState({});
  const [isSaving, setIsSaving]             = useState(false);
  const [dentalDeclined, setDentalDeclined] = useState(false);
  const [vaccinationsDeclined, setVaccinationsDeclined] = useState({ dose1: false, dose2: false, booster1: false, booster2: false });
  const [selectedEditDept, setSelectedEditDept] = useState('');

  // Address modal states
  const [addressModal, setAddressModal] = useState({ type: null, isOpen: false });
  const [addressInitialData, setAddressInitialData] = useState({});

  const [xrayDate, setXrayDate]           = useState('April 22, 2026');
  const [xrayFile, setXrayFile]           = useState('X-ray_Report_2026.pdf');
  const [drugtestDate, setDrugtestDate]   = useState('April 22, 2026');
  const [drugtestFile, setDrugtestFile]   = useState('Drug_Test_Result_2026.pdf');
  const [documentsNote, setDocumentsNote] = useState('Valid documents · last updated April 2026');
  const [previewModal, setPreviewModal]       = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewContent, setPreviewContent]   = useState(null);
  const [pendingFile, setPendingFile]         = useState(null);
  const [pendingDocType, setPendingDocType]   = useState(null);
  const xrayInputRef     = useRef(null);
  const drugtestInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '',
    birthday: '', age: '', sex: '', bloodType: '',
    homeAddress: '', religion: '', nationality: '', civilStatus: '',
    universityId: '', role: '',
    studentId: '', department: '', program: '', yearLevel: '', section: '',
    studentClassification: '',
    classification: '', jobTitle: '',
    email: '', phoneNumber: '',
    emergencyContact: { name: '', relationship: '', phone: '', address: '' },
    vaccinations: {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
      declined: { dose1: false, dose2: false, booster1: false, booster2: false },
    },
    dentalHistory: {
      lastVisit: '', prevDentist: '', physician: '',
      declined: false,
      procedures: {}
    }
  });

  // ── Fetch Profile Extracted for PTR ──────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const accessToken  = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';

      if (accessToken) {
        await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const activeUid   = user?.id || currentUser?.uid;

      if (!activeUid) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', activeUid)
        .limit(1);

      const profileData = data?.[0] || null;
      if (error) throw error;

      if (profileData) {
        setProfile(mapDbToProfile(profileData, user?.email || currentUser?.email || ''));
      } else {
        setProfile(prev => ({ ...prev, email: user?.email || currentUser?.email || '' }));
      }
    } catch (err) {
      console.error('[ProfileUsers] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Pull-to-refresh hook ────────────────────────────────────────────────────
  const { scrollElRef, indicatorRef } = usePullToRefresh(async () => {
    await fetchProfile();
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fullName = [
    profile.firstName,
    profile.middleName || '',
    profile.lastName,
    profile.suffix,
  ].filter(Boolean).join(' ');

  const isStudent = profile.role?.toLowerCase() === 'student';

  // ── Check for empty fields in each section ─────────────────────────────────
  const isFieldEmpty = (value) => !value || value === '';

  const personalFields = [
    profile.birthday, profile.age, profile.sex, profile.bloodType,
    profile.civilStatus, profile.religion, profile.nationality, profile.homeAddress
  ];
  const hasEmptyPersonal = personalFields.some(isFieldEmpty);

  const academicFields = isStudent
    ? [profile.universityId || profile.studentId, profile.department, profile.program, profile.yearLevel, profile.section, profile.studentClassification]
    : [profile.classification, profile.department, profile.jobTitle];
  const hasEmptyAcademic = academicFields.some(isFieldEmpty);

  const contactFields = [profile.email, profile.phoneNumber];
  const hasEmptyContact = contactFields.some(isFieldEmpty);

  const emergencyFields = [profile.emergencyContact?.name, profile.emergencyContact?.relationship, profile.emergencyContact?.phone, profile.emergencyContact?.address];
  const hasEmptyEmergency = emergencyFields.some(isFieldEmpty);

  const vaccinationFields = Object.values(profile.vaccinations || {});
  const hasEmptyVaccinations =
    (!profile.vaccinations?.declined?.dose1 && !profile.vaccinations?.dose1?.vaccineName && !profile.vaccinations?.dose1?.date) ||
    (!profile.vaccinations?.declined?.dose2 && !profile.vaccinations?.dose2?.vaccineName && !profile.vaccinations?.dose2?.date) ||
    (!profile.vaccinations?.declined?.booster1 && !profile.vaccinations?.booster1?.vaccineName && !profile.vaccinations?.booster1?.date) ||
    (!profile.vaccinations?.declined?.booster2 && !profile.vaccinations?.booster2?.vaccineName && !profile.vaccinations?.booster2?.date);

  const dentalFields = [profile.dentalHistory?.lastVisit, profile.dentalHistory?.prevDentist, profile.dentalHistory?.physician];
  const hasEmptyDental = !profile.dentalHistory?.declined && dentalFields.every(isFieldEmpty);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenSettings = () => {
    navigate('/student/settings', { state: { activeTab: 'general' } });
  };

  // ── Editing Handlers ─────────────────────────────────────────────────────
  const openEdit   = (section) => {
    setEditData(JSON.parse(JSON.stringify(profile)));
    setEditingSection(section);
    // Initialize declined states from profile
    setDentalDeclined(profile.dentalHistory?.declined || false);
    setVaccinationsDeclined(profile.vaccinations?.declined || { dose1: false, dose2: false, booster1: false, booster2: false });
    // Set initial department for program filtering
    if (section === 'academic') {
      const currentDept = profile.department;
      // Find department abbreviation from full name
      const deptAbbr = Object.entries(DEPT_ABBR_TO_FULL).find(([abbr, full]) => full === currentDept)?.[0] || '';
      setSelectedEditDept(deptAbbr);
    }
  };
  const closeEdit  = ()        => { setEditingSection(null); setEditData({}); setSelectedEditDept(''); };

  // ── Address Modal Handlers ─────────────────────────────────────────────────
  const openAddressModal = (type) => {
    const initialData = type === 'personal'
      ? { addressStreet: editData.homeAddress || '' }
      : { addressStreet: editData.emergencyContact?.address || '' };
    setAddressInitialData(initialData);
    setAddressModal({ type, isOpen: true });
  };

  const closeAddressModal = () => {
    setAddressModal({ type: null, isOpen: false });
    setAddressInitialData({});
  };

  const handleAddressConfirm = (addressData) => {
    if (addressModal.type === 'personal') {
      setEditData(prev => ({ ...prev, homeAddress: addressData.homeAddress }));
    } else if (addressModal.type === 'emergency') {
      setEditData(prev => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, address: addressData.homeAddress }
      }));
    }
    closeAddressModal();
  };

  const handleChange           = (field, value)        => setEditData(prev => ({ ...prev, [field]: value }));
  const handleNestedChange     = (parent, field, value) => setEditData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  const handleVaxChange        = (dose, field, value)  => setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, [dose]: { ...prev.vaccinations[dose], [field]: value } } }));
  const handleDentalChange     = (field, value)        => setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, [field]: value } }));
  const handleDentalProcChange = (proc, value)         => setEditData(prev => ({ ...prev, dentalHistory: { ...prev.dentalHistory, procedures: { ...(prev.dentalHistory.procedures || {}), [proc]: value } } }));

  // ── Section-to-field mapper ─────────────────────────────────────────────────
  const getSectionFields = (section, isStudentUser) => {
    const sectionFields = {
      personal: [
        'firstName', 'middleName', 'lastName', 'suffix',
        'birthday', 'age', 'sex', 'bloodType',
        'civilStatus', 'religion', 'nationality', 'homeAddress'
      ],
      academic: isStudentUser
        ? ['universityId', 'department', 'program', 'yearLevel', 'section', 'studentClassification']
        : ['classification', 'department', 'jobTitle'],
      contact: ['email', 'phoneNumber'],
      emergency: ['emergencyContact'],
      vaccinations: ['vaccinations'],
      dental: ['dentalHistory'],
    };
    return sectionFields[section] || [];
  };

  // ── Extract only the fields for the section being edited ────────────────────
  const extractSectionData = (editData, section, isStudentUser) => {
    const fields = getSectionFields(section, isStudentUser);
    const sectionData = {};

    fields.forEach(field => {
      // Handle nested objects (emergencyContact, vaccinations, dentalHistory)
      if (editData[field] && typeof editData[field] === 'object' && !Array.isArray(editData[field])) {
        sectionData[field] = editData[field];
      } else {
        // Flat fields - send as camelCase (backend handles snake_case conversion)
        sectionData[field] = editData[field];
      }
    });

    return sectionData;
  };

  const saveProfileEdits = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Only send the fields for the section being edited
      const sectionData = extractSectionData(editData, editingSection, isStudent);

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

      // Merge the updated section data with existing profile
      const updatedProfile = { ...profile };

      // Map database field names back to component field names
      const fieldReverseMap = {
        first_name: 'firstName',
        middle_name: 'middleName',
        last_name: 'lastName',
        suffix: 'suffix',
        birthday: 'birthday',
        age: 'age',
        sex: 'sex',
        blood_type: 'bloodType',
        civil_status: 'civilStatus',
        religion: 'religion',
        nationality: 'nationality',
        home_address: 'homeAddress',
        university_id: 'universityId',
        department: 'department',
        program: 'program',
        year_level: 'yearLevel',
        section: 'section',
        student_classification: 'studentClassification',
        classification: 'classification',
        job_title: 'jobTitle',
        email: 'email',
        phone_number: 'phoneNumber',
      };

      // Apply the returned data to the profile (API returns camelCase)
      Object.keys(data.data).forEach(key => {
        if (key === 'emergencyContact' || key === 'vaccinations' || key === 'dentalHistory') {
          updatedProfile[key] = data.data[key];
        } else {
          updatedProfile[key] = data.data[key];
        }
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

  // ── Document upload handlers ─────────────────────────────────────────────
  const handleFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setPendingDocType(docType);
    setPreviewFileName(file.name);
    if (file.type.startsWith('image/')) {
      setPreviewContent(<img src={URL.createObjectURL(file)} alt="Preview" style={{ maxWidth: '100%', borderRadius: 12 }} />);
    } else if (file.type === 'application/pdf') {
      setPreviewContent(<iframe src={URL.createObjectURL(file)} title="PDF Preview" style={{ width: '100%', height: 300, border: 'none', borderRadius: 12 }} />);
    } else {
      setPreviewContent(
        <div style={{ textAlign: 'center', padding: 40, color: '#9bb5a5' }}>
          <DocIcon /><div style={{ fontSize: 12, marginTop: 8 }}>{file.name}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Preview not available.</div>
        </div>
      );
    }
    setPreviewModal(true);
    e.target.value = '';
  };

  const closePreview = () => { setPreviewModal(false); setPendingFile(null); setPendingDocType(null); setPreviewContent(null); };

  const confirmUpdate = () => {
    if (!pendingFile || !pendingDocType) { closePreview(); return; }
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(pendingFile.type)) {
      showToast('Invalid file type. PDF, JPG, or PNG only.'); closePreview(); return;
    }
    if (pendingFile.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB.'); closePreview(); return;
    }
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (pendingDocType === 'xray') { setXrayDate(dateStr); setXrayFile(pendingFile.name); showToast('X-RAY updated'); }
    else { setDrugtestDate(dateStr); setDrugtestFile(pendingFile.name); showToast('Drug Test updated'); }
    setDocumentsNote('Documents pending verification...');
    setTimeout(() => { setDocumentsNote('Valid documents · last updated ' + dateStr); showToast('Documents verified and saved'); }, 2000);
    closePreview();
  };

  if (loading && !profile.email) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#466460', fontSize: 13, fontWeight: 600 }}>
        Loading profile...
      </div>
    );
  }

  const clsColors = classificationColors[profile.studentClassification] || classificationColors.Regular;

  return (
    <div
      ref={scrollElRef}
      style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14, scrollbarWidth: 'none' }}
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
        <InfoRow label="Birthday"     value={profile.birthday}     empty={isFieldEmpty(profile.birthday)} />
        <InfoRow label="Age"          value={profile.age}          empty={isFieldEmpty(profile.age)} />
        <InfoRow label="Sex"          value={profile.sex}          empty={isFieldEmpty(profile.sex)} />
        <InfoRow label="Blood Type"   value={profile.bloodType}   empty={isFieldEmpty(profile.bloodType)} />
        <InfoRow label="Civil Status" value={profile.civilStatus} empty={isFieldEmpty(profile.civilStatus)} />
        <InfoRow label="Religion"     value={profile.religion}     empty={isFieldEmpty(profile.religion)} />
        <InfoRow label="Nationality"  value={profile.nationality}  empty={isFieldEmpty(profile.nationality)} />
        <InfoRow label="Home Address" value={profile.homeAddress} empty={isFieldEmpty(profile.homeAddress)} last />
      </Card>

      {/* ── Academic / Work Info ── */}
      <Card>
        <SectionHeader label={isStudent ? 'Academic Information' : 'Work Information'} onEdit={() => openEdit('academic')} hasEmpty={hasEmptyAcademic} />
        {isStudent ? (
          <>
            <InfoRow label="Student No."    value={profile.universityId || profile.studentId} empty={isFieldEmpty(profile.universityId || profile.studentId)} />
            <InfoRow label="Department"     value={profile.department} empty={isFieldEmpty(profile.department)} />
            <InfoRow label="Program"        value={profile.program} empty={isFieldEmpty(profile.program)} />
            <InfoRow label="Year Level"     value={profile.yearLevel} empty={isFieldEmpty(profile.yearLevel)} />
            <InfoRow label="Section"        value={profile.section} empty={isFieldEmpty(profile.section)} />
            <InfoRow label="Classification" value={profile.studentClassification} empty={isFieldEmpty(profile.studentClassification)} last />
          </>
        ) : (
          <>
            <InfoRow label="Classification" value={profile.classification} empty={isFieldEmpty(profile.classification)} />
            <InfoRow label="Department"     value={profile.department} empty={isFieldEmpty(profile.department)} />
            <InfoRow label="Job Title"      value={profile.jobTitle} last />
          </>
        )}
      </Card>

      {/* ── Contact Details ── */}
      <Card>
        <SectionHeader label="Contact Details" onEdit={() => openEdit('contact')} hasEmpty={hasEmptyContact} />
        <InfoRow label="Email Address" value={profile.email} empty={isFieldEmpty(profile.email)} />
        <InfoRow label="Phone Number"  value={profile.phoneNumber} empty={isFieldEmpty(profile.phoneNumber)} last />
      </Card>

      {/* ── Emergency Contact ── */}
      <Card>
        <SectionHeader label="Emergency Contact" onEdit={() => openEdit('emergency')} hasEmpty={hasEmptyEmergency} />
        <InfoRow label="Name"         value={profile.emergencyContact.name}         empty={isFieldEmpty(profile.emergencyContact?.name)} />
        <InfoRow label="Relationship" value={profile.emergencyContact.relationship} empty={isFieldEmpty(profile.emergencyContact?.relationship)} />
        <InfoRow label="Phone"        value={profile.emergencyContact.phone}        empty={isFieldEmpty(profile.emergencyContact?.phone)} />
        <InfoRow label="Address"      value={profile.emergencyContact.address}      empty={isFieldEmpty(profile.emergencyContact?.address)} last />
      </Card>

      {/* ── COVID-19 Vaccination History ── */}
      <Card>
        <SectionHeader label="COVID-19 Vaccination History" onEdit={() => openEdit('vaccinations')} hasEmpty={hasEmptyVaccinations} />
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #edf3f0' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Dose</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Vaccine Brand</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase', textAlign: 'right' }}>Date Given</span>
        </div>
        {DOSE_LABELS.map(({ key, label }, i) => {
          const v = profile.vaccinations?.[key];
          const isDeclined = profile.vaccinations?.declined?.[key];
          const doseEmpty = !v?.vaccineName && !v?.date;
          const showEmpty = !isDeclined && doseEmpty;
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, padding: '9px 0', borderBottom: i < DOSE_LABELS.length - 1 ? '1px solid #edf3f0' : 'none', alignItems: 'center', backgroundColor: isDeclined ? '#e0eceb' : (showEmpty ? '#fffbeb' : 'transparent'), marginLeft: isDeclined || showEmpty ? -16 : 0, marginRight: isDeclined || showEmpty ? -16 : 0, paddingLeft: isDeclined || showEmpty ? 16 : 0, paddingRight: isDeclined || showEmpty ? 16 : 0, borderRadius: (isDeclined || showEmpty) ? '8px' : 0 }}>
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
      </Card>

      {/* ── Dental History ── */}
      <Card>
        <SectionHeader label="Dental History" onEdit={() => openEdit('dental')} hasEmpty={hasEmptyDental} />
        {profile.dentalHistory?.declined ? (
          <div style={{ padding: '12px 16px', background: '#e0eceb', borderRadius: 10, marginTop: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#466460' }}>No dental history / Not applicable</span>
          </div>
        ) : (
        <>
        <InfoRow label="Last Dental Visit" value={profile.dentalHistory.lastVisit} empty={isFieldEmpty(profile.dentalHistory?.lastVisit)} />
        <InfoRow label="Previous Dentist"  value={profile.dentalHistory.prevDentist ? `Dr. ${profile.dentalHistory.prevDentist}` : ''} empty={isFieldEmpty(profile.dentalHistory?.prevDentist)} />
        <InfoRow label="Physician"         value={profile.dentalHistory.physician   ? `Dr. ${profile.dentalHistory.physician}`   : ''} empty={isFieldEmpty(profile.dentalHistory?.physician)} last />
        </>
        )}
      </Card>

      {/* ── Health Documents ── */}
      {!isStudent && <Card>
        <SectionHeader label="Health Documents" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #edf3f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#466460', background: '#e0eceb', padding: '3px 10px', borderRadius: 30, width: 'fit-content' }}>{xrayDate}</span>
            <span style={{ fontSize: 11, color: '#6b8577', fontWeight: 500 }}>{xrayFile}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#e0eceb', padding: '5px 12px', borderRadius: 30, fontSize: 12, fontWeight: 700, color: '#466460' }}>X-RAY</span>
            <button onClick={() => xrayInputRef.current?.click()} style={{ background: '#466460', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 10, cursor: 'pointer' }}>Update</button>
            <input ref={xrayInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => handleFileChange(e, 'xray')} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#466460', background: '#e0eceb', padding: '3px 10px', borderRadius: 30, width: 'fit-content' }}>{drugtestDate}</span>
            <span style={{ fontSize: 11, color: '#6b8577', fontWeight: 500 }}>{drugtestFile}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#e0eceb', padding: '5px 12px', borderRadius: 30, fontSize: 12, fontWeight: 700, color: '#466460' }}>Drug Test</span>
            <button onClick={() => drugtestInputRef.current?.click()} style={{ background: '#466460', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 10, cursor: 'pointer' }}>Update</button>
            <input ref={drugtestInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => handleFileChange(e, 'drugtest')} />
          </div>
        </div>
        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #c4dbd8' }} />
        <div style={{ fontSize: 10, fontWeight: 600, color: '#466460', background: '#e0eceb', padding: '8px 12px', borderRadius: 40, width: 'fit-content' }}>{documentsNote}</div>
      </Card>}

      {/* ── Settings Button ── */}
      <button
        onClick={handleOpenSettings}
        style={{
          width: '100%', background: '#fff',
          border: '1px solid #c4dbd8', color: '#466460',
          padding: 14, borderRadius: 16,
          fontSize: 12, fontWeight: 700,
          cursor: 'pointer', marginTop: 4,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f4f7f5'}
        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
      >
        <SettingsGearIcon /> SETTINGS
      </button>

      {/* ── Sign Out Button ── */}
      <button
        onClick={() => setLogoutModal(true)}
        style={{ width: '100%', background: '#fff', border: '1px solid #ffdde1', color: '#e53e3e', padding: 14, borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
      >
        SIGN OUT
      </button>

      {/* ── Edit Profile Modal ── */}
      {editingSection && (
        <div onClick={e => e.target === e.currentTarget && closeEdit()} style={{ position: 'fixed', inset: 0, background: 'rgba(26, 46, 34, 0.4)', backdropFilter: 'blur(3px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>

            <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #edf3f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#466460', textTransform: 'capitalize' }}>Edit {editingSection} Info</span>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: '#9bb5a5', cursor: 'pointer', fontSize: 18, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

              {/* ── Personal Section ── */}
              {editingSection === 'personal' && (
                <>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="First Name">
                      <input style={inputStyle} value={editData.firstName} onChange={e => handleChange('firstName', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="M.I.">
                      <input style={{ ...inputStyle, width: 120 }} value={editData.middleName} onChange={e => handleChange('middleName', e.target.value)} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="Last Name">
                      <input style={{ ...inputStyle, flex: 1 }} value={editData.lastName} onChange={e => handleChange('lastName', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="Suffix">
                      <input style={{ ...inputStyle, width: 80 }} placeholder="Jr, III" value={editData.suffix} onChange={e => handleChange('suffix', e.target.value)} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <FormGroup label="Birthday">
                        <DatePicker value={editData.birthday || ''} onChange={val => handleChange('birthday', val)} />
                      </FormGroup>
                    </div>
                    <FormGroup label="Age">
                      <input type="number" style={{ ...inputStyle, width: 80 }} value={editData.age} onChange={e => handleChange('age', e.target.value)} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="Sex">
                      <select style={inputStyle} value={editData.sex} onChange={e => handleChange('sex', e.target.value)}>
                        <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="Blood Type">
                      <select style={inputStyle} value={editData.bloodType} onChange={e => handleChange('bloodType', e.target.value)}>
                        <option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option>
                        <option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option>
                        <option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </FormGroup>
                  </div>
                  <FormGroup label="Civil Status">
                    <select style={inputStyle} value={editData.civilStatus} onChange={e => handleChange('civilStatus', e.target.value)}>
                      <option value="">Select</option>
                      {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Religion">
                    <select style={inputStyle} value={editData.religion} onChange={e => handleChange('religion', e.target.value)}>
                      <option value="">Select</option>
                      {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Nationality">
                    <select style={inputStyle} value={editData.nationality} onChange={e => handleChange('nationality', e.target.value)}>
                      <option value="">Select</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Home Address">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={editData.homeAddress}
                        onChange={e => handleChange('homeAddress', e.target.value)}
                        placeholder="Click to select address"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => openAddressModal('personal')}
                        style={{ padding: '12px 16px', background: '#466460', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Select
                      </button>
                    </div>
                  </FormGroup>
                </>
              )}

              {/* ── Academic Section (Student) ── */}
              {editingSection === 'academic' && isStudent && (
                <>
                  <FormGroup label="Student No.">
                    <input style={inputStyle} value={editData.universityId || editData.studentId} onChange={e => handleChange('universityId', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Department">
                    <select
                      style={inputStyle}
                      value={editData.department}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        handleChange('department', selectedValue);
                        // Find abbreviation and update program filter
                        const deptAbbr = Object.entries(DEPT_ABBR_TO_FULL).find(([abbr, full]) => full === selectedValue)?.[0] || '';
                        setSelectedEditDept(deptAbbr);
                        // Reset program if department changed
                        if (!selectedValue || !PROGRAMS_BY_DEPT[deptAbbr]?.includes(editData.program)) {
                          handleChange('program', '');
                        }
                      }}
                    >
                      <option value="">Select</option>
                      {DEPARTMENTS.map(d => <option key={d} value={DEPT_ABBR_TO_FULL[d]}>{DEPT_ABBR_TO_FULL[d]}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Program">
                    <select
                      style={inputStyle}
                      value={editData.program}
                      onChange={e => handleChange('program', e.target.value)}
                      disabled={!selectedEditDept}
                    >
                      <option value="">{!selectedEditDept ? 'Select department first' : 'Select'}</option>
                      {selectedEditDept && getProgramsByDept(selectedEditDept).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </FormGroup>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <FormGroup label="Year Level">
                      <select style={inputStyle} value={editData.yearLevel} onChange={e => handleChange('yearLevel', e.target.value)}>
                        <option value="">Select</option>
                        {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </FormGroup>
                    <FormGroup label="Section">
                      <select style={inputStyle} value={editData.section} onChange={e => handleChange('section', e.target.value)}>
                        <option value="">Select</option>
                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FormGroup>
                  </div>
                  <FormGroup label="Student Classification">
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {STUDENT_CLASSIFICATIONS.map(cls => {
                        const isActive = editData.studentClassification === cls;
                        const colors   = classificationColors[cls];
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => handleChange('studentClassification', cls)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                              border: `1px solid ${isActive ? colors.dot : '#c4dbd8'}`,
                              background: isActive ? colors.bg : '#fbfcfc',
                              color: isActive ? colors.text : '#94a3b8',
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

              {/* ── Academic Section (Staff) ── */}
              {editingSection === 'academic' && !isStudent && (
                <>
                  <FormGroup label="Classification">
                    <select style={inputStyle} value={editData.classification} onChange={e => handleChange('classification', e.target.value)}>
                      <option value="">Select</option>
                      {['Faculty', 'Admin', 'Staff', 'Nurse', 'Doctor'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Department">
                    <select style={inputStyle} value={editData.department} onChange={e => handleChange('department', e.target.value)}>
                      <option value="">Select</option>
                      {DEPARTMENTS.map(d => <option key={d} value={DEPT_ABBR_TO_FULL[d]}>{DEPT_ABBR_TO_FULL[d]}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Job Title"><input style={inputStyle} value={editData.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} /></FormGroup>
                </>
              )}

              {/* ── Contact Section ── */}
              {editingSection === 'contact' && (
                <>
                  <FormGroup label="Email Address">
                    <input style={inputStyle} type="email" value={editData.email} onChange={e => handleChange('email', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Phone Number">
                    <input style={inputStyle} value={editData.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)} />
                  </FormGroup>
                  <p style={{ fontSize: 11, color: '#9bb5a5', marginTop: -4 }}>Note: Changing your email may require you to verify your identity by signing in again.</p>
                </>
              )}

              {/* ── Emergency Section ── */}
              {editingSection === 'emergency' && (
                <>
                  <FormGroup label="Contact Name"><input style={inputStyle} value={editData.emergencyContact.name} onChange={e => handleNestedChange('emergencyContact', 'name', e.target.value)} /></FormGroup>
                  <FormGroup label="Relationship">
                    <select style={inputStyle} value={editData.emergencyContact.relationship} onChange={e => handleNestedChange('emergencyContact', 'relationship', e.target.value)}>
                      <option value="">Select</option>
                      {EMERGENCY_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Phone Number"><input style={inputStyle} value={editData.emergencyContact.phone} onChange={e => handleNestedChange('emergencyContact', 'phone', e.target.value)} /></FormGroup>
                  <FormGroup label="Address">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={editData.emergencyContact?.address}
                        onChange={e => handleNestedChange('emergencyContact', 'address', e.target.value)}
                        placeholder="Click to select address"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => openAddressModal('emergency')}
                        style={{ padding: '12px 16px', background: '#466460', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Select
                      </button>
                    </div>
                  </FormGroup>
                </>
              )}

              {/* ── Vaccinations Section ── */}
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
                            <span style={{ fontSize: 11, fontWeight: 600, color: isDeclined ? '#92400e' : '#6b8577' }}>
                              N/A
                            </span>
                          </label>
                        </div>
                        {!isDeclined && (
                          <>
                            <FormGroup label="Vaccine Brand">
                              <select style={{...inputStyle, backgroundColor: '#fff'}} value={editData.vaccinations[key]?.vaccineName || ''} onChange={e => handleVaxChange(key, 'vaccineName', e.target.value)}>
                                <option value="">Select</option>
                                {VACCINE_BRANDS.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </FormGroup>
                            <FormGroup label="Date Given">
                              <DatePicker value={editData.vaccinations[key]?.date || ''} onChange={val => handleVaxChange(key, 'date', val)} />
                            </FormGroup>
                          </>
                        )}
                        {isDeclined && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Skipped / Not applicable</span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Dental History Section ── */}
              {editingSection === 'dental' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: dentalDeclined ? '#fef3c7' : '#f4f7f5', borderRadius: 10, marginBottom: 16, cursor: 'pointer', border: dentalDeclined ? '1px solid #f59e0b' : '1px solid #edf3f0' }}>
                    <input
                      type="checkbox"
                      checked={dentalDeclined}
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
                  {!dentalDeclined ? (
                  <>
                  <FormGroup label="Last Dental Visit">
                    <DatePicker value={editData.dentalHistory.lastVisit || ''} onChange={val => handleDentalChange('lastVisit', val)} />
                  </FormGroup>
                  <FormGroup label="Previous Dentist (Dr.)">
                    <input style={inputStyle} value={editData.dentalHistory.prevDentist} placeholder="e.g. Smith" onChange={e => handleDentalChange('prevDentist', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Physician (Dr.)">
                    <input style={inputStyle} value={editData.dentalHistory.physician} placeholder="e.g. Doe" onChange={e => handleDentalChange('physician', e.target.value)} />
                  </FormGroup>

                  <p style={{ fontSize: 11, fontWeight: 800, color: '#466460', margin: '24px 0 12px 0', textTransform: 'uppercase', borderTop: '1px solid #edf3f0', paddingTop: 20, letterSpacing: 0.5 }}>Procedures History</p>
                  {DENTAL_PROCEDURES.map(proc => {
                    const isYes = editData.dentalHistory.procedures?.[proc] === 'Yes';
                    const isNo  = editData.dentalHistory.procedures?.[proc] === 'No' || !editData.dentalHistory.procedures?.[proc];
                    return (
                      <div key={proc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: '#1a2e22', background: '#fbfcfc', border: '1px solid #edf3f0', padding: '10px 14px', borderRadius: 10 }}>
                        <span style={{ fontWeight: 600 }}>{proc}</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                            <input type="radio" name={`modal_dh_${proc}`} checked={isYes} onChange={() => handleDentalProcChange(proc, 'Yes')} style={{ accentColor: '#466460' }} /> Yes
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                            <input type="radio" name={`modal_dh_${proc}`} checked={isNo}  onChange={() => handleDentalProcChange(proc, 'No')}  style={{ accentColor: '#466460' }} /> No
                          </label>
                        </div>
                      </div>
                    );
                  })}
                  </>
                ) : null}
                </>
              )}



            <div style={{ padding: '16px 24px', borderTop: '1px solid #edf3f0', display: 'flex', gap: 12, background: '#fff' }}>
              <button onClick={closeEdit} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#f4f7f5', cursor: 'pointer', fontWeight: 600, color: '#6b8577', transition: 'background 0.2s' }}>Cancel</button>
              <button onClick={saveProfileEdits} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#466460', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1, transition: 'background 0.2s' }}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}


      {/* ── Logout Modal ── */}
      {logoutModal && (
        <div onClick={e => e.target === e.currentTarget && setLogoutModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26, 46, 34, 0.4)', backdropFilter: 'blur(3px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 20, width: 320, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 8px', color: '#1a2e22', fontSize: 18, fontWeight: 800 }}>Confirm Sign Out</h3>
            <p style={{ margin: '0 0 24px', color: '#6b8577', fontSize: 13 }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setLogoutModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#f4f7f5', color: '#6b8577', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => { setLogoutModal(false); if (onLogout) onLogout(); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewModal && (
        <div onClick={e => e.target === e.currentTarget && closePreview()} style={{ position: 'fixed', inset: 0, background: 'rgba(26, 46, 34, 0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 340, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#466460', padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, truncate: true, maxWidth: '80%' }}>Preview — {previewFileName}</span>
              <button onClick={closePreview} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>{previewContent}</div>
            <div style={{ display: 'flex', gap: 12, padding: '0 20px 20px' }}>
              <button onClick={closePreview} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#f4f7f5', color: '#6b8577', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={confirmUpdate} style={{ flex: 1, background: '#466460', color: '#fff', border: 'none', padding: 12, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#466460', color: '#fff', padding: '12px 24px', borderRadius: 40, fontSize: 13, fontWeight: 600, zIndex: 5000, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast}
        </div>
      )}

      {/* ── Address Modal ── */}
      <AddressModal
        isOpen={addressModal.isOpen}
        onClose={closeAddressModal}
        onConfirm={handleAddressConfirm}
        initialData={addressInitialData}
        zIndex={5000}
      />
    </div>
  );
}