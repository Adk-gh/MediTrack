// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Records.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { rtdb } from '../../firebase';
import { ref, get, push, set } from 'firebase/database';

// ============================================================
// SNACKBAR COMPONENT
// ============================================================
const Snackbar = ({ message, type, visible }) => (
  <div
    className={`fixed bottom-8 left-1/2 z-[9999] flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
      ${visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-20'}
      ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}
  >
    <i className={`fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    {message}
  </div>
);

// ============================================================
// TYPE BADGE COLORS
// ============================================================
const typeBadgeClass = (type) => {
  const t = type?.toLowerCase();
  if (t === 'student') return 'bg-blue-100 text-blue-600';
  if (t === 'instructor' || t === 'doctor' || t === 'nurse') return 'bg-purple-100 text-purple-600';
  return 'bg-green-100 text-green-600';
};

// ============================================================
// NORMALIZE — map a Firestore user doc → display shape
// ============================================================
const normalizeUser = (doc) => {
  const d = doc;
  const firstName = d.firstName || '';
  const lastName  = d.lastName  || '';
  const middle    = d.middleInitial ? ` ${d.middleInitial}.` : '';
  const suffix    = d.suffix ? ` ${d.suffix}` : '';

  const name = lastName
    ? `${lastName}, ${firstName}${middle}${suffix}`.trim()
    : `${firstName}${middle}${suffix}`.trim() || '—';

  const role = d.role?.toLowerCase() || 'staff';
  const type =
    role === 'student'                    ? 'student'
    : role === 'doctor' || role === 'nurse' || role === 'admin' || role === 'administrator'
      ? 'instructor'
      : 'staff';

  return {
    uid: doc.uid,
    name,
    firstName,
    lastName,
    middleInitial: d.middleInitial || '',
    suffix:        d.suffix        || '',
    id:         d.universityId  || d.studentId || doc.uid,
    type,
    role:       d.role          || '',
    prog:       d.program       || d.course    || '',
    year:       d.yearLevel     || '',
    section:    d.section       || '',
    age:        d.age           || '',
    gender:     d.gender        || d.sex       || '',
    birthdate:  d.birthday      || '',
    email:      d.email         || '',
    phoneNumber: d.phoneNumber  || '',
    department: d.department    || '',
    jobTitle:   d.jobTitle      || '',
    classification: d.classification || '',
    emergencyContact: d.emergencyContact || {},
    vaccinations: d.vaccinations || {},
    history:  [],
    diseases: [],
    _raw: d,
  };
};

// ============================================================
// PROFILE PANEL — shared between mobile sheet and desktop column
// ============================================================
const ProfilePanel = ({ person, onExamine, onClose, navigate, showSnackbar }) => {
  const [consultLoading, setConsultLoading] = useState(false);

  if (!person) return null;

  const handleConsult = async () => {
    setConsultLoading(true);
    try {
      localStorage.setItem('selectedPatient', JSON.stringify(person));

      // Check if a conversation already exists for this patient
      const convRef = ref(rtdb, 'consultations');
      const snap = await get(convRef);
      const data = snap.val() || {};

      const existing = Object.entries(data).find(
        ([, conv]) => conv.metadata?.patientUid === person.uid
      );

      if (existing) {
        // Existing conversation — open it directly
        navigate(`/consultations?patientId=${person.uid}&convId=${existing[0]}`);
      } else {
        // No conversation yet — create one then open it
        const newConvRef = push(ref(rtdb, 'consultations'));
        await set(newConvRef, {
          metadata: {
            patientUid:    person.uid,
            patientName:   person.name,
            patientRole:   person.role || person.type || 'student',
            lastMessage:   '',
            lastTimestamp: Date.now(),
            createdAt:     Date.now(),
          },
          messages: {},
        });
        navigate(`/consultations?patientId=${person.uid}&convId=${newConvRef.key}`);
      }
    } catch (err) {
      console.error('Consult error:', err);
      showSnackbar?.('Failed to open consultation', 'error');
    } finally {
      setConsultLoading(false);
    }
  };

  return (
    <div className="animate-[fadeInSlide_0.3s_ease-out_forwards] flex flex-col">
      {/* Close button (mobile only) */}
      {onClose && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[11px] uppercase text-[#466460]">Clinical Profile</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label="Close profile"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-user text-lg text-[#466460]"></i>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-slate-800 truncate">{person.name}</h3>
          <p className="text-xs text-slate-500">
            {person.id} •{' '}
            {person.role
              ? person.role.charAt(0).toUpperCase() + person.role.slice(1)
              : person.type}
          </p>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {person.department && (
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#e0eceb] text-[#466460]">
                {person.department}
              </span>
            )}
            {person.prog && (
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {person.prog}
              </span>
            )}
            {person.jobTitle && (
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {person.jobTitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid — 4 cols to use horizontal space */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Age',        value: person.age       || '-' },
          { label: 'Gender',     value: person.gender    || '-' },
          { label: 'Birthdate',  value: person.birthdate || '-' },
          { label: 'Year Level', value: person.year      || 'N/A' },
        ].map(({ label, value }) => (
          <div key={label} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[8px] text-slate-400 uppercase mb-0.5">{label}</p>
            <p className="text-sm font-bold text-slate-700">{value}</p>
          </div>
        ))}
      </div>

      {/* Contact + Emergency side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Contact</p>
          <p className="text-xs text-slate-600 mb-1 truncate">
            <i className="fa-solid fa-envelope w-4 mr-1 text-[#466460]"></i>
            {person.email || '-'}
          </p>
          {person.phoneNumber && (
            <p className="text-xs text-slate-600">
              <i className="fa-solid fa-phone w-4 mr-1 text-[#466460]"></i>
              {person.phoneNumber}
            </p>
          )}
        </div>

        {person.emergencyContact?.name && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Emergency Contact</p>
            <p className="text-xs text-slate-600 font-semibold">
              {person.emergencyContact.name}
              {person.emergencyContact.relationship
                ? ` (${person.emergencyContact.relationship})`
                : ''}
            </p>
            {person.emergencyContact.phone && (
              <p className="text-xs text-slate-500 mt-0.5">
                <i className="fa-solid fa-phone w-4 mr-1 text-[#466460]"></i>
                {person.emergencyContact.phone}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Vaccinations */}
      {person.vaccinations && Object.values(person.vaccinations).some(v => v?.vaccineName) && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
          <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">COVID-19 Vaccination</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(person.vaccinations).map(([key, v]) =>
              v?.vaccineName ? (
                <span key={key} className="text-[8px] px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {key.replace('dose', 'Dose ').replace('booster', 'Booster ')}: {v.vaccineName}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Examine + Consult Buttons */}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button
          onClick={() => onExamine(person)}
          className="bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white px-5 py-2.5 rounded-full text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-1.5 shadow-md"
        >
          <i className="fa-solid fa-stethoscope"></i>
          Examine
        </button>

        <button
          onClick={handleConsult}
          disabled={consultLoading}
          className="bg-gradient-to-br from-[#466460] to-[#2f4a46] text-white px-5 py-2.5 rounded-full text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-1.5 shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {consultLoading
            ? <i className="fa-solid fa-spinner fa-spin"></i>
            : <i className="fa-solid fa-comment-medical"></i>
          }
          {consultLoading ? 'Opening...' : 'Consult'}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Records = () => {
  const navigate = useNavigate();

  const [activeSubTab, setActiveSubTab]     = useState('view');
  const [peopleData, setPeopleData]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [currentDept, setCurrentDept]       = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [profileOpen, setProfileOpen]       = useState(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  const [form, setForm] = useState({
    surname: '', firstname: '', middlename: '', id: '',
    birthdate: '', age: '', gender: 'Male', type: 'student',
    department: 'College of Computing', prog: '', year: '1st Year',
    section: '', email: '', phone: '',
  });

  // --- Fetch from Firestore ---
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const users = snapshot.docs.map(doc =>
          normalizeUser({ uid: doc.id, ...doc.data() })
        );
        setPeopleData(users);
      } catch (err) {
        console.error('Failed to load users from Firestore:', err);
        showSnackbar('Could not load users from database', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const departments = [...new Set(
    peopleData.map(p => p.department).filter(Boolean)
  )].sort();

  useEffect(() => {
    if (departments.length > 0 && !currentDept) {
      const first = departments[0];
      setCurrentDept(first);
      const firstPerson = peopleData.find(p => p.department === first);
      if (firstPerson) setSelectedPerson(firstPerson);
    }
  }, [peopleData]);

  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(
      () => setSnackbar(s => ({ ...s, visible: false })),
      3500
    );
  };

  const filteredPeople = peopleData.filter(p => {
    const inDept = p.department === currentDept;
    if (!searchQuery) return inDept;
    const q = searchQuery.toLowerCase();
    return inDept && (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const handleSelectDept = (dept) => {
    setCurrentDept(dept);
    setSelectedPerson(null);
    setSearchQuery('');
    setProfileOpen(false);
  };

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
    setProfileOpen(true);
  };

  const handleExamine = (person) => {
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    navigate(`/examinations?patientId=${person.uid}`);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleBirthdateChange = (e) => {
    const dob = e.target.value;
    let age = '';
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      age = a;
    }
    setForm(f => ({ ...f, birthdate: dob, age: age.toString() }));
  };

  const handleAddRecord = () => {
    if (!form.surname.trim() || !form.firstname.trim() || !form.id.trim()) {
      showSnackbar('Please fill required fields', 'error');
      return;
    }
    const newPerson = {
      uid: `local-${Date.now()}`,
      name: `${form.surname}, ${form.firstname}`,
      firstName: form.firstname,
      lastName:  form.surname,
      id: form.id,
      type: form.type,
      prog: form.prog,
      year: form.year,
      section: form.section,
      age: parseInt(form.age) || 0,
      gender: form.gender,
      birthdate: form.birthdate,
      email: form.email,
      department: form.department,
      history: [],
      diseases: [],
    };
    setPeopleData(prev => [...prev, newPerson]);
    showSnackbar('Record added successfully');
    handleClearForm();
  };

  const handleClearForm = () => {
    setForm({
      surname: '', firstname: '', middlename: '', id: '',
      birthdate: '', age: '', gender: 'Male', type: 'student',
      department: 'College of Computing', prog: '', year: '1st Year',
      section: '', email: '', phone: '',
    });
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="animate-[fadeInSlide_0.4s_ease-out_forwards]">

        {/* Sub Navigation */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex gap-2">
          {['view', 'add'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                activeSubTab === tab
                  ? 'bg-[#466460] text-white'
                  : 'text-slate-500 hover:bg-[#e0eceb] hover:text-[#466460]'
              }`}
            >
              {tab === 'view' ? 'Current' : 'Add New Record'}
            </button>
          ))}
        </div>

        {/* ── VIEW TAB ── */}
        {activeSubTab === 'view' && (
          <>
            {/* ── MOBILE / TABLET layout (< lg) ── */}
            <div className="flex flex-col lg:hidden min-h-[calc(100vh-120px)] bg-white">

              {/* Department pills */}
              <div className="border-b border-[#eef2f6] px-3 py-3">
                <p className="text-[9px] font-bold uppercase text-[#466460] mb-2 px-1">Departments</p>
                {loading ? (
                  <div className="text-xs text-slate-400 py-1 px-1">
                    <i className="fa-solid fa-spinner fa-spin mr-1"></i> Loading...
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    {departments.map(dept => (
                      <button
                        key={dept}
                        onClick={() => handleSelectDept(dept)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap border ${
                          currentDept === dept
                            ? 'bg-[#466460] text-white border-[#466460]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#466460] hover:text-[#466460]'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search bar */}
              <div className="px-3 py-3 border-b border-[#eef2f6]">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name or ID..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs outline-none focus:border-[#466460] focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 px-1">
                  {filteredPeople.length} record{filteredPeople.length !== 1 ? 's' : ''} in {currentDept || '—'}
                </p>
              </div>

              {/* People list */}
              <div className="flex-1 overflow-y-auto px-3 py-2 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredPeople.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-12">No records found</div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredPeople.map(person => (
                      <div
                        key={person.uid}
                        onClick={() => handleSelectPerson(person)}
                        className={`p-3 cursor-pointer rounded-xl transition-all border ${
                          selectedPerson?.uid === person.uid
                            ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                            : 'border-slate-100 hover:bg-slate-50 active:bg-[#e0eceb]'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-700 truncate">{person.name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                              {person.id}{person.prog ? ` • ${person.prog}` : ''}{person.year ? ` ${person.year}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-[8px] px-2 py-0.5 rounded-full ${typeBadgeClass(person.role || person.type)}`}>
                              {person.role || person.type}
                            </span>
                            <i className="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Profile Sheet */}
              {profileOpen && (
                <div
                  className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                  onClick={() => setProfileOpen(false)}
                />
              )}
              <div
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out lg:hidden max-h-[85vh] flex flex-col ${
                  profileOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
              >
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
                  />
                </div>
              </div>
            </div>

            {/* ── DESKTOP layout (≥ lg) ── */}
            <div className="hidden lg:flex min-h-[calc(100vh-160px)] bg-white overflow-hidden">

              {/* Column 1: Departments */}
              <div className="flex-[1.2] border-r border-[#eef2f6] flex flex-col min-w-[160px]">
                <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                  <h3 className="font-bold text-[11px] uppercase text-[#466460]">Departments</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {loading ? (
                    <div className="text-center text-slate-400 text-xs py-8">
                      <i className="fa-solid fa-spinner fa-spin mr-1"></i> Loading...
                    </div>
                  ) : departments.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs py-8">No departments found</div>
                  ) : departments.map(dept => (
                    <div
                      key={dept}
                      onClick={() => handleSelectDept(dept)}
                      className={`px-3 py-2 cursor-pointer rounded-lg transition-all border-l-[3px] text-xs font-semibold ${
                        currentDept === dept
                          ? 'bg-gradient-to-r from-[#e0eceb] to-white border-[#466460] text-[#466460]'
                          : 'border-transparent text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:translate-x-0.5'
                      }`}
                    >
                      {dept}
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: People */}
              <div className="flex-[1.5] border-r border-[#eef2f6] flex flex-col min-w-[200px]">
                <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-[11px] uppercase text-[#466460]">People</h3>
                    <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">
                      {filteredPeople.length}
                    </span>
                  </div>
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search name or ID..."
                      className="w-full pl-8 pr-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs outline-none focus:border-[#466460] focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {filteredPeople.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-12">No records found</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredPeople.map(person => (
                        <div
                          key={person.uid}
                          onClick={() => setSelectedPerson(person)}
                          className={`p-3 mb-1 cursor-pointer rounded-xl transition-all border relative ${
                            selectedPerson?.uid === person.uid
                              ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                              : 'border-transparent hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:border-[#8aacaa] hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-700 truncate">{person.name}</p>
                              <p className="text-[9px] text-slate-500 mt-0.5">
                                {person.id} {person.prog ? `• ${person.prog}` : ''} {person.year || ''}
                              </p>
                            </div>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full flex-shrink-0 ml-1 ${typeBadgeClass(person.role || person.type)}`}>
                              {person.role || person.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Clinical Profile */}
              <div className="flex-[2.2] flex flex-col min-w-0">
                <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                  <h3 className="font-bold text-[11px] uppercase text-[#466460]">Clinical Profile</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
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
                    />
                  )}
                </div>
              </div>

            </div>
          </>
        )}

        {/* ── ADD NEW RECORD TAB ── */}
        {activeSubTab === 'add' && (
          <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-[calc(100vh-120px)]">
            <h3 className="text-base sm:text-lg font-bold text-[#466460] mb-5">Add New Health Record</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-4xl">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Surname *</label>
                <input name="surname" type="text" value={form.surname} onChange={handleFormChange}
                  placeholder="Last name"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label>
                <input name="firstname" type="text" value={form.firstname} onChange={handleFormChange}
                  placeholder="First name"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Middle Name</label>
                <input name="middlename" type="text" value={form.middlename} onChange={handleFormChange}
                  placeholder="Middle name"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID Number *</label>
                <input name="id" type="text" value={form.id} onChange={handleFormChange}
                  placeholder="e.g. 25-00001"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Birthdate</label>
                <input name="birthdate" type="date" value={form.birthdate} onChange={handleBirthdateChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Age</label>
                <input name="age" type="number" value={form.age} readOnly
                  placeholder="Auto"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none bg-gray-50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gender</label>
                <select name="gender" value={form.gender} onChange={handleFormChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                <select name="type" value={form.type} onChange={handleFormChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option value="student">Student</option>
                  <option value="instructor">Instructor/Faculty</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                <input name="department" type="text" value={form.department} onChange={handleFormChange}
                  placeholder="e.g. College of Computing"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Program / Course</label>
                <input name="prog" type="text" value={form.prog} onChange={handleFormChange}
                  placeholder="e.g. BSIT"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Year Level</label>
                <select name="year" value={form.year} onChange={handleFormChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>N/A</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Section</label>
                <input name="section" type="text" value={form.section} onChange={handleFormChange}
                  placeholder="e.g. A"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleFormChange}
                  placeholder="e.g. name@plsp.edu.ph"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone Number</label>
                <input name="phone" type="text" value={form.phone} onChange={handleFormChange}
                  placeholder="e.g. 09123456789"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAddRecord}
                className="bg-[#466460] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                Save Record
              </button>
              <button
                onClick={handleClearForm}
                className="bg-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors w-full sm:w-auto"
              >
                Clear
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Snackbar */}
      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </>
  );
};

export default Records;