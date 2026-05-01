// frontend/src/features/admin-clinic/Examinations.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Medical from './Examination/Medical';
import Dental from './Examination/Dental';

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
        <Medical
          phase={phase}
          setPhase={setPhase}
          formData={formData}
          setFormData={setFormData}
          selectedPatient={selectedPatient}
          surgicalHistory={surgicalHistory}
          setSurgicalHistory={setSurgicalHistory}
          vitalRecords={vitalRecords}
          setVitalRecords={setVitalRecords}
          handleChange={handleChange}
          calculateAge={calculateAge}
          calculateBMI={calculateBMI}
          showMessage={showMessage}
          handleSubmit={handleSubmit}
          inputClass={inputClass}
          labelClass={labelClass}
          sectionClass={sectionClass}
        />
      )}

      {/* ==================== DENTAL RECORD TAB ==================== */}
      {examTab === 'dental' && (
        <Dental
          dentalFormData={dentalFormData}
          setDentalFormData={setDentalFormData}
          handleDentalChange={handleDentalChange}
          calculateAge={calculateAge}
          toothData={toothData}
          setToothData={setToothData}
          handleDentalSubmit={handleDentalSubmit}
          showMessage={showMessage}
          inputClass={inputClass}
          labelClass={labelClass}
          sectionClass={sectionClass}
        />
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