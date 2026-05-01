// frontend/src/features/admin-clinic/Examinations.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Dummy data to simulate a database lookup for pre-filling
const peopleData = [
  { name: "De Vera, Jenny", id: "23-00142", prog: "BSIT", year: "3rd Year", age: 21, gender: "Female", birthdate: "2003-03-15", email: "jenny@plsp.edu.ph", department: "CCS" },
  { name: "Santos, Sofia", id: "23-23406", prog: "BSCE", year: "2nd Year", age: 20, gender: "Female", birthdate: "2004-07-22", email: "sofia@plsp.edu.ph", department: "COE" }
];

const medicalConditions = [
  'Allergy, specify', 'Asthma', 'Cancer, specify', 'Cerebrovascular Disease',
  'Coronary Artery Disease', 'Diabetes Mellitus', 'Emphysema', 'Epilepsy/Seizure disorder',
  'Hepatitis, specify', 'Hyperlipidemia', 'Hypertension', 'Peptic Ulcer Disease',
  'Pneumonia', 'Thyroid Disease', 'Tuberculosis, specify (If PTB, category)',
  'Urinary Tract Infection', 'Genito/Reproductive, specify', 'Others'
];

const familyConditions = [
  'Allergy, specify', 'Asthma', 'Cancer, specify', 'Cerebrovascular disease',
  'Coronary Artery Disease', 'Diabetes Mellitus', 'Emphysema', 'Epilepsy/Seizure disorder',
  'Hepatitis, specify', 'Hyperlipidemia', 'Hypertension', 'Peptic Ulcer Disease',
  'Thyroid Disease', 'Tuberculosis, specify (If PTB, category)', 'Others'
];

const healthConditions = [
  'Heart Attack', 'High Blood Pressure', 'Low Blood Pressure', 'Heart Trouble',
  'HIV/AIDS and Documented Dx', 'Hay Fever / Allergies', 'Epilepsy/Convulsions', 'Fainting/Seizure',
  'Rapid Weight Loss', 'Sexually Transmitted Dx / Ulcers', 'Diabetes', 'Heart Problem/Surgery',
  'Cancer / Tumors', 'Anemia', 'Asthma', 'Stomach Troubles / Ulcers',
  'Head Injuries', 'Allergies/Drugs',
  'Rheumatic Heart Disease', 'Respiratory Dx / PTB', 'Stroke', 'Kidney Disease',
  'Thyroid Problem', 'Hepatitis'
];

const dentalProcedures = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy'
];

// Tooth numbering
const permUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const permUpperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
const permLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
const permLowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
const decidUpperRight = [55, 54, 53, 52, 51];
const decidUpperLeft = [61, 62, 63, 64, 65];
const decidLowerRight = [85, 84, 83, 82, 81];
const decidLowerLeft = [71, 72, 73, 74, 75];

const toothConditions = [
  { value: '', label: 'Free from Caries ( / )' },
  { value: 'caries', label: 'Caries (C)' },
  { value: 'filled', label: 'Filled (●)' },
  { value: 'missing', label: 'Missing (M)' },
  { value: 'extracted', label: 'Indicated for Extraction (X)' },
  { value: 'root-fragment', label: 'Root Fragment (RF)' },
  { value: 'improved', label: 'Improved (IM)' },
  { value: 'pontic', label: 'Pontic (P)' }
];

const toothOperations = [
  { value: '', label: 'None' },
  { value: 'AM', label: 'Amalgam (AM)' },
  { value: 'AB', label: 'Abutment (AB)' },
  { value: 'SI', label: 'Silicate Cement (SI)' },
  { value: 'GI', label: 'Gold Inlay (GI)' },
  { value: 'LC', label: 'Light Cure (LC)' },
  { value: 'GC', label: 'Gold Crown (GC)' },
  { value: 'SSC', label: 'Stainless Steel Crown (SSC)' },
  { value: 'PJC', label: 'Porcelain Jacket Crown (PJC)' },
  { value: 'TF', label: 'Temporary Filling (TF)' },
  { value: 'DC', label: 'Dowel Crown (DC)' },
  { value: 'SNT', label: 'Supernumerary Tooth (SNT)' },
  { value: 'PP', label: 'Periodontal Pocket (PP)' },
  { value: 'CA', label: 'Cervical Abrasion (CA)' },
  { value: 'R', label: 'Restorable (R)' }
];

export const Examinations = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId');

  const [examTab, setExamTab] = useState('medical');
  const [phase, setPhase] = useState(1);
  const [message, setMessage] = useState(null);

  // Medical Form State
  const [selectedPatient, setSelectedPatient] = useState(peopleData[0]);
  const [surgicalHistory, setSurgicalHistory] = useState([]);
  const [vitalRecords, setVitalRecords] = useState([]);
  const [formData, setFormData] = useState({
    lastName: '', firstName: '', middleName: '', schoolYear: '',
    studentId: '', course: '', yearSection: '', sex: 'Male', birthday: '', age: '',
    address: '', contactNo: '', landlineNo: '', religion: '', nationality: '', civilStatus: 'Single',
    emergencyName: '', emergencyRelation: '', emergencyAddress: '', emergencyContact: '',
    vax1: '', vax1Date: '', vax1Remarks: '', vax2: '', vax2Date: '', vax2Remarks: '',
    booster1: '', booster1Date: '', booster1Remarks: '', booster2: '', booster2Date: '', booster2Remarks: '',
    covidHistory: '',
    otherMedicalHistory: '', otherFamilyHistory: '',
    smoking: 'No', smokingDetails: '', alcohol: 'No', alcoholDetails: '',
    drugs: 'No', drugsDetails: '', studentSignature: '', dateSigned: new Date().toISOString().split('T')[0],
    q1: 'Yes', q2: 'No', q2Details: '', q3: 'No', q3Details: '', q4: 'No', q4Details: '',
    q5: 'No', q5b: 'No', height: '', weight: '', bmi: '', waist: '', lmp: '',
    labCbc: '', labCbcFacility: '', labCbcDate: '', labUa: '', labUaFacility: '', labUaDate: '',
    labXray: '', labXrayFacility: '', labXrayDate: '', labOther1Name: '', labOther1Result: '', labOther1Facility: '', labOther1Date: '',
    physician: '', examDate: new Date().toISOString().split('T')[0], nurseOnDuty: ''
  });

  // Dental Form State
  const [toothData, setToothData] = useState({});
  const [dentalFormData, setDentalFormData] = useState({
    dLastName: '', dFirstName: '', dMiddle: '', dSex: 'Male', dAge: '', dBirthday: '',
    dAddress: '', dCellphone: '', dCourseYear: '', dOfficeAddress: '', dTelNo: '', dNationality: 'Filipino',
    dLastVisit: '', dPrevDentist: '', dPhysician: '',
    dTeethUpper: '', dTeethLower: '',
    dVax1Date: '', dVax2Date: '', dBoosterDate: '',
    dPatientSig: '', dSigDate: new Date().toISOString().split('T')[0], dExaminedBy: ''
  });

  // Pre-fill data if patientId exists
  useEffect(() => {
    const patient = patientId ? peopleData.find(p => p.id === patientId) : peopleData[0];
    if (patient) {
      setSelectedPatient(patient);
      const nameParts = patient.name.split(', ');
      setFormData(prev => ({
        ...prev,
        lastName: nameParts[0] || '',
        firstName: nameParts[1] || '',
        studentId: patient.id,
        course: patient.prog || '',
        yearSection: patient.year || '',
        age: patient.age || '',
        sex: patient.gender || 'Male',
        birthday: patient.birthdate || '',
        email: patient.email || ''
      }));
      setDentalFormData(prev => ({
        ...prev,
        dLastName: nameParts[0] || '',
        dFirstName: nameParts[1] || '',
        dAge: patient.age || '',
        dSex: patient.gender || 'Male',
        dBirthday: patient.birthdate || '',
        dCourseYear: `${patient.prog} ${patient.year}` || ''
      }));
    }
  }, [patientId]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleDentalChange = (e) => {
    const { id, value } = e.target;
    setDentalFormData(prev => ({ ...prev, [id]: value }));
  };

  const calculateAge = (e) => {
    const dob = new Date(e.target.value);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const calculatedAge = Math.abs(age_dt.getUTCFullYear() - 1970);
    setFormData(prev => ({ ...prev, birthday: e.target.value, age: calculatedAge }));
    setDentalFormData(prev => ({ ...prev, dBirthday: e.target.value, dAge: calculatedAge }));
  };

  const calculateBMI = () => {
    const h = parseFloat(formData.height);
    const w = parseFloat(formData.weight);
    if (h && w && h > 0) {
      const bmi = (w / ((h / 100) ** 2)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi }));
    }
  };

  // Surgical History handlers
  const addSurgicalHistory = () => {
    setSurgicalHistory([...surgicalHistory, { id: Date.now(), operation: '', date: '', notes: '' }]);
  };

  const removeSurgicalHistory = (id) => {
    setSurgicalHistory(surgicalHistory.filter(item => item.id !== id));
  };

  const updateSurgicalHistory = (id, field, value) => {
    setSurgicalHistory(surgicalHistory.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Vital Records handlers
  const addVitalRecord = () => {
    setVitalRecords([...vitalRecords, {
      id: Date.now(), date: new Date().toISOString().split('T')[0],
      bp: '', pr: '', rr: '', temp: '', nurse: '', remarks: ''
    }]);
  };

  const removeVitalRecord = (id) => {
    setVitalRecords(vitalRecords.filter(v => v.id !== id));
  };

  const updateVitalRecord = (id, field, value) => {
    setVitalRecords(vitalRecords.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  // Tooth handlers
  const [toothModal, setToothModal] = useState({ open: false, toothNum: null });
  const [toothCondition, setToothCondition] = useState('');
  const [toothOperation, setToothOperation] = useState('');

  const openToothModal = (num) => {
    setToothModal({ open: true, toothNum: num });
    setToothCondition(toothData[num]?.condition || '');
    setToothOperation(toothData[num]?.operation || '');
  };

  const saveToothStatus = () => {
    if (toothModal.toothNum) {
      setToothData(prev => ({
        ...prev,
        [toothModal.toothNum]: { condition: toothCondition, operation: toothOperation }
      }));
      setToothModal({ open: false, toothNum: null });
      showMessage('Tooth status updated');
    }
  };

  const getToothLabel = (num) => {
    const d = toothData[num];
    if (!d || !d.condition) return '/';
    if (d.condition === 'caries') return 'C';
    if (d.condition === 'filled') return '●';
    if (d.condition === 'missing') return 'M';
    if (d.condition === 'extracted') return 'X';
    if (d.condition === 'root-fragment') return 'RF';
    if (d.condition === 'improved') return 'IM';
    if (d.condition === 'pontic') return 'P';
    return '/';
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lastName) {
      setPhase(1);
      return alert("Please fill in patient's last name.");
    }
    showMessage("Medical record submitted successfully!");
  };

  const handleDentalSubmit = () => {
    showMessage("Dental record saved successfully!");
  };

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
  const sectionClass = "bg-slate-50 border-l-4 border-[#466460] px-4 py-2 text-xs font-bold uppercase my-4 flex justify-between items-center text-slate-700";

  return (
    <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

      {/* Exam Subtabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-slate-200">
        <button
          onClick={() => setExamTab('medical')}
          className={`px-5 py-2.5 text-sm font-semibold relative ${examTab === 'medical' ? 'text-[#466460]' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-stethoscope mr-2"></i>Medical Examination
          {examTab === 'medical' && <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>}
        </button>
        <button
          onClick={() => setExamTab('dental')}
          className={`px-5 py-2.5 text-sm font-semibold relative ${examTab === 'dental' ? 'text-[#466460]' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-tooth mr-2"></i>Dental Record
          {examTab === 'dental' && <div className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-[#466460]"></div>}
        </button>
      </div>

      {/* ==================== MEDICAL EXAMINATION TAB ==================== */}
      {examTab === 'medical' && (
        <form onSubmit={handleSubmit}>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-bold text-[#466460] mb-2">
              <span>Phase {phase} of 2</span>
              <span>{phase === 1 ? 'Patient History' : 'Clinical Findings & Labs'}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-[#466460] h-2.5 rounded-full transition-all duration-500" style={{ width: phase === 1 ? '50%' : '100%' }}></div>
            </div>
          </div>

          {/* Current Patient Info */}
          {selectedPatient && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 flex items-center gap-4">
              <div>
                <p className="text-xs font-bold text-slate-500">Current Patient</p>
                <p className="text-lg font-bold text-[#466460]">{selectedPatient.name}</p>
                <p className="text-xs text-slate-500">{selectedPatient.id} • {selectedPatient.department} • {selectedPatient.prog} {selectedPatient.year}</p>
              </div>
            </div>
          )}

          {/* ==================== PHASE 1 ==================== */}
          <div className={phase === 1 ? 'block' : 'hidden'}>

            <div className={sectionClass}>Patient Demographics</div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <label className={labelClass}>Last Name / Family Name</label>
                <input type="text" id="lastName" className={inputClass} value={formData.lastName} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>First Name</label>
                <input type="text" id="firstName" className={inputClass} value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Middle Name</label>
                <input type="text" id="middleName" className={inputClass} value={formData.middleName} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>School Year</label>
                <input type="text" id="schoolYear" className={inputClass} placeholder="e.g. 2024-2025" value={formData.schoolYear} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Student No.</label>
                <input type="text" id="studentId" className={inputClass} value={formData.studentId} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Course</label>
                <input type="text" id="course" className={inputClass} value={formData.course} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Year / Section</label>
                <input type="text" id="yearSection" className={inputClass} value={formData.yearSection} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Sex</label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="sex" value="Male" checked={formData.sex === 'Male'} onChange={handleChange} /> Male
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="sex" value="Female" checked={formData.sex === 'Female'} onChange={handleChange} /> Female
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Birthday</label>
                <input type="date" id="birthday" className={inputClass} value={formData.birthday} onChange={calculateAge} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Age</label>
                <input type="number" id="age" className={`${inputClass} bg-slate-50`} value={formData.age} readOnly />
              </div>
              <div className="col-span-4">
                <label className={labelClass}>Address</label>
                <input type="text" id="address" className={inputClass} placeholder="Home Address" value={formData.address} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Contact No.</label>
                <input type="text" id="contactNo" className={inputClass} value={formData.contactNo} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Landline No.</label>
                <input type="text" id="landlineNo" className={inputClass} value={formData.landlineNo} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Religion</label>
                <input type="text" id="religion" className={inputClass} value={formData.religion} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Nationality</label>
                <input type="text" id="nationality" className={inputClass} placeholder="Filipino" value={formData.nationality} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Civil Status</label>
                <select id="civilStatus" className={inputClass} value={formData.civilStatus} onChange={handleChange}>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Widowed</option>
                  <option>Separated</option>
                </select>
              </div>
            </div>

            <div className={sectionClass}>Person to Contact in Case of Emergency</div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5">
                <label className={labelClass}>Name</label>
                <input type="text" id="emergencyName" className={inputClass} placeholder="Full name" value={formData.emergencyName} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Relationship</label>
                <input type="text" id="emergencyRelation" className={inputClass} placeholder="e.g. Parent, Spouse" value={formData.emergencyRelation} onChange={handleChange} />
              </div>
              <div className="col-span-4">
                <label className={labelClass}>Address</label>
                <input type="text" id="emergencyAddress" className={inputClass} value={formData.emergencyAddress} onChange={handleChange} />
              </div>
              <div className="col-span-4">
                <label className={labelClass}>Contact No./s</label>
                <input type="text" id="emergencyContact" className={inputClass} value={formData.emergencyContact} onChange={handleChange} />
              </div>
            </div>

            <div className={sectionClass}>COVID-19 Vaccine History</div>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left">Dose</th>
                    <th className="border border-slate-300 p-2 text-left">Name of Vaccine</th>
                    <th className="border border-slate-300 p-2 text-left">Date</th>
                    <th className="border border-slate-300 p-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">1st Dose</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="vax1" className={inputClass} value={formData.vax1} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="vax1Date" className={inputClass} value={formData.vax1Date} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="vax1Remarks" className={inputClass} value={formData.vax1Remarks} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">2nd Dose</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="vax2" className={inputClass} value={formData.vax2} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="vax2Date" className={inputClass} value={formData.vax2Date} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="vax2Remarks" className={inputClass} value={formData.vax2Remarks} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">Booster (1)</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="booster1" className={inputClass} value={formData.booster1} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="booster1Date" className={inputClass} value={formData.booster1Date} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="booster1Remarks" className={inputClass} value={formData.booster1Remarks} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">Booster (2)</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="booster2" className={inputClass} value={formData.booster2} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="booster2Date" className={inputClass} value={formData.booster2Date} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="booster2Remarks" className={inputClass} value={formData.booster2Remarks} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">History of COVID-19</td>
                    <td colSpan={3} className="border border-slate-300 p-2">
                      <input type="text" id="covidHistory" className={inputClass} placeholder="Date of infection, severity, treatment, recovery details" value={formData.covidHistory} onChange={handleChange} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={sectionClass}>Past Medical History</div>
            <p className="text-xs text-slate-500 mb-3">Check all that apply:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
              {medicalConditions.map(c => (
                <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-[#466460] rounded focus:ring-[#466460]" /> {c}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <label className={labelClass}>Specify details for checked conditions above</label>
                <input type="text" id="otherMedicalHistory" className={inputClass} placeholder="Additional details, severity, medications taken" value={formData.otherMedicalHistory} onChange={handleChange} />
              </div>
            </div>

            <div className={sectionClass}>
              <span>Past Surgical History</span>
              <button type="button" onClick={addSurgicalHistory} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Add Operation</button>
            </div>
            {surgicalHistory.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center">No surgical history recorded. Click "Add Operation" to add.</p>
            ) : (
              surgicalHistory.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-4 mb-3 p-3 bg-slate-50 rounded-lg relative">
                  <button type="button" onClick={() => removeSurgicalHistory(s.id)} className="absolute top-2 right-2 bg-[#e07a5f] text-white px-2 py-1 rounded text-xs">×</button>
                  <div className="col-span-6">
                    <input type="text" placeholder="Operation/Procedure Name" className={inputClass} value={s.operation} onChange={(e) => updateSurgicalHistory(s.id, 'operation', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="date" className={inputClass} value={s.date} onChange={(e) => updateSurgicalHistory(s.id, 'date', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input type="text" placeholder="Hospital / complications" className={inputClass} value={s.notes} onChange={(e) => updateSurgicalHistory(s.id, 'notes', e.target.value)} />
                  </div>
                </div>
              ))
            )}

            <div className={sectionClass}>Family History</div>
            <p className="text-xs text-slate-500 mb-3">Check all that apply in your family:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
              {familyConditions.map(c => (
                <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-[#466460] rounded focus:ring-[#466460]" /> {c}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <label className={labelClass}>Specify details for family history</label>
                <input type="text" id="otherFamilyHistory" className={inputClass} placeholder="Specify members affected and other details" value={formData.otherFamilyHistory} onChange={handleChange} />
              </div>
            </div>

            <div className={sectionClass}>Personal / Social History</div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <label className={labelClass}>Smoking</label>
                <div className="flex gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="smoking" value="Yes" checked={formData.smoking === 'Yes'} onChange={handleChange} /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="smoking" value="No" checked={formData.smoking === 'No'} onChange={handleChange} /> No
                  </label>
                </div>
                <input type="text" id="smokingDetails" className={inputClass} placeholder="If yes: Quit? No. of years / days & type" value={formData.smokingDetails} onChange={handleChange} />
              </div>
              <div className="col-span-4">
                <label className={labelClass}>Alcohol</label>
                <div className="flex gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="alcohol" value="Yes" checked={formData.alcohol === 'Yes'} onChange={handleChange} /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="alcohol" value="No" checked={formData.alcohol === 'No'} onChange={handleChange} /> No
                  </label>
                </div>
                <input type="text" id="alcoholDetails" className={inputClass} placeholder="If yes: Quit? No. of bottles / days & type" value={formData.alcoholDetails} onChange={handleChange} />
              </div>
              <div className="col-span-4">
                <label className={labelClass}>Illicit Drugs</label>
                <div className="flex gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="drugs" value="Yes" checked={formData.drugs === 'Yes'} onChange={handleChange} /> Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="drugs" value="No" checked={formData.drugs === 'No'} onChange={handleChange} /> No
                  </label>
                </div>
                <input type="text" id="drugsDetails" className={inputClass} placeholder="If yes: Quit? Specify type / frequency" value={formData.drugsDetails} onChange={handleChange} />
              </div>
            </div>

            <div className={sectionClass}>Patient Photo</div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-24 h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#466460] hover:text-[#466460] text-slate-400 text-xs">
                <i className="fa-solid fa-camera text-xl mb-1"></i>
                <span>1x1 Photo</span>
                <span>Click to upload</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mt-2">Upload a 1x1 ID photo of the student.</p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <label className={labelClass}>Signature of Student</label>
                <input type="text" id="studentSignature" className={inputClass} placeholder="Type full name as signature" value={formData.studentSignature} onChange={handleChange} />
              </div>
              <div className="col-span-6">
                <label className={labelClass}>Date Signed</label>
                <input type="date" id="dateSigned" className={inputClass} value={formData.dateSigned} onChange={handleChange} />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button type="button" onClick={() => setPhase(2)} className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">Next: Clinical Findings →</button>
            </div>
          </div>

          {/* ==================== PHASE 2 ==================== */}
          <div className={phase === 2 ? 'block' : 'hidden'}>

            <div className={sectionClass}>Health History Questions</div>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left" style={{ width: '70%' }}>Question</th>
                    <th className="border border-slate-300 p-2 text-center">YES</th>
                    <th className="border border-slate-300 p-2 text-center">NO</th>
                    <th className="border border-slate-300 p-2 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2">1. Are you in good health?</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q1" value="Yes" checked={formData.q1 === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q1" value="No" checked={formData.q1 === 'No'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">2. Are you under medical treatment now?</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q2" value="Yes" checked={formData.q2 === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q2" value="No" checked={formData.q2 === 'No'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="q2Details" className={inputClass} placeholder="If yes, specify" value={formData.q2Details} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">3. Have you ever had serious illness or surgical operation/hospitalization in the last 5 years?</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q3" value="Yes" checked={formData.q3 === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q3" value="No" checked={formData.q3 === 'No'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="q3Details" className={inputClass} placeholder="If yes, specify" value={formData.q3Details} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">4. Are you taking any medication?</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q4" value="Yes" checked={formData.q4 === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q4" value="No" checked={formData.q4 === 'No'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="q4Details" className={inputClass} placeholder="If yes, specify" value={formData.q4Details} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">5. For women only: Are you pregnant?</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q5" value="Yes" checked={formData.q5 === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q5" value="No" checked={formData.q5 === 'No'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2">Are you nursing?</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q5b" value="Yes" checked={formData.q5b === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name="q5b" value="No" checked={formData.q5b === 'No'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={sectionClass}>Do you have or have you had any of the following?</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
              {healthConditions.map(c => (
                <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-[#466460] rounded focus:ring-[#466460]" /> {c}
                </label>
              ))}
            </div>

            <div className={sectionClass}>Laboratory Results</div>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left" style={{ width: '180px' }}>Test</th>
                    <th className="border border-slate-300 p-2 text-left">Results</th>
                    <th className="border border-slate-300 p-2 text-left" style={{ width: '180px' }}>Name of Lab Facility</th>
                    <th className="border border-slate-300 p-2 text-left" style={{ width: '140px' }}>Date Reported by Lab</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">Complete Blood Count (CBC)</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="labCbc" className={inputClass} value={formData.labCbc} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="labCbcFacility" className={inputClass} value={formData.labCbcFacility} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="labCbcDate" className={inputClass} value={formData.labCbcDate} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">Urinalysis</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="labUa" className={inputClass} value={formData.labUa} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="labUaFacility" className={inputClass} value={formData.labUaFacility} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="labUaDate" className={inputClass} value={formData.labUaDate} onChange={handleChange} /></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-semibold">Chest X-Ray</td>
                    <td className="border border-slate-300 p-2"><input type="text" id="labXray" className={inputClass} value={formData.labXray} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id="labXrayFacility" className={inputClass} value={formData.labXrayFacility} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id="labXrayDate" className={inputClass} value={formData.labXrayDate} onChange={handleChange} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={sectionClass}>
              <span>Anthropometric Measurements & Vital Signs</span>
              <button type="button" onClick={addVitalRecord} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Add Vital Record</button>
            </div>
            {vitalRecords.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center mb-4">No vital signs recorded. Click "Add Record" to add.</p>
            ) : (
              vitalRecords.map((r, idx) => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-lg mb-3 relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#466460]">Record #{idx + 1}</span>
                    <button type="button" onClick={() => removeVitalRecord(r.id)} className="bg-[#e07a5f] text-white px-2 py-1 rounded text-xs">×</button>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-2"><label className={labelClass}>Date</label><input type="date" className={inputClass} value={r.date} onChange={(e) => updateVitalRecord(r.id, 'date', e.target.value)} /></div>
                    <div className="col-span-2"><label className={labelClass}>BP (mmHg)</label><input type="text" className={inputClass} placeholder="120/80" value={r.bp} onChange={(e) => updateVitalRecord(r.id, 'bp', e.target.value)} /></div>
                    <div className="col-span-2"><label className={labelClass}>PR (bpm)</label><input type="text" className={inputClass} placeholder="72" value={r.pr} onChange={(e) => updateVitalRecord(r.id, 'pr', e.target.value)} /></div>
                    <div className="col-span-2"><label className={labelClass}>RR (cpm)</label><input type="text" className={inputClass} placeholder="18" value={r.rr} onChange={(e) => updateVitalRecord(r.id, 'rr', e.target.value)} /></div>
                    <div className="col-span-2"><label className={labelClass}>Temp (°C)</label><input type="text" className={inputClass} placeholder="36.5" value={r.temp} onChange={(e) => updateVitalRecord(r.id, 'temp', e.target.value)} /></div>
                    <div className="col-span-2"><label className={labelClass}>Nurse / Staff</label><input type="text" className={inputClass} placeholder="Nurse name" value={r.nurse} onChange={(e) => updateVitalRecord(r.id, 'nurse', e.target.value)} /></div>
                  </div>
                </div>
              ))
            )}

            <div className="grid grid-cols-12 gap-4 mt-4">
              <div className="col-span-3">
                <label className={labelClass}>Height (cm)</label>
                <input type="text" id="height" className={inputClass} placeholder="cm" value={formData.height} onChange={handleChange} onBlur={calculateBMI} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Weight (kg)</label>
                <input type="text" id="weight" className={inputClass} placeholder="kg" value={formData.weight} onChange={handleChange} onBlur={calculateBMI} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>BMI (auto-calc)</label>
                <input type="text" id="bmi" className={`${inputClass} bg-slate-50`} placeholder="kg/m²" value={formData.bmi} readOnly />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Waist Circumference (cm)</label>
                <input type="text" id="waist" className={inputClass} placeholder="cm" value={formData.waist} onChange={handleChange} />
              </div>
              <div className="col-span-6">
                <label className={labelClass}>First Day of Last Menstrual Period (LMP) — For females only</label>
                <input type="date" id="lmp" className={inputClass} value={formData.lmp} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 mt-6">
              <div className="col-span-6">
                <label className={labelClass}>Examining Physician / LIC. No.</label>
                <input type="text" id="physician" className={inputClass} placeholder="Full name and license number" value={formData.physician} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Examination Date</label>
                <input type="date" id="examDate" className={inputClass} value={formData.examDate} onChange={handleChange} />
              </div>
              <div className="col-span-3">
                <label className={labelClass}>Nurse on Duty</label>
                <input type="text" id="nurseOnDuty" className={inputClass} placeholder="Nurse name" value={formData.nurseOnDuty} onChange={handleChange} />
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
              <button type="button" onClick={() => setPhase(1)} className="bg-slate-200 text-slate-600 px-8 py-3 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all">← Previous</button>
              <button type="submit" className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">Review & Submit →</button>
            </div>
          </div>

        </form>
      )}

      {/* ==================== DENTAL RECORD TAB ==================== */}
      {examTab === 'dental' && (
        <form onSubmit={(e) => { e.preventDefault(); handleDentalSubmit(); }}>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#466460]"><i className="fa-solid fa-tooth mr-2"></i>Student Dental Record</h2>
            <button type="submit" className="bg-[#81b29a] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90">💾 Save Dental Record</button>
          </div>

          <div className={sectionClass}>Patient Information</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3">
              <label className={labelClass}>Last Name</label>
              <input type="text" id="dLastName" className={inputClass} value={dentalFormData.dLastName} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>First Name</label>
              <input type="text" id="dFirstName" className={inputClass} value={dentalFormData.dFirstName} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Middle Name</label>
              <input type="text" id="dMiddle" className={inputClass} value={dentalFormData.dMiddle} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Sex</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="dSex" value="Male" checked={dentalFormData.dSex === 'Male'} onChange={handleDentalChange} /> Male
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="dSex" value="Female" checked={dentalFormData.dSex === 'Female'} onChange={handleDentalChange} /> Female
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Age</label>
              <input type="number" id="dAge" className={inputClass} value={dentalFormData.dAge} onChange={handleDentalChange} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Birthday</label>
              <input type="date" id="dBirthday" className={inputClass} value={dentalFormData.dBirthday} onChange={handleDentalChange} />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Address</label>
              <input type="text" id="dAddress" className={inputClass} value={dentalFormData.dAddress} onChange={handleDentalChange} />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Cellphone No.</label>
              <input type="text" id="dCellphone" className={inputClass} value={dentalFormData.dCellphone} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Course / Year / Section</label>
              <input type="text" id="dCourseYear" className={inputClass} value={dentalFormData.dCourseYear} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Office Address</label>
              <input type="text" id="dOfficeAddress" className={inputClass} value={dentalFormData.dOfficeAddress} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Tel. No.</label>
              <input type="text" id="dTelNo" className={inputClass} value={dentalFormData.dTelNo} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Nationality</label>
              <input type="text" id="dNationality" className={inputClass} placeholder="Filipino" value={dentalFormData.dNationality} onChange={handleDentalChange} />
            </div>
          </div>

          <div className={sectionClass}>Dental History</div>
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-4">
              <label className={labelClass}>Last Dental Visit</label>
              <input type="date" id="dLastVisit" className={inputClass} value={dentalFormData.dLastVisit} onChange={handleDentalChange} />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Previous Dentist: Dr.</label>
              <input type="text" id="dPrevDentist" className={inputClass} value={dentalFormData.dPrevDentist} onChange={handleDentalChange} />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-700 mb-3">Dental History — Check if applicable (Yes/No):</p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Dental Procedure</th>
                  <th className="border border-slate-300 p-2 text-center">Yes</th>
                  <th className="border border-slate-300 p-2 text-center">No</th>
                </tr>
              </thead>
              <tbody>
                {dentalProcedures.map(proc => (
                  <tr key={proc}>
                    <td className="border border-slate-300 p-2 font-medium">{proc}</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={`dh_${proc.replace(/\W/g, '')}`} value="Yes" /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={`dh_${proc.replace(/\W/g, '')}`} value="No" defaultChecked /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>Medical History (Dental)</div>
          <div className="mb-4">
            <label className={labelClass}>Name of Physician: Dr.</label>
            <input type="text" id="dPhysician" className={inputClass} value={dentalFormData.dPhysician} onChange={handleDentalChange} />
          </div>

          <div className={sectionClass}>Intraoral Findings</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Consistency of Gingiva</p>
              <div className="flex flex-col gap-2 text-xs">
                {['Firm', 'Good', 'Pink', 'Palpable', 'Class (Molar)', 'Pain'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gingiva" value={opt} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Oral Hygiene</p>
              <div className="flex flex-col gap-2 text-xs mb-3">
                {['Good', 'Fair', 'Poor'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="oralHygiene" value={opt} /> {opt}
                  </label>
                ))}
              </div>
              <p className="text-xs font-bold text-[#466460] uppercase mb-2 pb-2 border-b border-[#e0eceb]">Gingival Color</p>
              <div className="flex flex-col gap-2 text-xs">
                {['Bright red', 'Pale'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gingivalColor" value={opt} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Occlusion</p>
              <div className="flex flex-col gap-2 text-xs">
                {['Smooth', 'Overjet', 'Overbite', 'Clicking'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="occlusion" value={opt} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Lymph Nodes</p>
              <div className="flex flex-col gap-2 text-xs">
                {['Palpable', 'Not Palpable'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="lymph" value={opt} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Status</p>
              <div className="flex flex-col gap-2 text-xs">
                {['Hyperplastic', 'Normal'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value={opt} /> {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Other Findings</p>
              <div className="flex flex-col gap-2 text-xs mb-2">
                {['Midline Deviation', 'Tooth Wear', 'Trismus'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="otherFindings" value={opt} /> {opt}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" name="tmjExam" /> TMJ Examination
              </label>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-4">
              <label className={labelClass}>Number of Teeth Present</label>
              <div className="flex gap-4">
                <div><label className="text-xs block mb-1">Upper</label><input type="number" id="dTeethUpper" className={inputClass} style={{ width: '80px' }} min="0" max="16" value={dentalFormData.dTeethUpper} onChange={handleDentalChange} /></div>
                <div><label className="text-xs block mb-1">Lower</label><input type="number" id="dTeethLower" className={inputClass} style={{ width: '80px' }} min="0" max="16" value={dentalFormData.dTeethLower} onChange={handleDentalChange} /></div>
              </div>
            </div>
          </div>

          <div className={sectionClass}>COVID-19 Vaccine (Dental Record)</div>
          <div className="grid grid-cols-12 gap-4 mb-6">
            <div className="col-span-3">
              <label className={labelClass}>First Dose Date</label>
              <input type="date" id="dVax1Date" className={inputClass} value={dentalFormData.dVax1Date} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Second Dose Date</label>
              <input type="date" id="dVax2Date" className={inputClass} value={dentalFormData.dVax2Date} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Booster Dose Date</label>
              <input type="date" id="dBoosterDate" className={inputClass} value={dentalFormData.dBoosterDate} onChange={handleDentalChange} />
            </div>
          </div>

          <div className={sectionClass}>Patient Dental Chart</div>
          <p className="text-xs text-slate-500 mb-3">Click on any tooth to set its condition and operation. All 32 permanent + 20 deciduous teeth are shown.</p>

          {/* Dental Chart */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mb-4">
            <div className="mb-4">
              <p className="text-xs font-bold text-[#466460] uppercase text-center py-2 bg-slate-100 rounded">Deciduous Teeth (Upper)</p>
              <div className="flex justify-center gap-1 my-2">
                {decidUpperRight.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
                <span className="mx-4"></span>
                {decidUpperLeft.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-400 text-center">
                <div>RIGHT</div>
                <div>LEFT</div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-[#466460] uppercase text-center py-2 bg-slate-100 rounded">Deciduous Teeth (Lower)</p>
              <div className="flex justify-center gap-1 my-2">
                {decidLowerRight.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
                <span className="mx-4"></span>
                {decidLowerLeft.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-[#466460] uppercase text-center py-2 bg-slate-100 rounded">Permanent Teeth (Upper)</p>
              <div className="flex justify-center gap-1 my-2">
                {permUpperRight.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
                <span className="mx-4"></span>
                {permUpperLeft.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-400 text-center">
                <div>RIGHT</div>
                <div>LEFT</div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-[#466460] uppercase text-center py-2 bg-slate-100 rounded">Permanent Teeth (Lower)</p>
              <div className="flex justify-center gap-1 my-2">
                {permLowerRight.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
                <span className="mx-4"></span>
                {permLowerLeft.map(n => (
                  <div key={n} className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 mb-1">{n}</span>
                    <div className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded ${toothData[n]?.condition === 'extracted' ? 'bg-red-200 border-red-500 text-red-700' : toothData[n]?.condition === 'caries' ? 'bg-red-100 border-red-400 text-red-600' : toothData[n]?.condition === 'filled' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white border-slate-300'}`} onClick={() => openToothModal(n)}>{getToothLabel(n)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dental Legend */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
              <p className="text-[9px] font-bold text-[#466460] uppercase">LEGEND — Condition</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 text-xs">
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-slate-300 bg-white rounded"></div> ( / ) Free from Caries</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-red-400 bg-red-100 rounded"></div> (C) Caries</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-yellow-500 bg-yellow-100 rounded"></div> (●) Filled</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-slate-400 bg-slate-100 rounded"></div> (M) Missing</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-yellow-400 bg-yellow-50 rounded"></div> (RF) Root Fragment</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-blue-400 bg-blue-100 rounded"></div> (IM) Improved</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-purple-400 bg-purple-100 rounded"></div> (P) Pontic</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 border border-pink-400 bg-pink-100 rounded"></div> (X) Extracted</div>
            </div>

            {/* LEGEND — Operation */}
            <div className="bg-slate-100 px-4 py-2 border-t border-b border-slate-200">
              <p className="text-[9px] font-bold text-[#466460] uppercase">LEGEND — Operation</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-4 border-r border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">Condition & Miscellaneous</p>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">IM</div> Improved</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">X</div> Extracted</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">RF</div> Root Fragment</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">R</div> Restorable</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">SNT</div> Supernumerary Tooth</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">PP</div> Periodontal Pocket</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">M</div> Missing</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">CA</div> Cervical Abrasion</div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">Crowns, Inlays & Fillings</p>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">LC</div> Light Cure</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">GI</div> Gold Inlay</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">GC</div> Gold Crown</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">SSC</div> Stainless Steel Crown</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">RCT</div> Root Canal Treatment</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">TF</div> Temporary Filling</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">PJC</div> Porcelain Jacket Crown</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">PRC</div> Porcelain Crown</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">DC</div> Dowel Crown</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">P</div> Pontic</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">AB</div> Abutment</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">SI</div> Silicate Cement</div>
                  <div className="flex items-center gap-2"><div className="w-5 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center">AM</div> Amalgam</div>
                </div>
              </div>
            </div>
          </div>

          <div className={sectionClass}>Signature & Examiner</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <label className={labelClass}>Patient Signature / Date</label>
              <input type="text" id="dPatientSig" className={inputClass} placeholder="Type full name as signature" value={dentalFormData.dPatientSig} onChange={handleDentalChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Date</label>
              <input type="date" id="dSigDate" className={inputClass} value={dentalFormData.dSigDate} onChange={handleDentalChange} />
            </div>
            <div className="col-span-6">
              <label className={labelClass}>Examined By</label>
              <input type="text" id="dExaminedBy" className={inputClass} placeholder="Dentist name and license number" value={dentalFormData.dExaminedBy} onChange={handleDentalChange} />
            </div>
          </div>

        </form>
      )}

      {/* Tooth Modal */}
      {toothModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[320px]">
            <h3 className="text-lg font-bold text-[#466460] mb-4">Tooth #{toothModal.toothNum}</h3>
            <div className="mb-3">
              <label className={labelClass}>Condition</label>
              <select className={inputClass} value={toothCondition} onChange={(e) => setToothCondition(e.target.value)}>
                {toothConditions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className={labelClass}>Operation / Restoration</label>
              <select className={inputClass} value={toothOperation} onChange={(e) => setToothOperation(e.target.value)}>
                {toothOperations.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={saveToothStatus} className="flex-1 bg-[#466460] text-white px-4 py-2 rounded-lg text-sm">Save</button>
              <button type="button" onClick={() => setToothModal({ open: false, toothNum: null })} className="flex-1 bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {message && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-lg font-bold animate-[fadeIn_0.3s_ease-out]">
          <i className="fa-solid fa-circle-check mr-2"></i>{message}
        </div>
      )}

    </div>
  );
};

export default Examinations;