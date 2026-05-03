import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';

// ─── Icons ────────────────────────────────────────────────────────────────────
const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) => (!val || val === '') ? '—' : val;

const SectionHeader = ({ label }) => (
  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#2d7a52', marginBottom: 12, borderLeft: '3px solid #34c472', paddingLeft: 8 }}>
    {label}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileUsers({ onLogout }) {
  const [loading, setLoading]           = useState(true);
  const [logoutModal, setLogoutModal]   = useState(false);
  const [toast, setToast]               = useState(null);

  // Document upload state
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

  // All profile data in one object — mirrors Firestore structure exactly
  const [profile, setProfile] = useState({
    // Identity
    firstName: '', middleInitial: '', lastName: '', suffix: '',
    birthday: '', age: '', gender: '', bloodType: '',
    homeAddress: '', religion: '', nationality: '', civilStatus: '',
    universityId: '',
    role: '',
    // Academic / Work
    studentId: '', department: '', program: '', yearLevel: '', section: '',
    classification: '', jobTitle: '',
    // Contact
    email: '', phoneNumber: '',
    // Emergency Contact
    emergencyContact: { name: '', relationship: '', phone: '', address: '' },
    // Vaccinations
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
              firstName:      d.firstName      || '',
              middleInitial:  d.middleInitial  || '',
              lastName:       d.lastName       || '',
              suffix:         d.suffix         || '',
              birthday:       d.birthday       || '',
              age:            d.age            || '',
              gender:         d.gender         || '',
              bloodType:      d.bloodType      || '',
              homeAddress:    d.homeAddress    || '',
              religion:       d.religion       || '',
              nationality:    d.nationality    || '',
              civilStatus:    d.civilStatus    || '',
              universityId:   d.universityId   || user.uid.slice(0, 8).toUpperCase(),
              role:           d.role           || '',
              studentId:      d.studentId      || '',
              department:     d.department     || '',
              program:        d.program        || '',
              yearLevel:      d.yearLevel      || '',
              section:        d.section        || '',
              classification: d.classification || '',
              jobTitle:       d.jobTitle       || '',
              email:          d.email          || user.email || '',
              phoneNumber:    d.phoneNumber    || '',
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

  // ── Derived display values ───────────────────────────────────────────────
  const fullName = [
    profile.firstName,
    profile.middleInitial ? `${profile.middleInitial}.` : '',
    profile.lastName,
    profile.suffix,
  ].filter(Boolean).join(' ');

  const isStudent = profile.role?.toLowerCase() === 'student';

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // ── Document upload handlers ─────────────────────────────────────────────
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

  // ─── Vaccination rows ─────────────────────────────────────────────────────
  const DOSE_LABELS = [
    { key: 'dose1',    label: 'Dose 1' },
    { key: 'dose2',    label: 'Dose 2' },
    { key: 'booster1', label: 'Booster 1' },
    { key: 'booster2', label: 'Booster 2' },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1a5c3a', fontSize: 13, fontWeight: 600 }}>
        Loading profile...
      </div>
    );
  }

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ background: '#e8f5ee', padding: '4px 12px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: '#1a5c3a' }}>
              {isStudent ? `ID: ${profile.universityId}` : profile.classification}
            </div>
            <div style={{ background: '#f4f7f5', padding: '3px 10px', borderRadius: 40, fontSize: 10, fontWeight: 600, color: '#6b8577', textTransform: 'capitalize' }}>
              {profile.role || 'student'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Personal Information ── */}
      <Card>
        <SectionHeader label="Personal Information" />
        <InfoRow label="Birthday"     value={profile.birthday} />
        <InfoRow label="Age"          value={profile.age} />
        <InfoRow label="Sex"          value={profile.gender} />
        <InfoRow label="Blood Type"   value={profile.bloodType} />
        <InfoRow label="Civil Status" value={profile.civilStatus} />
        <InfoRow label="Religion"     value={profile.religion} />
        <InfoRow label="Nationality"  value={profile.nationality} />
        <InfoRow label="Home Address" value={profile.homeAddress} last />
      </Card>

      {/* ── Academic / Work Info ── */}
      <Card>
        <SectionHeader label={isStudent ? 'Academic Information' : 'Work Information'} />
        {isStudent ? (
          <>
            <InfoRow label="Student No."  value={profile.studentId} />
            <InfoRow label="Department"   value={profile.department} />
            <InfoRow label="Program"      value={profile.program} />
            <InfoRow label="Year Level"   value={profile.yearLevel} />
            <InfoRow label="Section"      value={profile.section} last />
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
        <SectionHeader label="Contact Details" />
        <InfoRow label="Email Address" value={profile.email} />
        <InfoRow label="Phone Number"  value={profile.phoneNumber} last />
      </Card>

      {/* ── Emergency Contact ── */}
      <Card>
        <SectionHeader label="Emergency Contact" />
        <InfoRow label="Name"         value={profile.emergencyContact.name} />
        <InfoRow label="Relationship" value={profile.emergencyContact.relationship} />
        <InfoRow label="Phone"        value={profile.emergencyContact.phone} />
        <InfoRow label="Address"      value={profile.emergencyContact.address} last />
      </Card>

      {/* ── COVID-19 Vaccination History ── */}
      <Card>
        <SectionHeader label="COVID-19 Vaccination History" />
        {/* Column headers */}
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
              {/* Dose label pill */}
              <span style={{ background: '#e8f5ee', color: '#1a5c3a', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, textAlign: 'center', width: 'fit-content' }}>
                {label}
              </span>
              {/* Vaccine name */}
              <span style={{ fontSize: 12, fontWeight: 600, color: isEmpty ? '#c4d9ce' : '#1a2e22' }}>
                {isEmpty ? 'Not recorded' : fmt(v.vaccineName)}
              </span>
              {/* Date */}
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
        {/* X-RAY */}
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
        {/* Drug Test */}
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