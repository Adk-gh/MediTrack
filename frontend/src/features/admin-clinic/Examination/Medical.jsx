// frontend/src/features/admin-clinic/Examination/Medical.jsx
import React from 'react';

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

export const Medical = ({
  phase,
  setPhase,
  formData,
  setFormData,
  selectedPatient,
  surgicalHistory,
  setSurgicalHistory,
  vitalRecords,
  setVitalRecords,
  handleChange,
  calculateAge,
  calculateBMI,
  showMessage,
  handleSubmit,
  inputClass,
  labelClass,
  sectionClass
}) => {

  const addSurgicalHistory = () => {
    setSurgicalHistory([...surgicalHistory, { id: Date.now(), operation: '', date: '', notes: '' }]);
  };

  const removeSurgicalHistory = (id) => {
    setSurgicalHistory(surgicalHistory.filter(item => item.id !== id));
  };

  const updateSurgicalHistory = (id, field, value) => {
    setSurgicalHistory(surgicalHistory.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

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

  return (
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
  );
};

export default Medical;