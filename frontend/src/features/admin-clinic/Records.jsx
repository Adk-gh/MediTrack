// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Records.jsx
import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout.jsx';
import { useNavigate } from 'react-router-dom';
import * as recordsService from '../../services/records.service';

// ============================================================
// DATA
// ============================================================
const fallbackPeopleData = [
  { name: "De Vera, Jenny", id: "23-00142", type: "student", prog: "BSIT", year: "3rd Year", section: "A", age: 21, gender: "Female", birthdate: "2003-03-15", email: "jenny.00142@plsp.edu.ph", department: "College of Computing", history: ["Flu symptoms; prescribed bed rest.", "Internship Medical Clearance issued."], diseases: ["Influenza"] },
  { name: "Santos, Sofia", id: "23-23406", type: "student", prog: "BSCE", year: "2nd Year", section: "B", age: 20, gender: "Female", birthdate: "2004-07-22", email: "sofia.2323406@plsp.edu.ph", department: "College of Engineering", history: ["Routine dental examination.", "Vital signs within normal range."], diseases: ["Dental Caries"] },
  { name: "Mendoza, Paolo", id: "22-09123", type: "student", prog: "BSN", year: "4th Year", section: "C", age: 22, gender: "Male", birthdate: "2002-01-10", email: "paolo.09123@plsp.edu.ph", department: "College of Health Sciences", history: ["Physical assessment for RLE.", "Immunization record updated."], diseases: ["Allergic Rhinitis"] },
  { name: "Garcia, Rico", id: "24-11002", type: "student", prog: "BS PSY", year: "1st Year", section: "A", age: 19, gender: "Male", birthdate: "2005-09-05", email: "rico.11002@plsp.edu.ph", department: "College of Arts & Sciences", history: ["Standard first aid for minor abrasion.", "Tetanus shot administered."], diseases: ["Minor Wound"] },
  { name: "Reyes, Clara", id: "23-55678", type: "student", prog: "BS ARCH", year: "2nd Year", section: "A", age: 20, gender: "Female", birthdate: "2004-04-18", email: "clara.55678@plsp.edu.ph", department: "College of Engineering", history: ["Eye strain consultation.", "Ergonomic assessment recommended."], diseases: ["Eye Strain"] },
  { name: "Villanueva, Mark", id: "22-98102", type: "student", prog: "BSIT", year: "3rd Year", section: "B", age: 21, gender: "Male", birthdate: "2003-06-28", email: "mark.98102@plsp.edu.ph", department: "College of Computing", history: ["Back pain consultation; physical therapy referral."], diseases: ["Lower Back Pain"] },
  { name: "Dimagiba, Lea", id: "24-33457", type: "student", prog: "BSN", year: "1st Year", section: "A", age: 18, gender: "Female", birthdate: "2006-11-02", email: "lea.33457@plsp.edu.ph", department: "College of Health Sciences", history: ["Pre-enrollment medical exam.", "Hepatitis B vaccination dose 1."], diseases: ["Routine Check-up"] },
  { name: "Cruz, Andrei", id: "23-77234", type: "student", prog: "BSCE", year: "3rd Year", section: "C", age: 22, gender: "Male", birthdate: "2002-08-14", email: "andrei.77234@plsp.edu.ph", department: "College of Engineering", history: ["Sprained ankle; RICE treatment."], diseases: ["Sprain"] },
  { name: "Fernandez, Bianca", id: "22-12098", type: "student", prog: "BS PSY", year: "4th Year", section: "A", age: 23, gender: "Female", birthdate: "2001-12-30", email: "bianca.12098@plsp.edu.ph", department: "College of Arts & Sciences", history: ["Mental wellness check-up; stress management plan."], diseases: ["Anxiety"] },
  { name: "Rivera, Kevin", id: "23-44567", type: "student", prog: "BSIT", year: "2nd Year", section: "D", age: 20, gender: "Male", birthdate: "2004-02-07", email: "kevin.44567@plsp.edu.ph", department: "College of Computing", history: ["Allergy testing. Antihistamines prescribed."], diseases: ["Allergies"] },
  { name: "Torres, Michelle", id: "21-88902", type: "student", prog: "BSN", year: "4th Year", section: "B", age: 23, gender: "Female", birthdate: "2001-05-19", email: "michelle.88902@plsp.edu.ph", department: "College of Health Sciences", history: ["TB screening.", "Chest X-ray cleared."], diseases: ["TB Screening"] },
  { name: "Luna, Gabriel", id: "24-56789", type: "student", prog: "BSBA", year: "2nd Year", section: "A", age: 20, gender: "Male", birthdate: "2004-10-11", email: "gabriel.56789@plsp.edu.ph", department: "College of Business", history: ["Fever and cough; prescribed antibiotics."], diseases: ["Acute Bronchitis"] },
  { name: "Aquino, Patricia", id: "23-99881", type: "student", prog: "BSCS", year: "3rd Year", section: "A", age: 21, gender: "Female", birthdate: "2003-07-25", email: "patricia.99881@plsp.edu.ph", department: "College of Computing", history: ["Migraine attack; prescribed medication."], diseases: ["Migraine"] },
  { name: "Dr. Reyes, Maria", id: "FAC-001", type: "instructor", prog: "PhD", department: "College of Computing", age: 45, gender: "Female", birthdate: "1979-03-12", email: "maria.reyes@plsp.edu.ph", history: ["Hypertension check-up.", "Stress management consultation."], diseases: ["Hypertension"] },
  { name: "Prof. Cruz, Andres", id: "FAC-045", type: "instructor", prog: "Masters", department: "College of Engineering", age: 52, gender: "Male", birthdate: "1972-09-08", email: "andres.cruz@plsp.edu.ph", history: ["Diabetes monitoring.", "Regular check-up."], diseases: ["Type 2 Diabetes"] },
  { name: "Prof. Mercado, Liza", id: "FAC-078", type: "instructor", prog: "EdD", department: "College of Arts & Sciences", age: 48, gender: "Female", birthdate: "1976-06-20", email: "liza.mercado@plsp.edu.ph", history: ["Arthritis consultation.", "Physical therapy recommended."], diseases: ["Arthritis"] },
  { name: "Dr. Villanueva, Paolo", id: "FAC-112", type: "instructor", prog: "MD", department: "College of Health Sciences", age: 39, gender: "Male", birthdate: "1985-11-15", email: "paolo.villanueva@plsp.edu.ph", history: ["Migraine treatment.", "Preventive medication."], diseases: ["Migraine"] },
  { name: "Prof. Santos, Carmela", id: "FAC-203", type: "instructor", prog: "MA", department: "College of Business", age: 41, gender: "Female", birthdate: "1983-04-03", email: "carmela.santos@plsp.edu.ph", history: ["Respiratory infection.", "Antibiotics course completed."], diseases: ["Bronchitis"] },
  { name: "Ms. Fernandez, Leah", id: "STAFF-012", type: "staff", department: "Registrar's Office", age: 38, gender: "Female", birthdate: "1986-08-22", email: "leah.fernandez@plsp.edu.ph", history: ["Back pain therapy.", "Ergonomic assessment."], diseases: ["Lower Back Pain"] },
  { name: "Mr. Villanueva, Mark", id: "STAFF-089", type: "staff", department: "Maintenance", age: 44, gender: "Male", birthdate: "1980-01-17", email: "mark.villanueva@plsp.edu.ph", history: ["Respiratory infection.", "Antibiotics prescribed."], diseases: ["Bronchitis"] },
  { name: "Ms. Garcia, Rosalie", id: "STAFF-034", type: "staff", department: "Accounting Office", age: 52, gender: "Female", birthdate: "1972-10-05", email: "rosalie.garcia@plsp.edu.ph", history: ["Hypertension monitoring.", "Lifestyle change advice."], diseases: ["Hypertension"] },
  { name: "Mr. Dimagiba, Ricardo", id: "STAFF-067", type: "staff", department: "Security Services", age: 48, gender: "Male", birthdate: "1976-07-30", email: "ricardo.dimagiba@plsp.edu.ph", history: ["Chest pain evaluation.", "Stress test normal."], diseases: ["Chest Pain"] },
  { name: "Ms. Reyes, Teresa", id: "STAFF-101", type: "staff", department: "Library", age: 35, gender: "Female", birthdate: "1989-02-14", email: "teresa.reyes@plsp.edu.ph", history: ["Eye strain from computer work.", "Blue light glasses."], diseases: ["Digital Eye Strain"] },
  { name: "Mr. Santos, Roberto", id: "STAFF-145", type: "staff", department: "Human Resources", age: 47, gender: "Male", birthdate: "1977-12-28", email: "roberto.santos@plsp.edu.ph", history: ["Annual physical exam.", "All results normal."], diseases: ["Routine Check-up"] },
];

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
  if (type === 'student') return 'bg-blue-100 text-blue-600';
  if (type === 'instructor') return 'bg-purple-100 text-purple-600';
  return 'bg-green-100 text-green-600';
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const Records = () => {
  const navigate = useNavigate();

  // --- State ---
  const [activeSubTab, setActiveSubTab] = useState('view');
  const [peopleData, setPeopleData] = useState(fallbackPeopleData);
  const [loading, setLoading] = useState(true);
  const [currentDept, setCurrentDept] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // --- Derived Data ---
  const departments = [...new Set(peopleData.map(p => p.department))].sort();

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await recordsService.getAllRecords();
        if (data && data.length > 0) setPeopleData(data);
      } catch (error) {
        console.log('Using fallback data:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, []);

  // Set initial department on load
  useEffect(() => {
    if (departments.length > 0 && !currentDept) {
      const firstDept = departments[0];
      setCurrentDept(firstDept);
      const firstPerson = peopleData.find(p => p.department === firstDept);
      if (firstPerson) setSelectedPerson(firstPerson);
    }
  }, [peopleData]);

  // --- Helpers ---
  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  const filteredPeople = peopleData.filter(p => {
    const inDept = p.department === currentDept;
    if (!searchQuery) return inDept;
    const q = searchQuery.toLowerCase();
    return inDept && (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  });

  const handleSelectDept = (dept) => {
    setCurrentDept(dept);
    setSelectedPerson(null);
    setSearchQuery('');
  };

  const handleExamine = (id) => {
    localStorage.setItem('selectedPatientId', id);
    navigate(`/examination?patientId=${id}`);
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
      name: `${form.surname}, ${form.firstname}`,
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
    <DashboardLayout>
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
                <h3 className="font-bold text-[11px] uppercase text-[#466460]">Colleges</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#466460] [&::-webkit-scrollbar-thumb]:to-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
                {departments.map(dept => (
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
                        key={person.id}
                        onClick={() => setSelectedPerson(person)}
                        className={`p-3 mb-1 cursor-pointer rounded-xl transition-all border relative ${
                          selectedPerson?.id === person.id
                            ? 'bg-gradient-to-r from-[#e0eceb] to-white border-l-[3px] border-l-[#466460] border-t-transparent border-r-transparent border-b-transparent'
                            : 'border-transparent hover:bg-gradient-to-r hover:from-slate-50 hover:to-white hover:border-[#8aacaa] hover:translate-x-0.5'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-xs text-slate-700">{person.name}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {person.id} • {person.prog || ''} {person.year || ''}
                            </p>
                          </div>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full ${typeBadgeClass(person.type)}`}>
                            {person.type}
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
                          {selectedPerson.type === 'student' ? 'Student' : selectedPerson.type === 'instructor' ? 'Faculty' : 'Staff'}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#e0eceb] text-[#466460]">
                            {selectedPerson.department}
                          </span>
                          {selectedPerson.prog && (
                            <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {selectedPerson.prog}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: 'Age', value: selectedPerson.age || '-' },
                        { label: 'Gender', value: selectedPerson.gender || '-' },
                        { label: 'Birthdate', value: selectedPerson.birthdate || '-' },
                        { label: 'Year Level', value: selectedPerson.year || 'N/A' },
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
                      <p className="text-xs text-slate-600">
                        <i className="fa-solid fa-envelope w-4 mr-1 text-[#466460]"></i>
                        {selectedPerson.email || '-'}
                      </p>
                    </div>

                    {/* Medical History */}
                    <div className="mb-4">
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Medical History</p>
                      {selectedPerson.history && selectedPerson.history.length > 0 ? (
                        selectedPerson.history.map((h, i) => (
                          <p key={i} className="text-xs text-slate-600 border-l-2 border-[#466460] pl-2 mb-1">{h}</p>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No history recorded</p>
                      )}
                    </div>

                    {/* Conditions */}
                    <div className="mb-4">
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Conditions</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPerson.diseases && selectedPerson.diseases.length > 0 ? (
                          selectedPerson.diseases.map((d, i) => (
                            <span key={i} className="text-[8px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">{d}</span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </div>

                    {/* Examine Button */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleExamine(selectedPerson.id)}
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
                <select name="department" value={form.department} onChange={handleFormChange}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] bg-white">
                  <option>College of Computing</option>
                  <option>College of Engineering</option>
                  <option>College of Health Sciences</option>
                  <option>College of Arts & Sciences</option>
                  <option>College of Business</option>
                </select>
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

    </DashboardLayout>
  );
};

export default Records;