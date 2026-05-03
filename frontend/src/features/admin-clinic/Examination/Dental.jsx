import React, { useState, useEffect } from 'react';

// ── Static data ────────────────────────────────────────────────────────────────

const dentalProcedures = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction', 'Drug Sensitivity / Allergy',
  'Pulp Therapy', 'Periodontal Therapy', 'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

const permUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const permUpperLeft  = [21, 22, 23, 24, 25, 26, 27, 28];
const permLowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
const permLowerLeft  = [31, 32, 33, 34, 35, 36, 37, 38];
const decidUpperRight = [55, 54, 53, 52, 51];
const decidUpperLeft  = [61, 62, 63, 64, 65];
const decidLowerRight = [85, 84, 83, 82, 81];
const decidLowerLeft  = [71, 72, 73, 74, 75];

const toothConditions = [
  { value: '',               label: 'Free from Caries ( / )' },
  { value: 'caries',         label: 'Caries (C)'                   },
  { value: 'filled',         label: 'Filled (●)'                   },
  { value: 'missing',        label: 'Missing (M)'                  },
  { value: 'extracted',      label: 'Indicated for Extraction (X)' },
  { value: 'root-fragment',  label: 'Root Fragment (RF)'           },
  { value: 'improved',       label: 'Improved (IM)'                },
  { value: 'pontic',         label: 'Pontic (P)'                   },
];

const toothOperations = [
  { value: '',    label: 'None'                          },
  { value: 'AM',  label: 'Amalgam (AM)'                 },
  { value: 'AB',  label: 'Abutment (AB)'                },
  { value: 'SI',  label: 'Silicate Cement (SI)'         },
  { value: 'GI',  label: 'Gold Inlay (GI)'              },
  { value: 'LC',  label: 'Light Cure (LC)'              },
  { value: 'GC',  label: 'Gold Crown (GC)'              },
  { value: 'SSC', label: 'Stainless Steel Crown (SSC)'  },
  { value: 'PJC', label: 'Porcelain Jacket Crown (PJC)' },
  { value: 'TF',  label: 'Temporary Filling (TF)'       },
  { value: 'DC',  label: 'Dowel Crown (DC)'             },
  { value: 'SNT', label: 'Supernumerary Tooth (SNT)'    },
  { value: 'PP',  label: 'Periodontal Pocket (PP)'      },
  { value: 'CA',  label: 'Cervical Abrasion (CA)'       },
  { value: 'R',   label: 'Restorable (R)'               },
];

// ── Shared style tokens ────────────────────────────────────────────────────────
const inputClass   = "w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#466460]/10 transition-all bg-white";
const labelClass   = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1";
const sectionClass = "bg-slate-50 border-l-4 border-[#466460] px-4 py-2 text-xs font-bold uppercase my-4 flex justify-between items-center text-slate-700";

// ── Tooth condition → style map ────────────────────────────────────────────────
const toothConditionStyle = {
  caries:          'bg-red-100 border-red-400 text-red-600',
  filled:          'bg-yellow-100 border-yellow-500 text-yellow-700',
  missing:         'bg-slate-100 border-slate-400 text-slate-500',
  extracted:       'bg-pink-100 border-pink-400 text-pink-700',
  'root-fragment': 'bg-amber-100 border-amber-400 text-amber-700',
  improved:        'bg-blue-100 border-blue-400 text-blue-700',
  pontic:          'bg-purple-100 border-purple-400 text-purple-700',
};

const conditionLabel = { caries: 'C', filled: '●', missing: 'M', extracted: 'X', 'root-fragment': 'RF', improved: 'IM', pontic: 'P' };

const summaryBadgeStyle = {
  caries:          'bg-red-100 text-red-700 border-red-200',
  filled:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  missing:         'bg-slate-100 text-slate-600 border-slate-200',
  extracted:       'bg-pink-100 text-pink-700 border-pink-200',
  'root-fragment': 'bg-amber-100 text-amber-700 border-amber-200',
  improved:        'bg-blue-100 text-blue-700 border-blue-200',
  pontic:          'bg-purple-100 text-purple-700 border-purple-200',
};

// ── Sub-components ─────────────────────────────────────────────────────────────
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
      <i className={`fa-solid ${icon} text-[#466460]`}></i> {title}
    </h4>
    {children}
  </div>
);

// ── Helper: build initial dental form from patient ─────────────────────────────
const buildDentalForm = (p) => {
  const lastName  = p?.lastName  || (p?.name ? p.name.split(', ')[0] : '');
  const firstName = p?.firstName || (p?.name ? (p.name.split(', ')[1] || '') : '');

  // Pull vaccination dates from the structured vaccinations object
  const vax = p?.vaccinations || {};
  const vaxDate = (key) => vax[key]?.date || '';

  return {
    dLastName:   lastName,
    dFirstName:  firstName,
    dMiddle:     p?.middleInitial || '',
    dSex:        p?.gender || p?.sex || 'Male',
    dAge:        p?.age ? String(p.age) : '',
    dBirthday:   p?.birthday || p?.birthdate || '',
    dAddress:    p?.homeAddress || '',
    dCellphone:  p?.phoneNumber || '',
    dCourseYear: [p?.program || p?.prog || '', p?.yearLevel || p?.year || '', p?.section || ''].filter(Boolean).join(' '),
    dOfficeAddress: '', dTelNo: '', dNationality: p?.nationality || 'Filipino',
    dLastVisit: '', dPrevDentist: '', dPhysician: '',
    dTeethUpper: '', dTeethLower: '',
    dVax1Date:      vaxDate('dose1'),
    dVax2Date:      vaxDate('dose2'),
    dBoosterDate:   vaxDate('booster1'),
    dPatientSig: '', dSigDate: new Date().toISOString().split('T')[0], dExaminedBy: '',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
export const Dental = ({ selectedPatient, showMessage }) => {
  const [toothData, setToothData]           = useState({});
  const [toothModal, setToothModal]         = useState({ open: false, toothNum: null });
  const [toothCondition, setToothCondition] = useState('');
  const [toothOperation, setToothOperation] = useState('');
  const [showSummary, setShowSummary]       = useState(false);
  const [dentalHistory, setDentalHistory]   = useState(
    Object.fromEntries(dentalProcedures.map(p => [p, 'No']))
  );
  const [intraoral, setIntraoral] = useState({
    gingiva: '', oralHygiene: '', gingivalColor: '',
    occlusion: '', lymph: '', status: '', otherFindings: '', tmjExam: false,
  });

  const [dentalFormData, setDentalFormData] = useState(() => buildDentalForm(selectedPatient));

  // Re-populate when selectedPatient changes
  useEffect(() => {
    setDentalFormData(buildDentalForm(selectedPatient));
    setToothData({});
    setDentalHistory(Object.fromEntries(dentalProcedures.map(p => [p, 'No'])));
    setIntraoral({ gingiva: '', oralHygiene: '', gingivalColor: '', occlusion: '', lymph: '', status: '', otherFindings: '', tmjExam: false });
  }, [selectedPatient?.uid]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDentalChange = (e) => {
    const { id, value, name } = e.target;
    setDentalFormData(prev => ({ ...prev, [id || name]: value }));
  };

  const openToothModal = (num) => {
    setToothModal({ open: true, toothNum: num });
    setToothCondition(toothData[num]?.condition || '');
    setToothOperation(toothData[num]?.operation || '');
  };

  const saveToothStatus = () => {
    if (toothModal.toothNum) {
      setToothData(prev => ({
        ...prev,
        [toothModal.toothNum]: { condition: toothCondition, operation: toothOperation },
      }));
      setToothModal({ open: false, toothNum: null });
      showMessage('Tooth status updated');
    }
  };

  const getToothLabel = (num) => conditionLabel[toothData[num]?.condition] || '/';
  const getToothClass = (num) => toothConditionStyle[toothData[num]?.condition] || 'bg-white border-slate-300 text-slate-400';

  const renderToothRow = (teeth) => teeth.map(n => (
    <div key={n} className="flex flex-col items-center">
      <span className="text-[9px] text-slate-500 mb-1">{n}</span>
      <div
        className={`w-7 h-7 border-2 flex items-center justify-center cursor-pointer text-[10px] font-bold rounded transition-all hover:scale-110 ${getToothClass(n)}`}
        onClick={() => openToothModal(n)}
        title={`Tooth #${n}`}
      >
        {getToothLabel(n)}
      </div>
    </div>
  ));

  const affectedTeeth = Object.entries(toothData)
    .filter(([, d]) => d?.condition)
    .map(([num, d]) => ({ num, condition: d.condition, operation: d.operation }));

  const handleFinalSubmit = () => {
    setShowSummary(false);
    showMessage('Dental record submitted successfully!');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <form onSubmit={e => { e.preventDefault(); setShowSummary(true); }}>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#466460]">
            <i className="fa-solid fa-tooth mr-2"></i>Student Dental Record
          </h2>
        </div>

        {/* ─── Patient Information ─────────────────────────────────────────── */}
        <div className={sectionClass}>Patient Information</div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3"><label className={labelClass}>Last Name</label><input type="text" id="dLastName" className={inputClass} value={dentalFormData.dLastName} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>First Name</label><input type="text" id="dFirstName" className={inputClass} value={dentalFormData.dFirstName} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Middle Name</label><input type="text" id="dMiddle" className={inputClass} value={dentalFormData.dMiddle} onChange={handleDentalChange} /></div>
          <div className="col-span-3">
            <label className={labelClass}>Sex</label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="dSex" value="Male"   checked={dentalFormData.dSex === 'Male'}   onChange={handleDentalChange} /> Male</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="dSex" value="Female" checked={dentalFormData.dSex === 'Female'} onChange={handleDentalChange} /> Female</label>
            </div>
          </div>
          <div className="col-span-2"><label className={labelClass}>Age</label><input type="number" id="dAge" className={inputClass} value={dentalFormData.dAge} onChange={handleDentalChange} /></div>
          <div className="col-span-2"><label className={labelClass}>Birthday</label><input type="date" id="dBirthday" className={inputClass} value={dentalFormData.dBirthday} onChange={handleDentalChange} /></div>
          <div className="col-span-4"><label className={labelClass}>Address</label><input type="text" id="dAddress" className={inputClass} value={dentalFormData.dAddress} onChange={handleDentalChange} /></div>
          <div className="col-span-4"><label className={labelClass}>Cellphone No.</label><input type="text" id="dCellphone" className={inputClass} value={dentalFormData.dCellphone} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Course / Year / Section</label><input type="text" id="dCourseYear" className={inputClass} value={dentalFormData.dCourseYear} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Office Address</label><input type="text" id="dOfficeAddress" className={inputClass} value={dentalFormData.dOfficeAddress} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Tel. No.</label><input type="text" id="dTelNo" className={inputClass} value={dentalFormData.dTelNo} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Nationality</label><input type="text" id="dNationality" className={inputClass} value={dentalFormData.dNationality} onChange={handleDentalChange} /></div>
        </div>

        {/* ─── Dental History ───────────────────────────────────────────────── */}
        <div className={sectionClass}>Dental History</div>
        <div className="grid grid-cols-12 gap-4 mb-4">
          <div className="col-span-4"><label className={labelClass}>Last Dental Visit</label><input type="date" id="dLastVisit" className={inputClass} value={dentalFormData.dLastVisit} onChange={handleDentalChange} /></div>
          <div className="col-span-4"><label className={labelClass}>Previous Dentist: Dr.</label><input type="text" id="dPrevDentist" className={inputClass} value={dentalFormData.dPrevDentist} onChange={handleDentalChange} /></div>
        </div>
        <p className="text-xs font-bold text-slate-700 mb-3">Dental History — Check if applicable (Yes / No):</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">Dental Procedure</th>
                <th className="border border-slate-300 p-2 text-center w-16">Yes</th>
                <th className="border border-slate-300 p-2 text-center w-16">No</th>
              </tr>
            </thead>
            <tbody>
              {dentalProcedures.map(proc => (
                <tr key={proc}>
                  <td className="border border-slate-300 p-2 font-medium">{proc}</td>
                  <td className="border border-slate-300 p-2 text-center">
                    <input type="radio" name={`dh_${proc.replace(/\W/g,'')}`} value="Yes"
                      checked={dentalHistory[proc] === 'Yes'}
                      onChange={() => setDentalHistory(prev => ({ ...prev, [proc]: 'Yes' }))} />
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <input type="radio" name={`dh_${proc.replace(/\W/g,'')}`} value="No"
                      checked={dentalHistory[proc] === 'No'}
                      onChange={() => setDentalHistory(prev => ({ ...prev, [proc]: 'No' }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── Medical History ──────────────────────────────────────────────── */}
        <div className={sectionClass}>Medical History (Dental)</div>
        <div className="mb-4">
          <label className={labelClass}>Name of Physician: Dr.</label>
          <input type="text" id="dPhysician" className={inputClass} value={dentalFormData.dPhysician} onChange={handleDentalChange} />
        </div>

        {/* ─── Intraoral Findings ───────────────────────────────────────────── */}
        <div className={sectionClass}>Intraoral Findings</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { name: 'gingiva',       title: 'Consistency of Gingiva', opts: ['Firm','Good','Pink','Palpable','Class (Molar)','Pain'] },
            { name: 'oralHygiene',   title: 'Oral Hygiene',           opts: ['Good','Fair','Poor'] },
            { name: 'gingivalColor', title: 'Gingival Color',         opts: ['Bright red','Pale'] },
            { name: 'occlusion',     title: 'Occlusion',              opts: ['Smooth','Overjet','Overbite','Clicking'] },
            { name: 'lymph',         title: 'Lymph Nodes',            opts: ['Palpable','Not Palpable'] },
            { name: 'status',        title: 'Status',                 opts: ['Hyperplastic','Normal'] },
            { name: 'otherFindings', title: 'Other Findings',         opts: ['Midline Deviation','Tooth Wear','Trismus'] },
          ].map(({ name, title, opts }) => (
            <div key={name} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold text-[#466460] uppercase mb-3 pb-2 border-b border-[#e0eceb]">{title}</p>
              <div className="flex flex-col gap-2 text-xs">
                {opts.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={`intra_${name}`} value={opt}
                      checked={intraoral[name] === opt}
                      onChange={() => setIntraoral(prev => ({ ...prev, [name]: opt }))} />
                    {opt}
                  </label>
                ))}
              </div>
              {name === 'otherFindings' && (
                <label className="flex items-center gap-2 text-xs cursor-pointer mt-2">
                  <input type="checkbox" checked={intraoral.tmjExam}
                    onChange={e => setIntraoral(prev => ({ ...prev, tmjExam: e.target.checked }))} />
                  TMJ Examination
                </label>
              )}
            </div>
          ))}
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

        {/* ─── COVID-19 Vaccine ─────────────────────────────────────────────── */}
        <div className={sectionClass}>COVID-19 Vaccine (Dental Record)</div>
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-3"><label className={labelClass}>First Dose Date</label><input type="date" id="dVax1Date" className={inputClass} value={dentalFormData.dVax1Date} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Second Dose Date</label><input type="date" id="dVax2Date" className={inputClass} value={dentalFormData.dVax2Date} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Booster Dose Date</label><input type="date" id="dBoosterDate" className={inputClass} value={dentalFormData.dBoosterDate} onChange={handleDentalChange} /></div>
        </div>

        {/* ─── Patient Dental Chart ─────────────────────────────────────────── */}
        <div className={sectionClass}>Patient Dental Chart</div>
        <p className="text-xs text-slate-500 mb-3">Click on any tooth to set its condition and operation.</p>

        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mb-4">
          {[
            { label: 'Deciduous Teeth (Upper)', right: decidUpperRight, left: decidUpperLeft  },
            { label: 'Deciduous Teeth (Lower)', right: decidLowerRight, left: decidLowerLeft  },
            { label: 'Permanent Teeth (Upper)', right: permUpperRight,  left: permUpperLeft   },
            { label: 'Permanent Teeth (Lower)', right: permLowerRight,  left: permLowerLeft   },
          ].map(({ label, right, left }) => (
            <div key={label} className="mb-4">
              <p className="text-xs font-bold text-[#466460] uppercase text-center py-2 bg-slate-100 rounded">{label}</p>
              <div className="flex justify-center gap-1 my-2">
                {renderToothRow(right)}
                <span className="mx-4" />
                {renderToothRow(left)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-400 text-center">
                <div>RIGHT</div><div>LEFT</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Legend ───────────────────────────────────────────────────────── */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="bg-[#e8f2f1] px-4 py-2 border-b border-slate-200">
            <p className="text-[9px] font-extrabold text-[#466460] uppercase tracking-widest">Legend — Condition</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 text-xs">
            {[['white','#86efac','( / ) Free from Caries'],['#fee2e2','#f87171','(C) Caries'],['#fef9c3','#f59e0b','(●) Filled'],['#fce7f3','#f472b6','(X) Indicated for Extraction'],['#fef3c7','#fbbf24','(RF) Root Fragment'],['#dbeafe','#60a5fa','(IM) Improved'],['#ede9fe','#a78bfa','(P) Pontic'],].map(([bg, border, lbl]) => (
              <div key={lbl} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded shrink-0" style={{ background: bg, border: `1.5px solid ${border}` }}></div>
                <span>{lbl}</span>
              </div>
            ))}
          </div>
          <div className="bg-[#e8f2f1] px-4 py-2 border-t border-b border-slate-200">
            <p className="text-[9px] font-extrabold text-[#466460] uppercase tracking-widest">Legend — Operation</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-4 border-r border-slate-200">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">Condition & Miscellaneous</p>
              <div className="flex flex-col gap-2 text-xs">
                {[['IM','Improved'],['X','Extracted'],['RF','Root Fragment'],['R','Restorable'],['SNT','Supernumerary Tooth'],['PP','Periodontal Pocket'],['M','Missing'],['CA','Cervical Abrasion']].map(([code, lbl]) => (
                  <div key={code} className="flex items-center gap-2">
                    <div className="w-6 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center shrink-0">{code}</div>{lbl}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">Crowns, Inlays & Fillings</p>
              <div className="flex flex-col gap-2 text-xs">
                {[['LC','Light Cure'],['GI','Gold Inlay'],['GC','Gold Crown'],['SSC','Stainless Steel Crown'],['RCT','Root Canal Treatment'],['TF','Temporary Filling'],['PJC','Porcelain Jacket Crown'],['DC','Dowel Crown'],['P','Pontic'],['AB','Abutment'],['SI','Silicate Cement'],['AM','Amalgam']].map(([code, lbl]) => (
                  <div key={code} className="flex items-center gap-2">
                    <div className="w-6 h-5 text-[9px] font-bold bg-slate-100 border border-slate-300 rounded flex items-center justify-center shrink-0">{code}</div>{lbl}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Signature ────────────────────────────────────────────────────── */}
        <div className={sectionClass}>Signature & Examiner</div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6"><label className={labelClass}>Patient Signature</label><input type="text" id="dPatientSig" className={inputClass} placeholder="Type full name as signature" value={dentalFormData.dPatientSig} onChange={handleDentalChange} /></div>
          <div className="col-span-3"><label className={labelClass}>Date</label><input type="date" id="dSigDate" className={inputClass} value={dentalFormData.dSigDate} onChange={handleDentalChange} /></div>
          <div className="col-span-6"><label className={labelClass}>Examined By</label><input type="text" id="dExaminedBy" className={inputClass} placeholder="Dentist name and license number" value={dentalFormData.dExaminedBy} onChange={handleDentalChange} /></div>
        </div>

        {/* ─── Action Footer ────────────────────────────────────────────────── */}
        <div className="mt-9 px-6 py-5 bg-gradient-to-r from-[#f0f7f6] to-[#e8f2f1] rounded-2xl border border-[#d1e7e5] flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-sm font-bold text-[#466460] m-0">Ready to submit this dental record?</p>
            <p className="text-[11px] text-slate-500 mt-1">Review all entries carefully before submitting.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowSummary(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-[1.5px] border-[#466460] bg-[#e0eceb] text-[#466460] font-bold text-sm hover:bg-[#d1e7e5] transition-all">
              <i className="fa-solid fa-eye"></i> Review Summary
            </button>
            <button type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition-all shadow-sm">
              <i className="fa-solid fa-paper-plane"></i> Review & Submit
            </button>
          </div>
        </div>
      </form>

      {/* ═══ DENTAL SUMMARY MODAL ══════════════════════════════════════════ */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-[740px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-7 py-5 text-white shrink-0">
              <h3 className="text-lg font-extrabold flex items-center gap-3 mb-1">
                <i className="fa-solid fa-tooth"></i> Dental Record Summary
              </h3>
              <p className="text-[11px] opacity-70">Review all entries carefully before submitting.</p>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">
              <SumSection icon="fa-user" title="Patient Information">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Last Name"       value={dentalFormData.dLastName}   />
                  <SumItem label="First Name"      value={dentalFormData.dFirstName}  />
                  <SumItem label="Middle Name"     value={dentalFormData.dMiddle}     />
                  <SumItem label="Sex"             value={dentalFormData.dSex}        />
                  <SumItem label="Age"             value={dentalFormData.dAge}        />
                  <SumItem label="Birthday"        value={dentalFormData.dBirthday}   />
                  <SumItem label="Address"         value={dentalFormData.dAddress}    />
                  <SumItem label="Cellphone"       value={dentalFormData.dCellphone}  />
                  <SumItem label="Course/Yr/Sec"   value={dentalFormData.dCourseYear} />
                  <SumItem label="Nationality"     value={dentalFormData.dNationality}/>
                </div>
              </SumSection>

              <SumSection icon="fa-clock-rotate-left" title="Dental History">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <SumItem label="Last Dental Visit" value={dentalFormData.dLastVisit}   />
                  <SumItem label="Previous Dentist"  value={dentalFormData.dPrevDentist ? `Dr. ${dentalFormData.dPrevDentist}` : ''} />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Procedures</p>
                <div className="flex flex-wrap gap-1.5">
                  {dentalProcedures.map(proc => (
                    <span key={proc} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border ${dentalHistory[proc] === 'Yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      <i className={`fa-solid ${dentalHistory[proc] === 'Yes' ? 'fa-check' : 'fa-xmark'} text-[9px]`}></i>
                      {proc}
                    </span>
                  ))}
                </div>
              </SumSection>

              <SumSection icon="fa-magnifying-glass" title="Intraoral Findings">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Consistency of Gingiva" value={intraoral.gingiva}       />
                  <SumItem label="Oral Hygiene"           value={intraoral.oralHygiene}   />
                  <SumItem label="Gingival Color"         value={intraoral.gingivalColor} />
                  <SumItem label="Occlusion"              value={intraoral.occlusion}     />
                  <SumItem label="Lymph Nodes"            value={intraoral.lymph}         />
                  <SumItem label="Status"                 value={intraoral.status}        />
                  <SumItem label="Other Findings"         value={intraoral.otherFindings} />
                  <SumItem label="TMJ Examination"        value={intraoral.tmjExam ? 'Yes' : 'No'} />
                </div>
              </SumSection>

              <SumSection icon="fa-syringe" title="COVID-19 Vaccine Dates">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="First Dose"   value={dentalFormData.dVax1Date}    />
                  <SumItem label="Second Dose"  value={dentalFormData.dVax2Date}    />
                  <SumItem label="Booster Dose" value={dentalFormData.dBoosterDate} />
                </div>
              </SumSection>

              <SumSection icon="fa-teeth" title={`Dental Chart — ${affectedTeeth.length} tooth/teeth with noted conditions`}>
                {affectedTeeth.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">All teeth recorded as free from caries.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {affectedTeeth.map(({ num, condition, operation }) => (
                      <div key={num} className="flex items-center gap-3 text-[11px]">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">{num}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${summaryBadgeStyle[condition] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {conditionLabel[condition] || condition}
                        </span>
                        <span className="text-slate-600">{toothConditions.find(c => c.value === condition)?.label || condition}</span>
                        {operation && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">{operation}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SumSection>

              <SumSection icon="fa-signature" title="Signature & Examiner">
                <div className="grid grid-cols-3 gap-2">
                  <SumItem label="Patient Signature" value={dentalFormData.dPatientSig} />
                  <SumItem label="Date"              value={dentalFormData.dSigDate}    />
                  <SumItem label="Examined By"       value={dentalFormData.dExaminedBy} />
                </div>
              </SumSection>
            </div>
            <div className="px-7 py-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
              <button onClick={() => setShowSummary(false)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-300 transition">
                <i className="fa-solid fa-pen-to-square mr-2"></i>Edit
              </button>
              <div className="flex-1" />
              <button onClick={handleFinalSubmit} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#466460] text-white font-bold text-sm hover:bg-[#3a524f] transition shadow-sm">
                <i className="fa-solid fa-circle-check"></i> Submit Dental Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOOTH MODAL ════════════════════════════════════════════════════ */}
      {toothModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[320px] shadow-2xl">
            <h3 className="text-lg font-bold text-[#466460] mb-4">Tooth #{toothModal.toothNum}</h3>
            <div className="mb-3">
              <label className={labelClass}>Condition</label>
              <select className={inputClass} value={toothCondition} onChange={e => setToothCondition(e.target.value)}>
                {toothConditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className={labelClass}>Operation / Restoration</label>
              <select className={inputClass} value={toothOperation} onChange={e => setToothOperation(e.target.value)}>
                {toothOperations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={saveToothStatus} className="flex-1 bg-[#466460] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3a524f] transition">Save</button>
              <button type="button" onClick={() => setToothModal({ open: false, toothNum: null })} className="flex-1 bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dental;