// frontend/src/features/admin-clinic/Examination/Dental.jsx
import React, { useState } from 'react';

const dentalProcedures = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy'
];

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

export const Dental = ({
  dentalFormData,
  setDentalFormData,
  handleDentalChange,
  calculateAge,
  toothData,
  setToothData,
  handleDentalSubmit,
  showMessage,
  inputClass,
  labelClass,
  sectionClass
}) => {
  const [toothModal, setToothModal] = useState({ open: false, toothNum: null });
  const [toothCondition, setToothCondition] = useState('');
  const [toothOperation, setToothOperation] = useState('');

  // State for Intraoral Findings radio buttons
  const [intraoralData, setIntraoralData] = useState({
    gingiva: '',
    oralHygiene: '',
    gingivalColor: '',
    occlusion: '',
    lymph: '',
    status: '',
    otherFindings: '',
    tmjExam: false
  });

  // State for Dental Procedures Yes/No
  const [dentalProcData, setDentalProcData] = useState({});

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

  const handleIntraoralChange = (field, value) => {
    setIntraoralData(prev => ({ ...prev, [field]: value }));
  };

  const handleDentalProcChange = (proc, value) => {
    setDentalProcData(prev => ({ ...prev, [proc]: value }));
  };

  return (
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
                <td className="border border-slate-300 p-2 text-center"><input type="radio" name={`dh_${proc.replace(/\W/g, '')}`} value="Yes" checked={dentalProcData[proc] === 'Yes'} onChange={(e) => handleDentalProcChange(proc, e.target.value)} /></td>
                <td className="border border-slate-300 p-2 text-center"><input type="radio" name={`dh_${proc.replace(/\W/g, '')}`} value="No" checked={dentalProcData[proc] === 'No' || !dentalProcData[proc]} onChange={(e) => handleDentalProcChange(proc, e.target.value)} /></td>
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
                <input type="radio" name="gingiva" value={opt} checked={intraoralData.gingiva === opt} onChange={(e) => handleIntraoralChange('gingiva', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Oral Hygiene</p>
          <div className="flex flex-col gap-2 text-xs mb-3">
            {['Good', 'Fair', 'Poor'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="oralHygiene" value={opt} checked={intraoralData.oralHygiene === opt} onChange={(e) => handleIntraoralChange('oralHygiene', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
          <p className="text-xs font-bold text-[#466460] uppercase mb-2 pb-2 border-b border-[#e0eceb]">Gingival Color</p>
          <div className="flex flex-col gap-2 text-xs">
            {['Bright red', 'Pale'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="gingivalColor" value={opt} checked={intraoralData.gingivalColor === opt} onChange={(e) => handleIntraoralChange('gingivalColor', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Occlusion</p>
          <div className="flex flex-col gap-2 text-xs">
            {['Smooth', 'Overjet', 'Overbite', 'Clicking'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="occlusion" value={opt} checked={intraoralData.occlusion === opt} onChange={(e) => handleIntraoralChange('occlusion', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Lymph Nodes</p>
          <div className="flex flex-col gap-2 text-xs">
            {['Palpable', 'Not Palpable'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="lymph" value={opt} checked={intraoralData.lymph === opt} onChange={(e) => handleIntraoralChange('lymph', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Status</p>
          <div className="flex flex-col gap-2 text-xs">
            {['Hyperplastic', 'Normal'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="status" value={opt} checked={intraoralData.status === opt} onChange={(e) => handleIntraoralChange('status', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">Other Findings</p>
          <div className="flex flex-col gap-2 text-xs mb-2">
            {['Midline Deviation', 'Tooth Wear', 'Trismus'].map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="otherFindings" value={opt} checked={intraoralData.otherFindings === opt} onChange={(e) => handleIntraoralChange('otherFindings', e.target.value)} /> {opt}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" name="tmjExam" checked={intraoralData.tmjExam} onChange={(e) => handleIntraoralChange('tmjExam', e.target.checked)} /> TMJ Examination
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
  );
};

export default Dental;