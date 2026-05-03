// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Records.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

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

  // "Surname, Firstname" format keeps compatibility with Medical/Dental forms
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
    // Firestore doc id — used as the key and for navigation
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

    // Emergency contact
    emergencyContact: d.emergencyContact || {},

    // Vaccinations
    vaccinations: d.vaccinations || {},

    // Kept for profile display
    history:  [],
    diseases: [],

    // Raw doc for passing to examination forms
    _raw: d,
  };
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Records = () => {
  const navigate = useNavigate();

  // --- State ---
  const [activeSubTab, setActiveSubTab] = useState('view');
  const [peopleData, setPeopleData]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentDept, setCurrentDept]   = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');

  // Snackbar
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer = useRef(null);

  // Add New Record form state
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

  // --- Derived Data ---
  const departments = [...new Set(
    peopleData.map(p => p.department).filter(Boolean)
  )].sort();

  // Set initial department once data loads
  useEffect(() => {
    if (departments.length > 0 && !currentDept) {
      const first = departments[0];
      setCurrentDept(first);
      const firstPerson = peopleData.find(p => p.department === first);
      if (firstPerson) setSelectedPerson(firstPerson);
    }
  }, [peopleData]);

  // --- Helpers ---
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
  };

  // Navigate to Examinations, passing the Firestore UID so the exam page
  // can re-fetch the full user document.
  const handleExamine = (person) => {
    localStorage.setItem('selectedPatient', JSON.stringify(person));
    navigate(`/examinations?patientId=${person.uid}`);
  };

  // --- Form Handlers ---
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
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex gap-2">
          {['view', 'add'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
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
          <div className="flex min-h-[calc(100vh-160px)] bg-white overflow-hidden">

            {/* Column 1: Departments */}
            <div className="flex-[1.2] border-r border-[#eef2f6] flex flex-col">
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
            <div className="flex-[1.5] border-r border-[#eef2f6] flex flex-col">
              <div className="bg-gradient-to-br from-[#fafbfc] to-white border-b border-[#eef2f6] p-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-[11px] uppercase text-[#466460]">People</h3>
                  <span className="text-[9px] bg-[#e0eceb] px-2 py-0.5 rounded-full text-[#466460] font-semibold">
                    {filteredPeople.length}
                  </span>
                </div>
                {/* Search */}
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
                          <div>
                            <p className="font-bold text-xs text-slate-700">{person.name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {person.id} {person.prog ? `• ${person.prog}` : ''} {person.year || ''}
                            </p>
                          </div>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full ${typeBadgeClass(person.role || person.type)}`}>
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
            <div className="flex-[2.2] flex flex-col">
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
                  <div className="animate-[fadeInSlide_0.3s_ease-out_forwards]">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-[#e0eceb] flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-user text-xl text-[#466460]"></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-800">{selectedPerson.name}</h3>
                        <p className="text-xs text-slate-500">
                          {selectedPerson.id} •{' '}
                          {selectedPerson.role
                            ? selectedPerson.role.charAt(0).toUpperCase() + selectedPerson.role.slice(1)
                            : selectedPerson.type}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {selectedPerson.department && (
                            <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#e0eceb] text-[#466460]">
                              {selectedPerson.department}
                            </span>
                          )}
                          {selectedPerson.prog && (
                            <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {selectedPerson.prog}
                            </span>
                          )}
                          {selectedPerson.jobTitle && (
                            <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {selectedPerson.jobTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: 'Age',       value: selectedPerson.age       || '-' },
                        { label: 'Gender',    value: selectedPerson.gender    || '-' },
                        { label: 'Birthdate', value: selectedPerson.birthdate || '-' },
                        { label: 'Year Level',value: selectedPerson.year      || 'N/A' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[8px] text-slate-400 uppercase">{label}</p>
                          <p className="text-sm font-bold text-slate-700">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Contact */}
                    <div className="mb-4">
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Contact</p>
                      <p className="text-xs text-slate-600 mb-1">
                        <i className="fa-solid fa-envelope w-4 mr-1 text-[#466460]"></i>
                        {selectedPerson.email || '-'}
                      </p>
                      {selectedPerson.phoneNumber && (
                        <p className="text-xs text-slate-600">
                          <i className="fa-solid fa-phone w-4 mr-1 text-[#466460]"></i>
                          {selectedPerson.phoneNumber}
                        </p>
                      )}
                    </div>

                    {/* Emergency Contact */}
                    {selectedPerson.emergencyContact?.name && (
                      <div className="mb-4">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Emergency Contact</p>
                        <p className="text-xs text-slate-600 font-semibold">
                          {selectedPerson.emergencyContact.name}
                          {selectedPerson.emergencyContact.relationship
                            ? ` (${selectedPerson.emergencyContact.relationship})`
                            : ''}
                        </p>
                        {selectedPerson.emergencyContact.phone && (
                          <p className="text-xs text-slate-500">{selectedPerson.emergencyContact.phone}</p>
                        )}
                      </div>
                    )}

                    {/* Vaccinations summary */}
                    {selectedPerson.vaccinations && Object.values(selectedPerson.vaccinations).some(v => v?.vaccineName) && (
                      <div className="mb-4">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">COVID-19 Vaccination</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(selectedPerson.vaccinations).map(([key, v]) =>
                            v?.vaccineName ? (
                              <span key={key} className="text-[8px] px-2 py-1 rounded-full bg-green-100 text-green-700">
                                {key.replace('dose', 'Dose ').replace('booster', 'Booster ')}: {v.vaccineName}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}

                    {/* Examine Button */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleExamine(selectedPerson)}
                        className="bg-gradient-to-br from-[#e07a5f] to-[#c96a4f] text-white px-4 py-2 rounded-full text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-1"
                      >
                        <i className="fa-solid fa-stethoscope"></i>
                        Examine
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── ADD NEW RECORD TAB ── */}
        {activeSubTab === 'add' && (
          <div className="p-8 bg-white min-h-[calc(100vh-160px)]">
            <h3 className="text-lg font-bold text-[#466460] mb-5">Add New Health Record</h3>
            <div className="grid grid-cols-3 gap-5 max-w-4xl">

              {/* Row 1 */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Surname *</label>
                <input name="surname" type="text" value={form.surname} onChange={handleFormChange}
                  placeholder="Last name"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label>
                <input name="firstname" type="text" value={form.firstname} onChange={handleFormChange}
                  placeholder="First name"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Middle Name</label>
                <input name="middlename" type="text" value={form.middlename} onChange={handleFormChange}
                  placeholder="Middle name"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>

              {/* Row 2 */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID Number *</label>
                <input name="id" type="text" value={form.id} onChange={handleFormChange}
                  placeholder="e.g. 25-00001"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Birthdate</label>
                <input name="birthdate" type="date" value={form.birthdate} onChange={handleBirthdateChange}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Age</label>
                <input name="age" type="number" value={form.age} readOnly
                  placeholder="Auto"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none bg-gray-50" />
              </div>

              {/* Row 3 */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gender</label>
                <select name="gender" value={form.gender} onChange={handleFormChange}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                <select name="type" value={form.type} onChange={handleFormChange}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option value="student">Student</option>
                  <option value="instructor">Instructor/Faculty</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
                <input name="department" type="text" value={form.department} onChange={handleFormChange}
                  placeholder="e.g. College of Computing"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>

              {/* Row 4 */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Program / Course</label>
                <input name="prog" type="text" value={form.prog} onChange={handleFormChange}
                  placeholder="e.g. BSIT"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Year Level</label>
                <select name="year" value={form.year} onChange={handleFormChange}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
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
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>

              {/* Row 5 */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handleFormChange}
                  placeholder="e.g. name@plsp.edu.ph"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone Number</label>
                <input name="phone" type="text" value={form.phone} onChange={handleFormChange}
                  placeholder="e.g. 09123456789"
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460]" />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddRecord}
                className="bg-[#466460] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Save Record
              </button>
              <button
                onClick={handleClearForm}
                className="bg-slate-200 text-slate-600 px-6 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
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