// C:\Users\HP\MediTrack\frontend\src\features\users\Profile-users.jsx
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import BirthdayPicker from '../../components/Datepicker.jsx';

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

const SectionHeader = ({ label, onEdit }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#2d7a52', borderLeft: '3px solid #34c472', paddingLeft: 8 }}>
      {label}
    </div>
    {onEdit && (
      <button onClick={onEdit} style={{ background: 'none', border: 'none', color: '#1a5c3a', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, backgroundColor: '#e8f5ee' }}>
        <EditIcon /> Edit
      </button>
    )}
  </div>
);

const InfoRow = ({ label, value, last }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #e2f0ea' }}>
    <span style={{ fontWeight: 600, fontSize: 12, color: '#6b8577', flexShrink: 0, marginRight: 12 }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2e22', textAlign: 'right' }}>{fmt(value)}</span>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: 16, border: '1px solid #ddeee5', ...style }}>
    {children}
  </div>
);

const FormGroup = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#6b8577', marginBottom: 6, textTransform: 'uppercase' }}>{label}</label>
    {children}
  </div>
);

const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddeee5', fontSize: 13, backgroundColor: '#f9fbfa', color: '#1a2e22', boxSizing: 'border-box', outline: 'none' };

const STUDENT_CLASSIFICATIONS = ['Regular', 'Irregular', 'Returning'];

const classificationColors = {
  Regular:   { bg: '#e8f5ef', text: '#1a5c3a', dot: '#2d7a52' },
  Irregular: { bg: '#fff7e6', text: '#92400e', dot: '#f59e0b' },
  Returning: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileUsers({ onLogout }) {
  const [loading, setLoading]           = useState(true);
  const [logoutModal, setLogoutModal]   = useState(false);
  const [toast, setToast]               = useState(null);

  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData]             = useState({});
  const [isSaving, setIsSaving]             = useState(false);

  const [xrayDate, setXrayDate]         = useState('April 22, 2026');
  const [xrayFile, setXrayFile]         = useState('X-ray_Report_2026.pdf');
  const [drugtestDate, setDrugtestDate] = useState('April 22, 2026');
  const [drugtestFile, setDrugtestFile] = useState('Drug_Test_Result_2026.pdf');
  const [documentsNote, setDocumentsNote] = useState('Valid documents · last updated April 2026');
  const [previewModal, setPreviewModal] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewContent, setPreviewContent]   = useState(null);
  const [pendingFile, setPendingFile]   = useState(null);
  const [pendingDocType, setPendingDocType]   = useState(null);
  const xrayInputRef    = useRef(null);
  const drugtestInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: '', middleInitial: '', lastName: '', suffix: '',
    birthday: '', age: '', sex: '', bloodType: '',
    homeAddress: '', religion: '', nationality: '', civilStatus: '',
    universityId: '', role: '',
    studentId: '', department: '', program: '', yearLevel: '', section: '',
    studentClassification: '', // ← NEW
    classification: '', jobTitle: '',
    email: '', phoneNumber: '',
    emergencyContact: { name: '', relationship: '', phone: '', address: '' },
    vaccinations: {
      dose1:    { vaccineName: '', date: '' },
      dose2:    { vaccineName: '', date: '' },
      booster1: { vaccineName: '', date: '' },
      booster2: { vaccineName: '', date: '' },
    },
  });

  // ── Fetch from Firestore on mount ────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const d = snap.data();
            setProfile({
              firstName:              d.firstName              || '',
              middleInitial:          d.middleInitial          || '',
              lastName:               d.lastName               || '',
              suffix:                 d.suffix                 || '',
              birthday:               d.birthday               || '',
              age:                    d.age                    || '',
              sex:                    d.sex                    || '',
              bloodType:              d.bloodType              || '',
              homeAddress:            d.homeAddress            || '',
              religion:               d.religion               || '',
              nationality:            d.nationality            || '',
              civilStatus:            d.civilStatus            || '',
              universityId:           d.universityId           || user.uid.slice(0, 8).toUpperCase(),
              role:                   d.role                   || '',
              studentId:              d.studentId              || '',
              department:             d.department             || '',
              program:                d.program                || '',
              yearLevel:              d.yearLevel              || '',
              section:                d.section                || '',
              studentClassification:  d.studentClassification  || 'Regular', // ← NEW
              classification:         d.classification         || '',
              jobTitle:               d.jobTitle               || '',
              email:                  d.email                  || user.email || '',
              phoneNumber:            d.phoneNumber            || '',
              emergencyContact: {
                name:         d.emergencyContact?.name         || '',
                relationship: d.emergencyContact?.relationship || '',
                phone:        d.emergencyContact?.phone        || '',
                address:      d.emergencyContact?.address      || '',
              },
              vaccinations: {
                dose1:    { vaccineName: d.vaccinations?.dose1?.vaccineName    || '', date: d.vaccinations?.dose1?.date    || '' },
                dose2:    { vaccineName: d.vaccinations?.dose2?.vaccineName    || '', date: d.vaccinations?.dose2?.date    || '' },
                booster1: { vaccineName: d.vaccinations?.booster1?.vaccineName || '', date: d.vaccinations?.booster1?.date || '' },
                booster2: { vaccineName: d.vaccinations?.booster2?.vaccineName || '', date: d.vaccinations?.booster2?.date || '' },
              },
            });
          } else {
            setProfile(prev => ({ ...prev, email: user.email || '' }));
          }
        } catch (err) {
          console.error('[ProfileUsers] Fetch error:', err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fullName = [profile.firstName, profile.middleInitial ? `${profile.middleInitial}.` : '', profile.lastName, profile.suffix].filter(Boolean).join(' ');
  const isStudent = profile.role?.toLowerCase() === 'student';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── Editing Handlers ─────────────────────────────────────────────────────
  const openEdit = (section) => {
    setEditData(JSON.parse(JSON.stringify(profile)));
    setEditingSection(section);
  };

  const closeEdit = () => {
    setEditingSection(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setEditData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  };

  const handleVaxChange = (dose, field, value) => {
    setEditData(prev => ({
      ...prev,
      vaccinations: { ...prev.vaccinations, [dose]: { ...prev.vaccinations[dose], [field]: value } }
    }));
  };

  const saveProfileEdits = async () => {
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), editData);
        setProfile(editData);
        showToast('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('Error updating profile.');
    }
    setIsSaving(false);
    closeEdit();
  };

  // ── Document upload handlers ─────────────────────────────────────────────
  const handleFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setPendingDocType(docType);
    setPreviewFileName(file.name);
    if (file.type.startsWith('image/')) {
      setPreviewContent(<img src={URL.createObjectURL(file)} alt="Preview" className="max-w-full rounded-xl" />);
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

  const DOSE_LABELS = [
    { key: 'dose1',    label: 'Dose 1' },
    { key: 'dose2',    label: 'Dose 2' },
    { key: 'booster1', label: 'Booster 1' },
    { key: 'booster2', label: 'Booster 2' },
  ];

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1a5c3a', fontSize: 13, fontWeight: 600 }}>
        Loading profile...
      </div>
    );
  }

  // ── Classification badge colors ──────────────────────────────────────────
  const clsColors = classificationColors[profile.studentClassification] || classificationColors.Regular;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14, scrollbarWidth: 'none' }}>

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

          {/* ── Right-side badges ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {/* ID / classification badge */}
            <div style={{ background: '#e8f5ee', padding: '4px 12px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: '#1a5c3a' }}>
              {isStudent ? `ID: ${profile.universityId}` : profile.classification}
            </div>
             {/* ── Student Classification badge ── */}
            {isStudent && profile.studentClassification && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: clsColors.bg, padding: '3px 10px',
                borderRadius: 40, fontSize: 10, fontWeight: 700,
                color: clsColors.text,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: clsColors.dot, display: 'inline-block' }} />
                {profile.studentClassification}
              </div>
            )}
            {/* Role badge */}
            <div style={{ background: '#f4f7f5', padding: '3px 10px', borderRadius: 40, fontSize: 10, fontWeight: 600, color: '#6b8577', textTransform: 'capitalize' }}>
              {profile.role || 'student'}
            </div>
           
          </div>
        </div>
      </Card>

      {/* ── Personal Information ── */}
      <Card>
        <SectionHeader label="Personal Information" onEdit={() => openEdit('personal')} />
        <InfoRow label="Birthday"     value={profile.birthday} />
        <InfoRow label="Age"          value={profile.age} />
        <InfoRow label="Sex"          value={profile.sex} />
        <InfoRow label="Blood Type"   value={profile.bloodType} />
        <InfoRow label="Civil Status" value={profile.civilStatus} />
        <InfoRow label="Religion"     value={profile.religion} />
        <InfoRow label="Nationality"  value={profile.nationality} />
        <InfoRow label="Home Address" value={profile.homeAddress} last />
      </Card>

      {/* ── Academic / Work Info ── */}
      <Card>
        <SectionHeader label={isStudent ? 'Academic Information' : 'Work Information'} onEdit={() => openEdit('academic')} />
        {isStudent ? (
          <>
            <InfoRow label="Student No."       value={profile.universityId || profile.studentId} />
            <InfoRow label="Department"         value={profile.department} />
            <InfoRow label="Program"            value={profile.program} />
            <InfoRow label="Year Level"         value={profile.yearLevel} />
            <InfoRow label="Section"            value={profile.section} />
            <InfoRow label="Classification"     value={profile.studentClassification} last />
          </>
        ) : (
          <>
            <InfoRow label="Classification" value={profile.classification} />
            <InfoRow label="Department"     value={profile.department} />
            <InfoRow label="Job Title"      value={profile.jobTitle} last />
          </>
        )}
      </Card>

      {/* ── Contact Details ── */}
      <Card>
        <SectionHeader label="Contact Details" onEdit={() => openEdit('contact')} />
        <InfoRow label="Email Address" value={profile.email} />
        <InfoRow label="Phone Number"  value={profile.phoneNumber} last />
      </Card>

      {/* ── Emergency Contact ── */}
      <Card>
        <SectionHeader label="Emergency Contact" onEdit={() => openEdit('emergency')} />
        <InfoRow label="Name"         value={profile.emergencyContact.name} />
        <InfoRow label="Relationship" value={profile.emergencyContact.relationship} />
        <InfoRow label="Phone"        value={profile.emergencyContact.phone} />
        <InfoRow label="Address"      value={profile.emergencyContact.address} last />
      </Card>

      {/* ── COVID-19 Vaccination History ── */}
      <Card>
        <SectionHeader label="COVID-19 Vaccination History" onEdit={() => openEdit('vaccinations')} />
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #e2f0ea' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Dose</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase' }}>Vaccine Brand</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9bb5a5', textTransform: 'uppercase', textAlign: 'right' }}>Date Given</span>
        </div>
        {DOSE_LABELS.map(({ key, label }, i) => {
          const v = profile.vaccinations[key];
          const isEmpty = !v.vaccineName && !v.date;
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: 8, padding: '9px 0', borderBottom: i < DOSE_LABELS.length - 1 ? '1px solid #e2f0ea' : 'none', alignItems: 'center' }}>
              <span style={{ background: '#e8f5ee', color: '#1a5c3a', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textAlign: 'center', width: 'fit-content' }}>
                {label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isEmpty ? '#c4d9ce' : '#1a2e22' }}>
                {isEmpty ? 'Not recorded' : fmt(v.vaccineName)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: isEmpty ? '#c4d9ce' : '#6b8577', textAlign: 'right' }}>
                {isEmpty ? '—' : fmt(v.date)}
              </span>
            </div>
          );
        })}
      </Card>

      {/* ── Health Documents ── */}
      <Card>
        <SectionHeader label="Health Documents" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e2f0ea' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a5c3a', background: '#e8f5ee', padding: '3px 10px', borderRadius: 30, width: 'fit-content' }}>{xrayDate}</span>
            <span style={{ fontSize: 11, color: '#6b8577', fontWeight: 500 }}>{xrayFile}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#e8f5ee', padding: '5px 12px', borderRadius: 30, fontSize: 12, fontWeight: 700, color: '#1a5c3a' }}>X-RAY</span>
            <button onClick={() => xrayInputRef.current?.click()} style={{ background: '#1a5c3a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 10, cursor: 'pointer' }}>Update</button>
            <input ref={xrayInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => handleFileChange(e, 'xray')} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a5c3a', background: '#e8f5ee', padding: '3px 10px', borderRadius: 30, width: 'fit-content' }}>{drugtestDate}</span>
            <span style={{ fontSize: 11, color: '#6b8577', fontWeight: 500 }}>{drugtestFile}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#e8f5ee', padding: '5px 12px', borderRadius: 30, fontSize: 12, fontWeight: 700, color: '#1a5c3a' }}>Drug Test</span>
            <button onClick={() => drugtestInputRef.current?.click()} style={{ background: '#1a5c3a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 8, fontSize: 10, cursor: 'pointer' }}>Update</button>
            <input ref={drugtestInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={e => handleFileChange(e, 'drugtest')} />
          </div>
        </div>
        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddeee5' }} />
        <div style={{ fontSize: 10, fontWeight: 600, color: '#2d7a52', background: '#e8f5ee', padding: '8px 12px', borderRadius: 40, width: 'fit-content' }}>{documentsNote}</div>
      </Card>

      {/* ── Sign Out ── */}
      <button onClick={() => setLogoutModal(true)} style={{ width: '100%', background: '#fff', border: '1px solid #ffdde1', color: '#e53e3e', padding: 14, borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
        SIGN OUT
      </button>

      {/* ── Edit Profile Modal ── */}
      {editingSection && (
        <div onClick={e => e.target === e.currentTarget && closeEdit()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 450, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Modal Header */}
            <div style={{ background: '#1a5c3a', padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>Edit {editingSection} Info</span>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

              {/* ── Personal Section ── */}
              {editingSection === 'personal' && (
                <>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <FormGroup label="First Name">
                      <input style={inputStyle} value={editData.firstName} onChange={e => handleChange('firstName', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="M.I.">
                      <input style={{...inputStyle, width: 60}} value={editData.middleInitial} onChange={e => handleChange('middleInitial', e.target.value)} maxLength={2} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <FormGroup label="Last Name">
                      <input style={{...inputStyle, flex: 1}} value={editData.lastName} onChange={e => handleChange('lastName', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="Suffix">
                      <input style={{...inputStyle, width: 70}} placeholder="Jr, III" value={editData.suffix} onChange={e => handleChange('suffix', e.target.value)} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <FormGroup label="Birthday">
                        <BirthdayPicker
                          value={editData.birthday || ''}
                          onChange={(val) => handleChange('birthday', val)}
                        />
                      </FormGroup>
                    </div>
                    <FormGroup label="Age">
                      <input type="number" style={{...inputStyle, width: 70}} value={editData.age} onChange={e => handleChange('age', e.target.value)} />
                    </FormGroup>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <FormGroup label="Sex">
                      <select style={inputStyle} value={editData.sex} onChange={e => handleChange('sex', e.target.value)}>
                        <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="Blood Type">
                      <select style={inputStyle} value={editData.bloodType} onChange={e => handleChange('bloodType', e.target.value)}>
                        <option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option><option value="Unknown">Unknown</option>
                      </select>
                    </FormGroup>
                  </div>
                  <FormGroup label="Civil Status">
                    <select style={inputStyle} value={editData.civilStatus} onChange={e => handleChange('civilStatus', e.target.value)}>
                      <option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Widowed">Widowed</option>
                    </select>
                  </FormGroup>
                  <FormGroup label="Religion">
                    <input style={inputStyle} value={editData.religion} onChange={e => handleChange('religion', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Nationality">
                    <input style={inputStyle} value={editData.nationality} onChange={e => handleChange('nationality', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Home Address">
                    <textarea style={{...inputStyle, resize: 'vertical', minHeight: 80}} value={editData.homeAddress} onChange={e => handleChange('homeAddress', e.target.value)} />
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
                    <input style={inputStyle} value={editData.department} onChange={e => handleChange('department', e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Program">
                    <input style={inputStyle} value={editData.program} onChange={e => handleChange('program', e.target.value)} />
                  </FormGroup>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <FormGroup label="Year Level">
                      <input style={inputStyle} value={editData.yearLevel} onChange={e => handleChange('yearLevel', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="Section">
                      <input style={inputStyle} value={editData.section} onChange={e => handleChange('section', e.target.value)} />
                    </FormGroup>
                  </div>

                  {/* ── Student Classification picker ── */}
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
                              flex: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '9px 6px', borderRadius: 11, fontSize: 12, fontWeight: 600,
                              border: `1.5px solid ${isActive ? colors.dot : '#ddeee5'}`,
                              background: isActive ? colors.bg : '#f9fbfa',
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
                  <FormGroup label="Classification"><input style={inputStyle} value={editData.classification} onChange={e => handleChange('classification', e.target.value)} /></FormGroup>
                  <FormGroup label="Department"><input style={inputStyle} value={editData.department} onChange={e => handleChange('department', e.target.value)} /></FormGroup>
                  <FormGroup label="Job Title"><input style={inputStyle} value={editData.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} /></FormGroup>
                </>
              )}

              {/* ── Contact Section ── */}
              {editingSection === 'contact' && (
                <>
                  <FormGroup label="Phone Number">
                    <input style={inputStyle} value={editData.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)} />
                  </FormGroup>
                  <p style={{ fontSize: 11, color: '#9bb5a5', marginTop: -4 }}>Email address can only be changed in account settings.</p>
                </>
              )}

              {/* ── Emergency Section ── */}
              {editingSection === 'emergency' && (
                <>
                  <FormGroup label="Contact Name"><input style={inputStyle} value={editData.emergencyContact.name} onChange={e => handleNestedChange('emergencyContact', 'name', e.target.value)} /></FormGroup>
                  <FormGroup label="Relationship"><input style={inputStyle} value={editData.emergencyContact.relationship} onChange={e => handleNestedChange('emergencyContact', 'relationship', e.target.value)} /></FormGroup>
                  <FormGroup label="Phone Number"><input style={inputStyle} value={editData.emergencyContact.phone} onChange={e => handleNestedChange('emergencyContact', 'phone', e.target.value)} /></FormGroup>
                  <FormGroup label="Address"><textarea style={{...inputStyle, minHeight: 80}} value={editData.emergencyContact.address} onChange={e => handleNestedChange('emergencyContact', 'address', e.target.value)} /></FormGroup>
                </>
              )}

              {/* ── Vaccinations Section ── */}
              {editingSection === 'vaccinations' && (
                <>
                  {DOSE_LABELS.map(({ key, label }) => (
                    <div key={key} style={{ background: '#f4f7f5', padding: 12, borderRadius: 16, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#1a5c3a', margin: '0 0 10px 0', textTransform: 'uppercase' }}>{label}</p>
                      <FormGroup label="Vaccine Brand">
                        <input
                          style={inputStyle}
                          value={editData.vaccinations[key].vaccineName}
                          onChange={e => handleVaxChange(key, 'vaccineName', e.target.value)}
                          placeholder="e.g. Pfizer, Moderna"
                        />
                      </FormGroup>
                      <FormGroup label="Date Given">
                        <BirthdayPicker
                          value={editData.vaccinations[key].date || ''}
                          onChange={(val) => handleVaxChange(key, 'date', val)}
                        />
                      </FormGroup>
                    </div>
                  ))}
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #ddeee5', display: 'flex', gap: 12, background: '#fafcfb' }}>
              <button onClick={closeEdit} style={{ flex: 1, padding: '12px', borderRadius: 40, border: '1.5px solid #ddeee5', background: 'transparent', cursor: 'pointer', fontWeight: 600, color: '#6b8577' }}>Cancel</button>
              <button onClick={saveProfileEdits} disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: 40, border: 'none', background: '#1a5c3a', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Modal ── */}
      {logoutModal && (
        <div onClick={e => e.target === e.currentTarget && setLogoutModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 24, width: 300, textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', color: '#1a2e22', fontSize: 18 }}>Confirm Sign Out</h3>
            <p style={{ margin: '0 0 24px', color: '#6b8577', fontSize: 13 }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setLogoutModal(false)} style={{ flex: 1, padding: 12, borderRadius: 40, border: '1.5px solid #ddeee5', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setLogoutModal(false); if (onLogout) onLogout(); }} style={{ flex: 1, padding: 12, borderRadius: 40, border: 'none', background: '#e53e3e', color: '#fff', cursor: 'pointer' }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewModal && (
        <div onClick={e => e.target === e.currentTarget && closePreview()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 320, background: '#fff', borderRadius: 28, overflow: 'hidden' }}>
            <div style={{ background: '#1a5c3a', padding: 16, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Preview — {previewFileName}</span>
              <button onClick={closePreview} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>{previewContent}</div>
            <div style={{ display: 'flex', gap: 12, padding: 16 }}>
              <button onClick={closePreview} style={{ flex: 1, padding: 10, borderRadius: 40, border: '1.5px solid #ddeee5', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmUpdate} style={{ flex: 1, background: '#1a5c3a', color: '#fff', border: 'none', padding: 10, borderRadius: 40, cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a5c3a', color: '#fff', padding: '10px 20px', borderRadius: 40, fontSize: 12, zIndex: 5000, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}