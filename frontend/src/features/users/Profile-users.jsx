import React, { useState, useEffect, useRef } from 'react';
// ✅ ADDED 'getDoc' to the imports below
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase'; 

// Simple SVG Icons
const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function ProfileUsers({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null); 
  const [dbUserId, setDbUserId] = useState('');

  // Main display states
  const [nameVal, setNameVal] = useState('');
  const [birthdateVal, setBirthdateVal] = useState('');
  const [ageVal, setAgeVal] = useState('');
  const [genderVal, setGenderVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [phoneVal, setPhoneVal] = useState('');

  const [xrayDate, setXrayDate] = useState('April 22, 2026');
  const [xrayFile, setXrayFile] = useState('X-ray_Report_2026.pdf');
  const [drugtestDate, setDrugtestDate] = useState('April 22, 2026');
  const [drugtestFile, setDrugtestFile] = useState('Drug_Test_Result_2026.pdf');
  const [documentsNote, setDocumentsNote] = useState('Valid documents · last updated April 2026');

  const [toast, setToast] = useState(null);
  const [previewModal, setPreviewModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileSize, setPreviewFileSize] = useState('');
  const [previewContent, setPreviewContent] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingDocType, setPendingDocType] = useState(null);

  const xrayInputRef = useRef(null);
  const drugtestInputRef = useRef(null);

  const [draftName, setDraftName] = useState('');
  const [draftBirthdate, setDraftBirthdate] = useState('');
  const [draftAge, setDraftAge] = useState('');
  const [draftGender, setDraftGender] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  useEffect(() => {
    console.log("🔍 [Profile] Component mounted. Setting up Auth Listener...");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log(`🔍 [Profile] Fetching document named: ${user.uid}`);
          
          // Direct fetch by Document ID (which matches your UID)
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setCurrentDocId(userSnap.id); 

            const fName = data.firstName || '';
            const mInit = data.middleInitial ? `${data.middleInitial}. ` : '';
            const lName = data.lastName || '';
            setNameVal(`${fName} ${mInit}${lName}`.trim());

            setBirthdateVal(data.birthdate || 'Not set');
            setAgeVal(data.age || 'Not set');
            setGenderVal(data.gender || 'Not set');
            setEmailVal(data.email || user.email);
            setPhoneVal(data.phoneNumber || 'Not set');
            setDbUserId(data.universityId || user.uid.slice(0, 8).toUpperCase());
            console.log("🔍 [Profile] Data loaded successfully.");
          } else {
            console.warn("🔍 [Profile] No document found with this ID!");
            setEmailVal(user.email);
          }
        } catch (error) {
          console.error("🔍 [Profile] Error during data fetch:", error);
        }
      } else {
        console.log("🔍 [Profile] No user is currently logged in.");
      }
      setLoading(false);
    });

    return () => {
      console.log("🔍 [Profile] Component unmounting, cleaning up Auth Listener.");
      unsubscribe(); 
    };
  }, []);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function enterEdit() {
    setDraftName(nameVal);
    setDraftBirthdate(birthdateVal === 'Not set' ? '' : birthdateVal);
    setDraftAge(ageVal === 'Not set' ? '' : ageVal);
    setDraftGender(genderVal === 'Not set' ? '' : genderVal);
    setDraftEmail(emailVal);
    setDraftPhone(phoneVal === 'Not set' ? '' : phoneVal);
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!currentDocId) {
      showToast("Cannot save: User document ID not found.");
      return;
    }

    const nameToParse = (draftName || nameVal).trim();
    const nameParts = nameToParse.split(/\s+/);
    let newFirstName = '', newMiddleInitial = '', newLastName = '';

    if (nameParts.length === 1) {
      newFirstName = nameParts[0];
    } else if (nameParts.length === 2) {
      newFirstName = nameParts[0];
      newLastName = nameParts[1];
    } else if (nameParts.length > 2) {
      newLastName = nameParts.pop();
      const possibleMI = nameParts[nameParts.length - 1];
      if (possibleMI.length <= 2 && possibleMI.includes('.')) {
        newMiddleInitial = nameParts.pop().replace('.', '');
      } else if (possibleMI.length === 1) {
        newMiddleInitial = nameParts.pop();
      }
      newFirstName = nameParts.join(' ');
    }

    const updatedData = {
      firstName: newFirstName,
      lastName: newLastName,
      middleInitial: newMiddleInitial,
      birthdate: draftBirthdate || birthdateVal,
      age: draftAge || ageVal,
      gender: draftGender || genderVal,
      email: draftEmail || emailVal,
      phoneNumber: draftPhone || phoneVal 
    };

    try {
      const userRef = doc(db, 'users', currentDocId);
      await updateDoc(userRef, updatedData);
      
      const mInitStr = updatedData.middleInitial ? `${updatedData.middleInitial}. ` : '';
      setNameVal(`${updatedData.firstName} ${mInitStr}${updatedData.lastName}`.trim());
      setBirthdateVal(updatedData.birthdate);
      setAgeVal(updatedData.age);
      setGenderVal(updatedData.gender);
      setEmailVal(updatedData.email);
      setPhoneVal(updatedData.phoneNumber);
      
      setIsEditing(false);
      showToast('Changes saved successfully');
    } catch (error) {
      console.error("🔍 [Profile] Error saving changes:", error);
      showToast('Error saving changes');
    }
  }

  function handleFileChange(e, docType) {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setPendingDocType(docType);
    setPreviewFileName(file.name);
    setPreviewFileSize(formatFileSize(file.size));

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewContent(<img src={url} alt="Preview" className="max-w-full rounded-xl" />);
    } else if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewContent(<iframe src={url} title="PDF Preview" className="w-full border-none rounded-xl" style={{ height: 300 }} />);
    } else {
      setPreviewContent(
        <div className="text-center p-10 text-[#9bb5a5]">
          <div className="flex justify-center mb-2"><DocIcon /></div>
          <div className="text-xs">{file.name}</div>
          <div className="text-xs mt-1">Preview not available for this file type.</div>
        </div>
      );
    }
    setPreviewModal(true);
    e.target.value = '';
  }

  function closePreview() {
    setPreviewModal(false);
    setPendingFile(null);
    setPendingDocType(null);
    setPreviewContent(null);
  }

  function confirmUpdate() {
    if (!pendingFile || !pendingDocType) { closePreview(); return; }
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(pendingFile.type)) {
      showToast('Invalid file type. Please upload PDF, JPG, or PNG.');
      closePreview(); return;
    }
    if (pendingFile.size > 5 * 1024 * 1024) {
      showToast('File too large. Maximum size is 5MB.');
      closePreview(); return;
    }
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (pendingDocType === 'xray') {
      setXrayDate(dateStr);
      setXrayFile(pendingFile.name);
      showToast('X-RAY updated');
    } else if (pendingDocType === 'drugtest') {
      setDrugtestDate(dateStr);
      setDrugtestFile(pendingFile.name);
      showToast('Drug Test updated');
    }

    setDocumentsNote('Documents pending verification...');
    setTimeout(() => {
      setDocumentsNote('Valid documents · last updated ' + dateStr);
      showToast('Documents verified and saved');
    }, 2000);

    closePreview();
  }

  const inputBase = {
    width: '100%',
    maxWidth: 160,
    padding: '6px 10px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: '#1a2e22',
    textAlign: 'right',
    border: '1.5px solid #ddeee5',
    borderRadius: 8,
    background: '#ffffff',
    outline: 'none',
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#1a5c3a' }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 12px', display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'none' }}>
      
      {/* Profile Header */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #ddeee5', padding: '18px 18px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          {isEditing ? (
            <input
              type="text"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              autoFocus
              placeholder="Your Name"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 700, color: '#1a2e22', border: '1.5px solid #ddeee5', borderRadius: 8, padding: '6px 12px', outline: 'none', background: '#fff' }}
            />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a2e22', fontFamily: "'DM Serif Display', serif" }}>
              {nameVal || 'No Name Set'}
            </span>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {isEditing ? (
              <button onClick={saveEdit} style={{ background: '#1a5c3a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>SAVE</button>
            ) : (
              <button onClick={enterEdit} style={{ background: '#fff', border: '1.5px solid #ddeee5', padding: '5px 12px', borderRadius: 40, fontSize: 11, fontWeight: 600, color: '#1a5c3a', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>EDIT INFO</button>
            )}
          </div>
        </div>
        <div style={{ background: '#e8f5ee', display: 'inline-block', padding: '4px 12px', borderRadius: 40, fontSize: 10, fontWeight: 700, color: '#1a5c3a' }}>
          ID: {dbUserId}
        </div>
      </div>

      {/* Identification */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '16px', border: '1px solid #ddeee5' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#2d7a52', marginBottom: 12, borderLeft: '3px solid #34c472', paddingLeft: 8 }}>
          IDENTIFICATION
        </div>
        {[
          { label: 'BIRTHDATE', val: birthdateVal, draft: draftBirthdate, setDraft: setDraftBirthdate },
          { label: 'AGE', val: ageVal, draft: draftAge, setDraft: setDraftAge },
          { label: 'GENDER', val: genderVal, draft: draftGender, setDraft: setDraftGender },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #e2f0ea' : 'none' }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: '#6b8577' }}>{row.label}</span>
            {isEditing ? (
              <input type="text" value={row.draft} onChange={e => row.setDraft(e.target.value)} style={inputBase} />
            ) : (
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2e22', textAlign: 'right' }}>{row.val}</span>
            )}
          </div>
        ))}
      </div>

      {/* Contact Details */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '16px', border: '1px solid #ddeee5' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#2d7a52', marginBottom: 12, borderLeft: '3px solid #34c472', paddingLeft: 8 }}>
          CONTACT DETAILS
        </div>
        {[
          { label: 'EMAIL ADDRESS', val: emailVal, draft: draftEmail, setDraft: setDraftEmail, type: 'email' },
          { label: 'PHONE NUMBER', val: phoneVal, draft: draftPhone, setDraft: setDraftPhone, type: 'tel' },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #e2f0ea' : 'none' }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: '#6b8577' }}>{row.label}</span>
            {isEditing ? (
              <input type={row.type || "text"} value={row.draft} onChange={e => row.setDraft(e.target.value)} style={inputBase} />
            ) : (
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2e22', textAlign: 'right' }}>{row.val}</span>
            )}
          </div>
        ))}
      </div>

      {/* Health Documents */}
      <div style={{ background: '#fff', borderRadius: 20, padding: '16px', border: '1px solid #ddeee5' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, color: '#2d7a52', marginBottom: 12, borderLeft: '3px solid #34c472', paddingLeft: 8 }}>
          HEALTH DOCUMENTS
        </div>
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
      </div>

      {/* Sign Out */}
      <div style={{ marginTop: 8 }}>
        <button onClick={() => setLogoutModal(true)} style={{ width: '100%', background: '#fff', border: '1px solid #ffdde1', color: '#e53e3e', padding: '14px', borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>SIGN OUT</button>
      </div>

      {/* Logout Modal */}
      {logoutModal && (
        <div onClick={e => e.target === e.currentTarget && setLogoutModal(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 24, width: 300, textAlign: 'center' }}>
             <h3 style={{ margin: '0 0 8px', color: '#1a2e22', fontSize: 18 }}>Confirm Sign Out</h3>
             <p style={{ margin: '0 0 24px', color: '#6b8577', fontSize: 13 }}>Are you sure you want to log out?</p>
             <div style={{ display: 'flex', gap: 12 }}>
               <button onClick={() => setLogoutModal(false)} style={{ flex: 1, padding: 12, borderRadius: 40, border: '1.5px solid #ddeee5', background: 'transparent' }}>Cancel</button>
               <button onClick={() => { setLogoutModal(false); if (onLogout) onLogout(); }} style={{ flex: 1, padding: 12, borderRadius: 40, border: 'none', background: '#e53e3e', color: '#fff' }}>Sign Out</button>
             </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <div onClick={e => e.target === e.currentTarget && closePreview()} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 320, background: '#fff', borderRadius: 28, overflow: 'hidden' }}>
            <div style={{ background: '#1a5c3a', padding: 16, color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
              <span>Preview</span>
              <button onClick={closePreview} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>{previewContent}</div>
            <div style={{ display: 'flex', gap: 12, padding: 16 }}>
              <button onClick={closePreview} style={{ flex: 1, padding: 10, borderRadius: 40, border: '1.5px solid #ddeee5' }}>Cancel</button>
              <button onClick={confirmUpdate} style={{ flex: 1, background: '#1a5c3a', color: '#fff', border: 'none', padding: 10, borderRadius: 40 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a5c3a', color: '#fff', padding: '10px 20px', borderRadius: 40, fontSize: 12, zIndex: 5000 }}>{toast}</div>}
    </div>
  );
}