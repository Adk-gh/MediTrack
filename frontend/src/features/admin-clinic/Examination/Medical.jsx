import React, { useState, useEffect } from 'react';

// ── Static data ────────────────────────────────────────────────────────────────

const medicalConditions = [
  'Allergy, specify', 'Asthma', 'Cancer, specify', 'Cerebrovascular Disease',
  'Coronary Artery Disease', 'Diabetes Mellitus', 'Emphysema', 'Epilepsy/Seizure disorder',
  'Hepatitis, specify', 'Hyperlipidemia', 'Hypertension', 'Peptic Ulcer Disease',
  'Pneumonia', 'Thyroid Disease', 'Tuberculosis, specify (If PTB, category)',
  'Urinary Tract Infection', 'Genito/Reproductive, specify', 'Others',
];

const familyConditions = [
  'Allergy, specify', 'Asthma', 'Cancer, specify', 'Cerebrovascular disease',
  'Coronary Artery Disease', 'Diabetes Mellitus', 'Emphysema', 'Epilepsy/Seizure disorder',
  'Hepatitis, specify', 'Hyperlipidemia', 'Hypertension', 'Peptic Ulcer Disease',
  'Thyroid Disease', 'Tuberculosis, specify (If PTB, category)', 'Others',
];

const healthConditions = [
  'Heart Attack', 'High Blood Pressure', 'Low Blood Pressure', 'Heart Trouble',
  'HIV/AIDS and Documented Dx', 'Hay Fever / Allergies', 'Epilepsy/Convulsions', 'Fainting/Seizure',
  'Rapid Weight Loss', 'Sexually Transmitted Dx / Ulcers', 'Diabetes', 'Heart Problem/Surgery',
  'Cancer / Tumors', 'Anemia', 'Asthma', 'Stomach Troubles / Ulcers',
  'Head Injuries', 'Allergies/Drugs', 'Rheumatic Heart Disease', 'Respiratory Dx / PTB',
  'Stroke', 'Kidney Disease', 'Thyroid Problem', 'Hepatitis',
];

// ── Shared style tokens ────────────────────────────────────────────────────────
const inputClass   = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
const labelClass   = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
const sectionClass = "bg-slate-50 border-l-4 border-[#466460] px-4 py-2 text-xs font-bold uppercase my-4 flex justify-between items-center text-slate-700";

// ── Summary sub-components ─────────────────────────────────────────────────────

const SumItem = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
    <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">{label}</div>
    <div className={`text-[12px] font-semibold ${value ? 'text-slate-800' : 'text-slate-300 italic font-normal'}`}>
      {value || 'Not provided'}
    </div>
  </div>
);

const SumSection = ({ icon, title, children }) => (
  <div className="mb-5">
    <h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-[#466460] tracking-widest pb-1.5 border-b-2 border-[#e0eceb] mb-3">
      <i className={`fa-solid ${icon}`}></i> {title}
    </h4>
    {children}
  </div>
);

// ── Helper: build initial formData from selectedPatient ───────────────────────
const buildInitialForm = (p) => {
  if (!p) return defaultForm();

  // vaccination rows
  const vax = p.vaccinations || {};
  const dose = (key) => vax[key] || {};

  return {
    lastName:    p.lastName    || (p.name ? p.name.split(', ')[0] : ''),
    firstName:   p.firstName   || (p.name ? (p.name.split(', ')[1] || '') : ''),
    middleName:  p.middleInitial || '',
    schoolYear:  '',
    studentId:   p.universityId || p.studentId || p.id || '',
    course:      p.program      || p.prog  || '',
    yearSection: p.yearLevel    || p.year  || '',
    sex:         p.gender       || p.sex   || 'Male',
    birthday:    p.birthday     || p.birthdate || '',
    age:         p.age ? String(p.age) : '',
    address:     p.homeAddress  || '',
    contactNo:   p.phoneNumber  || '',
    landlineNo:  '',
    religion:    p.religion     || '',
    nationality: p.nationality  || '',
    civilStatus: p.civilStatus  || 'Single',
    emergencyName:     p.emergencyContact?.name         || '',
    emergencyRelation: p.emergencyContact?.relationship || '',
    emergencyAddress:  p.emergencyContact?.address      || '',
    emergencyContact:  p.emergencyContact?.phone        || '',
    // Vaccination pre-fill
    vax1:         dose('dose1').vaccineName    || '',
    vax1Date:     dose('dose1').date           || '',
    vax1Remarks:  '',
    vax2:         dose('dose2').vaccineName    || '',
    vax2Date:     dose('dose2').date           || '',
    vax2Remarks:  '',
    booster1:     dose('booster1').vaccineName || '',
    booster1Date: dose('booster1').date        || '',
    booster1Remarks: '',
    booster2:     dose('booster2').vaccineName || '',
    booster2Date: dose('booster2').date        || '',
    booster2Remarks: '',
    covidHistory: '',
    otherMedicalHistory: '',
    otherFamilyHistory:  '',
    smoking: 'No', smokingDetails: '',
    alcohol: 'No', alcoholDetails: '',
    drugs:   'No', drugsDetails:   '',
    studentSignature: '',
    dateSigned: new Date().toISOString().split('T')[0],
    q1: 'Yes', q2: 'No', q2Details: '',
    q3: 'No',  q3Details: '',
    q4: 'No',  q4Details: '',
    q5: 'No',  q5b: 'No',
    height: '', weight: '', bmi: '', waist: '', lmp: '',
    labCbc: '', labCbcFacility: '', labCbcDate: '',
    labUa:  '', labUaFacility:  '', labUaDate:  '',
    labXray:'', labXrayFacility:'', labXrayDate:'',
    physician: '', examDate: new Date().toISOString().split('T')[0], nurseOnDuty: '',
  };
};

const defaultForm = () => buildInitialForm(null) || {};

// ─────────────────────────────────────────────────────────────────────────────
export const Medical = ({ selectedPatient, showMessage }) => {
  const [phase, setPhase]               = useState(1);
  const [showSummary, setShowSummary]   = useState(false);
  const [surgicalHistory, setSurgicalHistory] = useState([]);
  const [vitalRecords, setVitalRecords] = useState([]);

  const [checkedMedical, setCheckedMedical] = useState([]);
  const [checkedFamily,  setCheckedFamily]  = useState([]);
  const [checkedHealth,  setCheckedHealth]  = useState([]);

  const [formData, setFormData] = useState(() => buildInitialForm(selectedPatient));

  // Re-populate when selectedPatient changes (e.g. navigating between patients)
  useEffect(() => {
    setFormData(buildInitialForm(selectedPatient));
    setPhase(1);
    setCheckedMedical([]);
    setCheckedFamily([]);
    setCheckedHealth([]);
    setSurgicalHistory([]);
    setVitalRecords([]);
  }, [selectedPatient?.uid]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { id, value, name } = e.target;
    setFormData(prev => ({ ...prev, [id || name]: value }));
  };

  const calculateAge = (e) => {
    const dob = new Date(e.target.value);
    const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970);
    setFormData(prev => ({ ...prev, birthday: e.target.value, age }));
  };

  const calculateBMI = () => {
    const h = parseFloat(formData.height), w = parseFloat(formData.weight);
    if (h && w && h > 0) setFormData(prev => ({ ...prev, bmi: (w / ((h / 100) ** 2)).toFixed(1) }));
  };

  const toggleCheck = (list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const addSurgical    = () => setSurgicalHistory(p => [...p, { id: Date.now(), operation: '', date: '', notes: '' }]);
  const removeSurgical = (id) => setSurgicalHistory(p => p.filter(i => i.id !== id));
  const updateSurgical = (id, field, value) => setSurgicalHistory(p => p.map(i => i.id === id ? { ...i, [field]: value } : i));

  const addVital    = () => setVitalRecords(p => [...p, { id: Date.now(), date: new Date().toISOString().split('T')[0], bp: '', pr: '', rr: '', temp: '', nurse: '', remarks: '' }]);
  const removeVital = (id) => setVitalRecords(p => p.filter(v => v.id !== id));
  const updateVital = (id, field, value) => setVitalRecords(p => p.map(v => v.id === id ? { ...v, [field]: value } : v));

  const handlePhase1Next = () => {
    if (!formData.lastName) { alert("Please fill in patient's last name."); return; }
    setPhase(2);
  };

  const handleOpenSummary = () => {
    if (!formData.lastName) { alert("Please fill in patient's last name."); setPhase(1); return; }
    setShowSummary(true);
  };

  const handleFinalSubmit = () => {
    setShowSummary(false);
    showMessage('Medical record submitted successfully!');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <form onSubmit={e => { e.preventDefault(); handleOpenSummary(); }}>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold text-[#466460] mb-2">
            <span>Phase {phase} of 2</span>
            <span>{phase === 1 ? 'Patient History' : 'Clinical Findings & Labs'}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-[#466460] h-2.5 rounded-full transition-all duration-500" style={{ width: phase === 1 ? '50%' : '100%' }} />
          </div>
        </div>

        {/* ════ PHASE 1 ════ */}
        <div className={phase === 1 ? 'block' : 'hidden'}>

          <div className={sectionClass}>Patient Demographics</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3"><label className={labelClass}>Last Name / Family Name</label><input type="text" id="lastName" className={inputClass} value={formData.lastName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>First Name</label><input type="text" id="firstName" className={inputClass} value={formData.firstName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Middle Name</label><input type="text" id="middleName" className={inputClass} value={formData.middleName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>School Year</label><input type="text" id="schoolYear" className={inputClass} placeholder="e.g. 2024-2025" value={formData.schoolYear} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Student No.</label><input type="text" id="studentId" className={inputClass} value={formData.studentId} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Course</label><input type="text" id="course" className={inputClass} value={formData.course} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Year / Section</label><input type="text" id="yearSection" className={inputClass} value={formData.yearSection} onChange={handleChange} /></div>
            <div className="col-span-3">
              <label className={labelClass}>Sex</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="sex" value="Male"   checked={formData.sex === 'Male'}   onChange={handleChange} /> Male</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="sex" value="Female" checked={formData.sex === 'Female'} onChange={handleChange} /> Female</label>
              </div>
            </div>
            <div className="col-span-2"><label className={labelClass}>Birthday</label><input type="date" id="birthday" className={inputClass} value={formData.birthday} onChange={calculateAge} /></div>
            <div className="col-span-2"><label className={labelClass}>Age</label><input type="number" id="age" className={`${inputClass} bg-slate-50`} value={formData.age} readOnly /></div>
            <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="address" className={inputClass} placeholder="Home Address" value={formData.address} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Contact No.</label><input type="text" id="contactNo" className={inputClass} value={formData.contactNo} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Landline No.</label><input type="text" id="landlineNo" className={inputClass} value={formData.landlineNo} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Religion</label><input type="text" id="religion" className={inputClass} value={formData.religion} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Nationality</label><input type="text" id="nationality" className={inputClass} placeholder="Filipino" value={formData.nationality} onChange={handleChange} /></div>
            <div className="col-span-3">
              <label className={labelClass}>Civil Status</label>
              <select id="civilStatus" className={inputClass} value={formData.civilStatus} onChange={handleChange}>
                {['Single','Married','Widowed','Separated'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className={sectionClass}>Person to Contact in Case of Emergency</div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5"><label className={labelClass}>Name</label><input type="text" id="emergencyName" className={inputClass} placeholder="Full name" value={formData.emergencyName} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Relationship</label><input type="text" id="emergencyRelation" className={inputClass} placeholder="e.g. Parent, Spouse" value={formData.emergencyRelation} onChange={handleChange} /></div>
            <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="emergencyAddress" className={inputClass} value={formData.emergencyAddress} onChange={handleChange} /></div>
            <div className="col-span-4"><label className={labelClass}>Contact No./s</label><input type="text" id="emergencyContact" className={inputClass} value={formData.emergencyContact} onChange={handleChange} /></div>
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
                {[{label:'1st Dose',id:'vax1'},{label:'2nd Dose',id:'vax2'},{label:'Booster (1)',id:'booster1'},{label:'Booster (2)',id:'booster2'}].map(({ label, id }) => (
                  <tr key={id}>
                    <td className="border border-slate-300 p-2 font-semibold whitespace-nowrap">{label}</td>
                    <td className="border border-slate-300 p-2"><input type="text" id={id} className={inputClass} value={formData[id]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id={`${id}Date`} className={inputClass} value={formData[`${id}Date`]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id={`${id}Remarks`} className={inputClass} value={formData[`${id}Remarks`]} onChange={handleChange} /></td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-slate-300 p-2 font-semibold whitespace-nowrap">COVID-19 History</td>
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
                <input type="checkbox" className="w-4 h-4 accent-[#466460]"
                  checked={checkedMedical.includes(c)}
                  onChange={() => toggleCheck(checkedMedical, setCheckedMedical, c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12"><label className={labelClass}>Specify details for checked conditions above</label><input type="text" id="otherMedicalHistory" className={inputClass} placeholder="Additional details, severity, medications taken" value={formData.otherMedicalHistory} onChange={handleChange} /></div>
          </div>

          <div className={sectionClass}>
            <span>Past Surgical History</span>
            <button type="button" onClick={addSurgical} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Add Operation</button>
          </div>
          {surgicalHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 text-center">No surgical history recorded. Click "Add Operation" to add.</p>
          ) : surgicalHistory.map(s => (
            <div key={s.id} className="grid grid-cols-12 gap-4 mb-3 p-3 bg-slate-50 rounded-lg relative border border-slate-200">
              <button type="button" onClick={() => removeSurgical(s.id)} className="absolute top-2 right-2 bg-[#e07a5f] text-white px-2 py-1 rounded text-xs">×</button>
              <div className="col-span-6"><input type="text" placeholder="Operation/Procedure Name" className={inputClass} value={s.operation} onChange={e => updateSurgical(s.id, 'operation', e.target.value)} /></div>
              <div className="col-span-3"><input type="date" className={inputClass} value={s.date} onChange={e => updateSurgical(s.id, 'date', e.target.value)} /></div>
              <div className="col-span-3"><input type="text" placeholder="Hospital / complications" className={inputClass} value={s.notes} onChange={e => updateSurgical(s.id, 'notes', e.target.value)} /></div>
            </div>
          ))}

          <div className={sectionClass}>Family History</div>
          <p className="text-xs text-slate-500 mb-3">Check all that apply in your family:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
            {familyConditions.map(c => (
              <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#466460]"
                  checked={checkedFamily.includes(c)}
                  onChange={() => toggleCheck(checkedFamily, setCheckedFamily, c)} />
                {c}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12"><label className={labelClass}>Specify details for family history</label><input type="text" id="otherFamilyHistory" className={inputClass} placeholder="Specify members affected and other details" value={formData.otherFamilyHistory} onChange={handleChange} /></div>
          </div>

          <div className={sectionClass}>Personal / Social History</div>
          <div className="grid grid-cols-12 gap-4">
            {[
              { label: 'Smoking',       name: 'smoking', detailId: 'smokingDetails', placeholder: 'If yes: Quit? No. of years / days & type'   },
              { label: 'Alcohol',       name: 'alcohol', detailId: 'alcoholDetails', placeholder: 'If yes: Quit? No. of bottles / days & type' },
              { label: 'Illicit Drugs', name: 'drugs',   detailId: 'drugsDetails',   placeholder: 'If yes: Quit? Specify type / frequency'     },
            ].map(({ label, name, detailId, placeholder }) => (
              <div key={name} className="col-span-4">
                <label className={labelClass}>{label}</label>
                <div className="flex gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name={name} value="Yes" checked={formData[name] === 'Yes'} onChange={handleChange} /> Yes</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name={name} value="No"  checked={formData[name] === 'No'}  onChange={handleChange} /> No</label>
                </div>
                <input type="text" id={detailId} className={inputClass} placeholder={placeholder} value={formData[detailId]} onChange={handleChange} />
              </div>
            ))}
          </div>

          <div className={sectionClass}>Patient Photo</div>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-24 h-28 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#466460] hover:text-[#466460] text-slate-400 text-xs transition-colors">
              <i className="fa-solid fa-camera text-xl mb-1"></i>
              <span>1x1 Photo</span>
              <span>Click to upload</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Upload a 1x1 ID photo of the student.</p>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6"><label className={labelClass}>Signature of Student</label><input type="text" id="studentSignature" className={inputClass} placeholder="Type full name as signature" value={formData.studentSignature} onChange={handleChange} /></div>
            <div className="col-span-6"><label className={labelClass}>Date Signed</label><input type="date" id="dateSigned" className={inputClass} value={formData.dateSigned} onChange={handleChange} /></div>
          </div>

          <div className="mt-8 flex justify-end">
            <button type="button" onClick={handlePhase1Next} className="bg-[#466460] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all">
              Next: Clinical Findings →
            </button>
          </div>
        </div>

        {/* ════ PHASE 2 ════ */}
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
                {[
                  { q: '1. Are you in good health?',                                                                      name: 'q1',  detail: null        },
                  { q: '2. Are you under medical treatment now?',                                                          name: 'q2',  detail: 'q2Details' },
                  { q: '3. Have you ever had serious illness or surgical operation/hospitalization in the last 5 years?',  name: 'q3',  detail: 'q3Details' },
                  { q: '4. Are you taking any medication?',                                                                name: 'q4',  detail: 'q4Details' },
                  { q: '5. For women only: Are you pregnant?',                                                             name: 'q5',  detail: null        },
                  { q: 'Are you nursing?',                                                                                  name: 'q5b', detail: null        },
                ].map(({ q, name, detail }) => (
                  <tr key={name}>
                    <td className="border border-slate-300 p-2">{q}</td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={name} value="Yes" checked={formData[name] === 'Yes'} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2 text-center"><input type="radio" name={name} value="No"  checked={formData[name] === 'No'}  onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2">
                      {detail && <input type="text" id={detail} className={inputClass} placeholder="If yes, specify" value={formData[detail]} onChange={handleChange} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>6. Do you have or have you had any of the following?</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50/50 mb-4">
            {healthConditions.map(c => (
              <label key={c} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#466460]"
                  checked={checkedHealth.includes(c)}
                  onChange={() => toggleCheck(checkedHealth, setCheckedHealth, c)} />
                {c}
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
                  <th className="border border-slate-300 p-2 text-left" style={{ width: '140px' }}>Date Reported</th>
                </tr>
              </thead>
              <tbody>
                {[{label:'Complete Blood Count (CBC)',id:'labCbc'},{label:'Urinalysis',id:'labUa'},{label:'Chest X-Ray',id:'labXray'}].map(({ label, id }) => (
                  <tr key={id}>
                    <td className="border border-slate-300 p-2 font-semibold">{label}</td>
                    <td className="border border-slate-300 p-2"><input type="text" id={id} className={inputClass} value={formData[id]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="text" id={`${id}Facility`} className={inputClass} value={formData[`${id}Facility`]} onChange={handleChange} /></td>
                    <td className="border border-slate-300 p-2"><input type="date" id={`${id}Date`} className={inputClass} value={formData[`${id}Date`]} onChange={handleChange} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={sectionClass}>
            <span>Anthropometric Measurements & Vital Signs</span>
            <button type="button" onClick={addVital} className="bg-[#81b29a] text-white px-3 py-1 rounded text-xs hover:opacity-90">+ Add Vital Record</button>
          </div>
          {vitalRecords.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 text-center mb-4">No vital signs recorded. Click "Add Vital Record" to add.</p>
          ) : vitalRecords.map((r, idx) => (
            <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-3 relative">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-[#466460]">Record #{idx + 1}</span>
                <button type="button" onClick={() => removeVital(r.id)} className="bg-[#e07a5f] text-white px-2 py-1 rounded text-xs">×</button>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2"><label className={labelClass}>Date</label><input type="date" className={inputClass} value={r.date} onChange={e => updateVital(r.id, 'date', e.target.value)} /></div>
                <div className="col-span-2"><label className={labelClass}>BP (mmHg)</label><input type="text" className={inputClass} placeholder="120/80" value={r.bp} onChange={e => updateVital(r.id, 'bp', e.target.value)} /></div>
                <div className="col-span-2"><label className={labelClass}>PR (bpm)</label><input type="text" className={inputClass} placeholder="72" value={r.pr} onChange={e => updateVital(r.id, 'pr', e.target.value)} /></div>
                <div className="col-span-2"><label className={labelClass}>RR (cpm)</label><input type="text" className={inputClass} placeholder="18" value={r.rr} onChange={e => updateVital(r.id, 'rr', e.target.value)} /></div>
                <div className="col-span-2"><label className={labelClass}>Temp (°C)</label><input type="text" className={inputClass} placeholder="36.5" value={r.temp} onChange={e => updateVital(r.id, 'temp', e.target.value)} /></div>
                <div className="col-span-2"><label className={labelClass}>Nurse / Staff</label><input type="text" className={inputClass} placeholder="Nurse name" value={r.nurse} onChange={e => updateVital(r.id, 'nurse', e.target.value)} /></div>
                <div className="col-span-12"><label className={labelClass}>Remarks</label><input type="text" className={inputClass} placeholder="Additional notes" value={r.remarks} onChange={e => updateVital(r.id, 'remarks', e.target.value)} /></div>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-12 gap-4 mt-4">
            <div className="col-span-3"><label className={labelClass}>Height (cm)</label><input type="text" id="height" className={inputClass} placeholder="cm" value={formData.height} onChange={handleChange} onBlur={calculateBMI} /></div>
            <div className="col-span-3"><label className={labelClass}>Weight (kg)</label><input type="text" id="weight" className={inputClass} placeholder="kg" value={formData.weight} onChange={handleChange} onBlur={calculateBMI} /></div>
            <div className="col-span-3"><label className={labelClass}>BMI (auto-calc)</label><input type="text" id="bmi" className={`${inputClass} bg-slate-50`} placeholder="kg/m²" value={formData.bmi} readOnly /></div>
            <div className="col-span-3"><label className={labelClass}>Waist Circumference (cm)</label><input type="text" id="waist" className={inputClass} placeholder="cm" value={formData.waist} onChange={handleChange} /></div>
            <div className="col-span-6"><label className={labelClass}>Last Menstrual Period (LMP) — Females only</label><input type="date" id="lmp" className={inputClass} value={formData.lmp} onChange={handleChange} /></div>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-6">
            <div className="col-span-6"><label className={labelClass}>Examining Physician / LIC. No.</label><input type="text" id="physician" className={inputClass} placeholder="Full name and license number" value={formData.physician} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Examination Date</label><input type="date" id="examDate" className={inputClass} value={formData.examDate} onChange={handleChange} /></div>
            <div className="col-span-3"><label className={labelClass}>Nurse on Duty</label><input type="text" id="nurseOnDuty" className={inputClass} placeholder="Nurse name" value={formData.nurseOnDuty} onChange={handleChange} /></div>
          </div>

          <div className="mt-9 px-6 py-5 bg-gradient-to-r from-[#f0f7f6] to-[#e8f2f1] rounded-2xl border border-[#d1e7e5] flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-sm font-bold text-[#466460] m-0">Ready to submit this medical record?</p>
              <p className="text-[11px] text-slate-500 mt-1">Review all entries carefully before submitting.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPhase(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 font-bold text-sm hover:bg-slate-100 transition">
                ← Previous
              </button>
              
              <button type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition shadow-sm">
                <i className="fa-solid fa-paper-plane"></i> Review & Submit
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ═══ SUMMARY MODAL ══════════════════════════════════════════════════ */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[740px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-7 py-5 text-white shrink-0">
              <h3 className="text-lg font-extrabold flex items-center gap-3 mb-1">
                <i className="fa-solid fa-clipboard-check"></i> Medical Examination Summary
              </h3>
              <p className="text-[11px] opacity-70">Review all entries carefully before final submission.</p>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">
              <SumSection icon="fa-user" title="Patient Demographics">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Last Name"      value={formData.lastName} />
                  <SumItem label="First Name"     value={formData.firstName} />
                  <SumItem label="Middle Name"    value={formData.middleName} />
                  <SumItem label="Student No."    value={formData.studentId} />
                  <SumItem label="Course"         value={formData.course} />
                  <SumItem label="Year / Section" value={formData.yearSection} />
                  <SumItem label="School Year"    value={formData.schoolYear} />
                  <SumItem label="Sex"            value={formData.sex} />
                  <SumItem label="Age"            value={String(formData.age)} />
                  <SumItem label="Birthday"       value={formData.birthday} />
                  <SumItem label="Civil Status"   value={formData.civilStatus} />
                  <SumItem label="Nationality"    value={formData.nationality} />
                  <SumItem label="Religion"       value={formData.religion} />
                  <SumItem label="Contact No."    value={formData.contactNo} />
                  <SumItem label="Landline"       value={formData.landlineNo} />
                </div>
                {formData.address && (
                  <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600">
                    <span className="font-bold text-slate-700">Address: </span>{formData.address}
                  </div>
                )}
              </SumSection>

              <SumSection icon="fa-phone-volume" title="Emergency Contact">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Full Name"    value={formData.emergencyName} />
                  <SumItem label="Relationship" value={formData.emergencyRelation} />
                  <SumItem label="Contact No."  value={formData.emergencyContact} />
                  <SumItem label="Address"      value={formData.emergencyAddress} />
                </div>
              </SumSection>

              <SumSection icon="fa-syringe" title="COVID-19 Vaccine History">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        {['Dose','Vaccine','Date','Remarks'].map(h => (
                          <th key={h} className="border border-slate-200 p-2 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[{label:'1st Dose',id:'vax1'},{label:'2nd Dose',id:'vax2'},{label:'Booster (1)',id:'booster1'},{label:'Booster (2)',id:'booster2'}].map(({ label, id }) => (
                        <tr key={id}>
                          <td className="border border-slate-200 p-2 font-semibold">{label}</td>
                          <td className="border border-slate-200 p-2">{formData[id] || '—'}</td>
                          <td className="border border-slate-200 p-2">{formData[`${id}Date`] || '—'}</td>
                          <td className="border border-slate-200 p-2">{formData[`${id}Remarks`] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SumSection>

              <SumSection icon="fa-notes-medical" title="Past Medical History">
                {checkedMedical.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None checked.</p>
                  : <div className="flex flex-wrap gap-1.5">{checkedMedical.map(c => <span key={c} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">{c}</span>)}</div>}
              </SumSection>

              <SumSection icon="fa-scalpel" title={`Past Surgical History — ${surgicalHistory.length} procedure(s)`}>
                {surgicalHistory.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None.</p>
                  : surgicalHistory.map((s, i) => (
                    <div key={s.id} className="grid grid-cols-3 gap-2 mb-2">
                      <SumItem label={`Operation ${i+1}`} value={s.operation} />
                      <SumItem label="Date" value={s.date} />
                      <SumItem label="Notes" value={s.notes} />
                    </div>
                  ))}
              </SumSection>

              <SumSection icon="fa-people-roof" title="Family History">
                {checkedFamily.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None checked.</p>
                  : <div className="flex flex-wrap gap-1.5">{checkedFamily.map(c => <span key={c} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{c}</span>)}</div>}
              </SumSection>

              <SumSection icon="fa-person" title="Personal / Social History">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Smoking"       value={formData.smoking === 'Yes' ? `Yes — ${formData.smokingDetails || 'no details'}` : 'No'} />
                  <SumItem label="Alcohol"       value={formData.alcohol === 'Yes' ? `Yes — ${formData.alcoholDetails || 'no details'}` : 'No'} />
                  <SumItem label="Illicit Drugs" value={formData.drugs   === 'Yes' ? `Yes — ${formData.drugsDetails   || 'no details'}` : 'No'} />
                </div>
              </SumSection>

              <SumSection icon="fa-heart-pulse" title="Health Conditions Checked">
                {checkedHealth.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None checked.</p>
                  : <div className="flex flex-wrap gap-1.5">{checkedHealth.map(c => <span key={c} className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">{c}</span>)}</div>}
              </SumSection>

              <SumSection icon="fa-flask" title="Laboratory Results">
                <div className="grid grid-cols-3 gap-2">
                  {[{label:'CBC',id:'labCbc'},{label:'Urinalysis',id:'labUa'},{label:'Chest X-Ray',id:'labXray'}].map(({ label, id }) => (
                    <SumItem key={id} label={label} value={formData[id]} />
                  ))}
                </div>
              </SumSection>

              <SumSection icon="fa-heart" title={`Vital Signs — ${vitalRecords.length} record(s)`}>
                {vitalRecords.length === 0
                  ? <p className="text-[12px] text-slate-400 italic">None recorded.</p>
                  : vitalRecords.map((r, i) => (
                    <div key={r.id} className="mb-3">
                      <p className="text-[10px] font-bold text-[#466460] uppercase tracking-wider mb-1">Record #{i+1} — {r.date}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <SumItem label="BP"   value={r.bp}    />
                        <SumItem label="PR"   value={r.pr}    />
                        <SumItem label="RR"   value={r.rr}    />
                        <SumItem label="Temp" value={r.temp}  />
                        <SumItem label="Nurse" value={r.nurse} />
                      </div>
                    </div>
                  ))}
              </SumSection>

              <SumSection icon="fa-ruler-vertical" title="Anthropometric Measurements">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Height (cm)"   value={formData.height} />
                  <SumItem label="Weight (kg)"   value={formData.weight} />
                  <SumItem label="BMI (kg/m²)"   value={formData.bmi}    />
                  <SumItem label="Waist (cm)"    value={formData.waist}  />
                  <SumItem label="LMP (Females)" value={formData.lmp}    />
                </div>
              </SumSection>

              <SumSection icon="fa-user-doctor" title="Examining Physician & Staff">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Physician"        value={formData.physician}    />
                  <SumItem label="Examination Date" value={formData.examDate}     />
                  <SumItem label="Nurse on Duty"    value={formData.nurseOnDuty} />
                </div>
              </SumSection>
            </div>
            <div className="px-7 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
              <button onClick={() => setShowSummary(false)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-300 transition">
                <i className="fa-solid fa-pen-to-square mr-2"></i>Edit
              </button>
              <div className="flex-1" />
              <button onClick={handleFinalSubmit} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition shadow-sm">
                <i className="fa-solid fa-circle-check"></i> Submit Medical Record
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Medical;