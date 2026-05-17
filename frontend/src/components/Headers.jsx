// C:\Users\HP\MediTrack\frontend\src\components\Headers.jsx

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service.js';
import { useLoading } from '../context/LoadingContext.jsx';
import DatePicker from './Datepicker.jsx';
import { NotificationBell, NotificationPanel } from './Notifications.jsx';
import notificationsService from '../services/notifications.service.js';
import Settings from './Settings.jsx';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

export const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const ConsultIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const RecordsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export const AccountIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const ExamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export const AnnouncementIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ApprovalsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const DefaultIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

// ─── Dental History static data ───────────────────────────────────────────────
const DENTAL_PROCEDURES = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction',
  'Drug Sensitivity / Allergy', 'Pulp Therapy', 'Periodontal Therapy',
  'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

const INTRAORAL_FIELDS = [
  { name: 'gingiva',       title: 'Consistency of Gingiva', opts: ['Firm','Good','Pink','Palpable','Class (Molar)','Pain'] },
  { name: 'oralHygiene',   title: 'Oral Hygiene',           opts: ['Good','Fair','Poor'] },
  { name: 'gingivalColor', title: 'Gingival Color',         opts: ['Bright red','Pale'] },
  { name: 'occlusion',     title: 'Occlusion',              opts: ['Smooth','Overjet','Overbite','Clicking'] },
  { name: 'lymph',         title: 'Lymph Nodes',            opts: ['Palpable','Not Palpable'] },
  { name: 'status',        title: 'Status',                 opts: ['Hyperplastic','Normal'] },
  { name: 'otherFindings', title: 'Other Findings',         opts: ['Midline Deviation','Tooth Wear','Trismus'] },
];

const TOOTH_CONDITIONS = [
  { value: '',               label: '( / ) Free from Caries' },
  { value: 'caries',         label: '(C) Caries'             },
  { value: 'filled',         label: '(●) Filled'             },
  { value: 'missing',        label: '(M) Missing'            },
  { value: 'extracted',      label: '(X) For Extraction'     },
  { value: 'root-fragment',  label: '(RF) Root Fragment'     },
  { value: 'improved',       label: '(IM) Improved'          },
  { value: 'pontic',         label: '(P) Pontic'             },
];

const TOOTH_OPERATIONS = [
  { value: '',    label: 'None'                          },
  { value: 'AM',  label: 'Amalgam (AM)'                  },
  { value: 'AB',  label: 'Abutment (AB)'                 },
  { value: 'SI',  label: 'Silicate Cement (SI)'          },
  { value: 'GI',  label: 'Gold Inlay (GI)'               },
  { value: 'LC',  label: 'Light Cure (LC)'               },
  { value: 'GC',  label: 'Gold Crown (GC)'               },
  { value: 'SSC', label: 'Stainless Steel Crown (SSC)'  },
  { value: 'PJC', label: 'Porcelain Jacket Crown (PJC)' },
  { value: 'TF',  label: 'Temporary Filling (TF)'        },
  { value: 'DC',  label: 'Dowel Crown (DC)'              },
  { value: 'SNT', label: 'Supernumerary Tooth (SNT)'    },
  { value: 'PP',  label: 'Periodontal Pocket (PP)'      },
  { value: 'CA',  label: 'Cervical Abrasion (CA)'        },
  { value: 'R',   label: 'Restorable (R)'                },
];

const TOOTH_CONDITION_STYLE = {
  caries:          'bg-red-100 border-red-400 text-red-600',
  filled:          'bg-yellow-100 border-yellow-500 text-yellow-700',
  missing:         'bg-slate-100 border-slate-400 text-slate-500',
  extracted:       'bg-pink-100 border-pink-400 text-pink-700',
  'root-fragment': 'bg-amber-100 border-amber-400 text-amber-700',
  improved:        'bg-blue-100 border-blue-400 text-blue-700',
  pontic:          'bg-purple-100 border-purple-400 text-purple-700',
};

const TOOTH_CONDITION_LABEL = {
  caries: 'C', filled: '●', missing: 'M', extracted: 'X',
  'root-fragment': 'RF', improved: 'IM', pontic: 'P',
};

const PERM_UPPER_RIGHT  = [18,17,16,15,14,13,12,11];
const PERM_UPPER_LEFT   = [21,22,23,24,25,26,27,28];
const PERM_LOWER_RIGHT  = [48,47,46,45,44,43,42,41];
const PERM_LOWER_LEFT   = [31,32,33,34,35,36,37,38];
const DECID_UPPER_RIGHT = [55,54,53,52,51];
const DECID_UPPER_LEFT  = [61,62,63,64,65];
const DECID_LOWER_RIGHT = [85,84,83,82,81];
const DECID_LOWER_LEFT  = [71,72,73,74,75];

const emptyDentalHistory = () => ({
  lastVisit: '', prevDentist: '', physician: '',
  teethUpper: '', teethLower: '', notes: '',
  procedures: Object.fromEntries(DENTAL_PROCEDURES.map(p => [p, 'No'])),
  intraoral: { gingiva:'', oralHygiene:'', gingivalColor:'', occlusion:'', lymph:'', status:'', otherFindings:'', tmjExam: false },
  toothData: {},
});

// ── Mini tooth-modal inside the drawer ────────────────────────────────────────
function DrawerToothModal({ num, toothData, onSave, onClose }) {
  const [cond, setCond] = React.useState(toothData[num]?.condition || '');
  const [op,   setOp]   = React.useState(toothData[num]?.operation  || '');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div className="bg-white p-5 rounded-2xl w-[290px] shadow-2xl">
        <h4 className="text-sm font-bold text-[#466460] mb-3">Tooth #{num}</h4>
        <div className="mb-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Condition</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#466460]" value={cond} onChange={e => setCond(e.target.value)}>
            {TOOTH_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operation / Restoration</label>
          <select className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#466460]" value={op} onChange={e => setOp(e.target.value)}>
            {TOOTH_OPERATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(num, cond, op)} className="flex-1 bg-[#466460] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#3a524f]">Save</button>
          <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-semibold hover:bg-slate-200">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Dental History section inside the ProfileDrawer ───────────────────────────
function DentalHistoryDrawerSection({ dentalHistory, isEditing, onUpdate }) {
  const dh = { ...emptyDentalHistory(), ...dentalHistory };
  const [expanded,      setExpanded]      = React.useState(false);
  const [chartExpanded, setChartExpanded] = React.useState(false);
  const [toothModal,    setToothModal]    = React.useState(null);

  const update      = (partial) => onUpdate({ ...dh, ...partial });
  const updateIntra = (partial) => onUpdate({ ...dh, intraoral: { ...dh.intraoral, ...partial } });
  const updateProc  = (proc, val) => onUpdate({ ...dh, procedures: { ...dh.procedures, [proc]: val } });
  const saveToothModal = (num, cond, op) => {
    onUpdate({ ...dh, toothData: { ...dh.toothData, [num]: { condition: cond, operation: op } } });
    setToothModal(null);
  };

  const inputCls = "flex-1 min-w-0 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#466460] focus:ring-1 focus:ring-[#466460] text-slate-800 text-xs transition-all";
  const rowCls   = "flex items-center justify-between py-2 text-xs border-b border-slate-50 last:border-0 gap-3 min-h-[38px]";
  const lCls     = "flex items-center gap-2 text-slate-500 shrink-0 min-w-[118px]";

  const affectedCount = Object.values(dh.toothData || {}).filter(d => d?.condition).length;
  const yesCount      = Object.values(dh.procedures || {}).filter(v => v === 'Yes').length;

  const toothRows = [
    { label: 'Deciduous Upper', right: DECID_UPPER_RIGHT, left: DECID_UPPER_LEFT },
    { label: 'Deciduous Lower', right: DECID_LOWER_RIGHT, left: DECID_LOWER_LEFT },
    { label: 'Permanent Upper', right: PERM_UPPER_RIGHT,  left: PERM_UPPER_LEFT  },
    { label: 'Permanent Lower', right: PERM_LOWER_RIGHT,  left: PERM_LOWER_LEFT  },
  ];

  const renderToothRow = (teeth) => teeth.map(n => {
    const cond  = dh.toothData[n]?.condition;
    const label = TOOTH_CONDITION_LABEL[cond] || '/';
    const cls   = TOOTH_CONDITION_STYLE[cond]  || 'bg-white border-slate-300 text-slate-400';
    return (
      <div key={n} className="flex flex-col items-center gap-0.5">
        <span className="text-[7px] text-slate-400">{n}</span>
        <div
          onClick={() => isEditing && setToothModal(n)}
          className={`w-6 h-6 border-2 flex items-center justify-center text-[9px] font-bold rounded transition-all
            ${isEditing ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${cls}`}
          title={`Tooth #${n}`}
        >
          {label}
        </div>
      </div>
    );
  });

  return (
    <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
      <button type="button" onClick={() => setExpanded(p => !p)} className="w-full flex items-center justify-between mb-2 group">
        <div className="text-[9px] font-extrabold uppercase tracking-widest text-[#466460]">
          <i className="fa-solid fa-tooth mr-1.5 opacity-70"></i>Dental History
        </div>
        <div className="flex items-center gap-2">
          {!expanded && yesCount > 0 && (
            <span className="text-[8px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{yesCount} procedure{yesCount > 1 ? 's' : ''}</span>
          )}
          {!expanded && affectedCount > 0 && (
            <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{affectedCount} tooth note{affectedCount > 1 ? 's' : ''}</span>
          )}
          <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-[10px] text-slate-400 group-hover:text-[#466460] transition-colors`}></i>
        </div>
      </button>

      {!expanded && (
        <p className="text-[10px] text-slate-400 italic">
          {dh.lastVisit ? `Last visit: ${dh.lastVisit}` : 'No dental history recorded.'}
        </p>
      )}

      {expanded && (
        <div>
          <div className={rowCls}>
            <div className={lCls}><i className="fa-solid fa-calendar-day text-[#466460] w-4 opacity-70"></i><span>Last Visit</span></div>
            {isEditing
              ? <input type="date" className={inputCls} value={dh.lastVisit} onChange={e => update({ lastVisit: e.target.value })} />
              : <span className="font-semibold text-slate-800 text-xs text-right">{dh.lastVisit || '—'}</span>}
          </div>

          <div className={rowCls}>
            <div className={lCls}><i className="fa-solid fa-user-doctor text-[#466460] w-4 opacity-70"></i><span>Previous Dentist</span></div>
            {isEditing
              ? <input type="text" className={inputCls} placeholder="Dr. Last name" value={dh.prevDentist} onChange={e => update({ prevDentist: e.target.value })} />
              : <span className="font-semibold text-slate-800 text-xs text-right">{dh.prevDentist ? `Dr. ${dh.prevDentist}` : '—'}</span>}
          </div>

          <div className={rowCls}>
            <div className={lCls}><i className="fa-solid fa-stethoscope text-[#466460] w-4 opacity-70"></i><span>Physician</span></div>
            {isEditing
              ? <input type="text" className={inputCls} placeholder="Dr. Last name" value={dh.physician} onChange={e => update({ physician: e.target.value })} />
              : <span className="font-semibold text-slate-800 text-xs text-right">{dh.physician ? `Dr. ${dh.physician}` : '—'}</span>}
          </div>

          <div className={rowCls}>
            <div className={lCls}><i className="fa-solid fa-teeth text-[#466460] w-4 opacity-70"></i><span>Teeth Present</span></div>
            {isEditing ? (
              <div className="flex gap-2 items-center">
                <span className="text-[10px] text-slate-400">Upper</span>
                <input type="number" min="0" max="16" className="w-12 p-1.5 border border-slate-200 rounded text-xs text-center bg-slate-50 focus:outline-none focus:border-[#466460]"
                  value={dh.teethUpper} onChange={e => update({ teethUpper: e.target.value })} />
                <span className="text-[10px] text-slate-400">Lower</span>
                <input type="number" min="0" max="16" className="w-12 p-1.5 border border-slate-200 rounded text-xs text-center bg-slate-50 focus:outline-none focus:border-[#466460]"
                  value={dh.teethLower} onChange={e => update({ teethLower: e.target.value })} />
              </div>
            ) : (
              <span className="font-semibold text-slate-800 text-xs">
                {(dh.teethUpper || dh.teethLower) ? `${dh.teethUpper || 0} upper · ${dh.teethLower || 0} lower` : '—'}
              </span>
            )}
          </div>

          <div className="mt-3 mb-1">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Dental Procedures</p>
            <div className="flex flex-col gap-0.5">
              {DENTAL_PROCEDURES.map(proc => {
                const val = dh.procedures?.[proc] ?? 'No';
                return (
                  <div key={proc} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-[11px] text-slate-600">{proc}</span>
                    {isEditing ? (
                      <div className="flex gap-3">
                        {['Yes','No'].map(opt => (
                          <label key={opt} className="flex items-center gap-1 text-[10px] cursor-pointer">
                            <input type="radio"
                              name={`dh_drawer_${proc.replace(/\W/g,'')}`}
                              value={opt}
                              checked={val === opt}
                              onChange={() => updateProc(proc, opt)}
                              className="accent-[#466460]"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${val === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {val}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Intraoral Findings</p>
            <div className="flex flex-col gap-0.5">
              {INTRAORAL_FIELDS.map(({ name, title, opts }) => {
                const val = dh.intraoral?.[name] || '';
                return (
                  <div key={name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 gap-2">
                    <span className="text-[11px] text-slate-600 shrink-0">{title}</span>
                    {isEditing ? (
                      <select
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-[#466460] text-slate-800"
                        value={val}
                        onChange={e => updateIntra({ [name]: e.target.value })}
                      >
                        <option value="">—</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <span className={`text-[11px] font-semibold text-right ${val ? 'text-slate-800' : 'text-slate-300 italic font-normal'}`}>{val || 'Not set'}</span>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11px] text-slate-600">TMJ Examination</span>
                {isEditing ? (
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox"
                      checked={!!dh.intraoral?.tmjExam}
                      onChange={e => updateIntra({ tmjExam: e.target.checked })}
                      className="accent-[#466460] w-4 h-4"
                    />
                    <span className="text-slate-600">Yes</span>
                  </label>
                ) : (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dh.intraoral?.tmjExam ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {dh.intraoral?.tmjExam ? 'Yes' : 'No'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setChartExpanded(p => !p)}
              className="w-full flex items-center justify-between py-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-[#466460] transition-colors"
            >
              <span>Dental Chart{affectedCount > 0 ? ` · ${affectedCount} noted` : ''}</span>
              <i className={`fa-solid fa-chevron-${chartExpanded ? 'up' : 'down'} text-[9px]`}></i>
            </button>

            {chartExpanded && (
              <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3">
                {isEditing && <p className="text-center text-[9px] text-slate-400 mb-2">Tap a tooth to set its condition</p>}
                {toothRows.map(({ label, right, left }) => (
                  <div key={label} className="mb-3">
                    <p className="text-[8px] font-bold text-[#466460] uppercase text-center mb-1.5 bg-slate-50 rounded py-1">{label}</p>
                    <div className="flex justify-center gap-0.5">
                      {renderToothRow(right)}
                      <span className="mx-2" />
                      {renderToothRow(left)}
                    </div>
                    <div className="grid grid-cols-2 text-[7px] text-slate-300 text-center mt-0.5"><div>RIGHT</div><div>LEFT</div></div>
                  </div>
                ))}

                {!isEditing && affectedCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                    {Object.entries(dh.toothData).filter(([,d]) => d?.condition).map(([num, d]) => (
                      <div key={num} className="flex items-center gap-2 text-[10px]">
                        <span className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">{num}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${TOOTH_CONDITION_STYLE[d.condition] || ''}`}>
                          {TOOTH_CONDITION_LABEL[d.condition] || d.condition}
                        </span>
                        <span className="text-slate-500">{TOOTH_CONDITIONS.find(c => c.value === d.condition)?.label}</span>
                        {d.operation && <span className="ml-auto px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600">{d.operation}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3">
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Notes</p>
            {isEditing ? (
              <textarea rows={2} className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#466460] resize-none text-slate-800"
                placeholder="Additional dental notes…"
                value={dh.notes}
                onChange={e => update({ notes: e.target.value })}
              />
            ) : (
              <p className={`text-[11px] ${dh.notes ? 'text-slate-700' : 'text-slate-300 italic'}`}>{dh.notes || 'No notes recorded.'}</p>
            )}
          </div>
        </div>
      )}

      {toothModal && isEditing && (
        <DrawerToothModal
          num={toothModal}
          toothData={dh.toothData || {}}
          onSave={saveToothModal}
          onClose={() => setToothModal(null)}
        />
      )}
    </div>
  );
}

// ─── Profile Drawer ───────────────────────────────────────────────────────────
export function ProfileDrawer({ isOpen, onClose, onLogout, userProfile, forceBottomSheet = false, onProfileUpdate }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({});
  const [showSettings, setShowSettings] = React.useState(false);  // ← NEW

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const sheetRef = React.useRef(null);

  const { showLoading, hideLoading } = useLoading();

  React.useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setFormData(userProfile || {});
      setIsEditing(false);
      setDragY(0);
    }
  }, [isOpen, userProfile]);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || forceBottomSheet);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [forceBottomSheet]);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta < 0) {
      setDragY(delta / 4);
    } else {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);
    const sheetHeight = sheetRef.current?.offsetHeight || window.innerHeight * 0.92;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = dragY / elapsed;
    const DISMISS_THRESHOLD = sheetHeight * 0.3;
    const VELOCITY_THRESHOLD = 0.5;
    if (dragY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!isMounted) return null;

  const userRole = formData.role?.toLowerCase() || 'user';
  const isStudent = userRole === 'student';

  const nameParts = [
    formData.firstName,
    formData.middleInitial ? `${formData.middleInitial}.` : '',
    formData.lastName,
    formData.suffix || '',
  ].filter(Boolean);
  const displayName = nameParts.length > 0 ? nameParts.join(' ') : 'User';

  const vaccineDoseCount = formData.vaccinations
    ? Object.values(formData.vaccinations).filter(d => d?.vaccineName).length
    : 0;

  const VACCINE_DOSE_KEYS = [
    { key: 'dose1',    label: 'Dose 1'    },
    { key: 'dose2',    label: 'Dose 2'    },
    { key: 'booster1', label: 'Booster 1' },
    { key: 'booster2', label: 'Booster 2' },
  ];

  // ── Input Handlers ──────────────────────────────────────────────────────────
  const handleChange = (field, value, nestedField = null) => {
    setFormData(prev => {
      if (nestedField) {
        return { ...prev, [field]: { ...(prev[field] || {}), [nestedField]: value } };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleVaccineChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      vaccinations: {
        ...(prev.vaccinations || {}),
        [key]: { ...(prev.vaccinations?.[key] || {}), [field]: value },
      },
    }));
  };

  const handleDentalHistoryUpdate = (newDh) => {
    setFormData(prev => ({ ...prev, dentalHistory: newDh }));
  };

  const handleSaveProfile = async () => {
    showLoading('Saving profile...', 'light');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditing(false);
        if (onProfileUpdate) onProfileUpdate(result.data);
      } else {
        alert(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while saving.');
    } finally {
      hideLoading();
    }
  };

  // ── UI Components ────────────────────────────────────────────────────────────
  const EditableInfoRow = ({ icon, label, field, nestedField, value, type = 'text', options }) => {
    const displayValue = value || '';
    return (
      <div className="flex items-center justify-between py-2 text-xs border-b border-slate-50 last:border-0 gap-3 min-h-[40px]">
        <div className="flex items-center gap-2.5 text-slate-500 shrink-0 min-w-[110px]">
          <i className={`fa-solid ${icon} text-[#466460] w-4 text-center opacity-70 flex-shrink-0`}></i>
          <span className="whitespace-nowrap">{label}</span>
        </div>
        {isEditing ? (
          options ? (
            <select
              value={displayValue}
              onChange={(e) => handleChange(field, e.target.value, nestedField)}
              className="flex-1 min-w-0 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#466460] focus:ring-1 focus:ring-[#466460] text-slate-800 transition-all"
            >
              <option value="">Select...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={displayValue}
              onChange={(e) => handleChange(field, e.target.value, nestedField)}
              className="flex-1 min-w-0 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#466460] focus:ring-1 focus:ring-[#466460] text-slate-800 transition-all"
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          )
        ) : (
          <span className="font-semibold text-slate-800 text-right break-words min-w-0 flex-1">{displayValue || '—'}</span>
        )}
      </div>
    );
  };

  const SectionHeader = ({ label, color = 'text-slate-400' }) => (
    <div className={`text-[9px] font-extrabold uppercase tracking-widest ${color} mb-3`}>{label}</div>
  );

  const isBottomSheet = isMobile;

  const sheetTransform = isBottomSheet
    ? isOpen
      ? `translateY(${dragY}px)`
      : 'translateY(100%)'
    : isOpen
      ? 'translateX(0)'
      : 'translateX(100%)';

  const backdropOpacity = isBottomSheet && isDragging
    ? Math.max(0, 0.4 - (dragY / (sheetRef.current?.offsetHeight || 700)) * 0.4)
    : 0.4;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[2000]"
        style={{
          background: `rgba(0,0,0,${backdropOpacity})`,
          transition: isDragging ? 'none' : 'background 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Sheet / Drawer */}
      <div
        ref={sheetRef}
        className="fixed z-[2001] bg-white overflow-y-auto scrollbar-none shadow-[-4px_0_30px_rgba(0,0,0,0.15)] flex flex-col"
        onTransitionEnd={() => { if (!isOpen) setIsMounted(false); }}
        style={
          isBottomSheet
            ? {
                bottom: 0, left: 0, right: 0,
                height: '92vh',
                borderRadius: '24px 24px 0 0',
                transform: sheetTransform,
                transition: isDragging ? 'none' : 'transform 0.3s ease-in-out',
                willChange: 'transform',
                touchAction: 'none',
              }
            : {
                top: 0, right: 0, bottom: 0,
                width: '460px', height: '100%',
                borderRadius: 0,
                transform: sheetTransform,
                transition: 'transform 0.3s ease-in-out',
              }
        }
      >
        {/* Drag handle — mobile only */}
        {isBottomSheet && (
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="w-10 h-1 rounded-full transition-colors duration-150"
              style={{ background: isDragging ? '#466460' : '#cbd5e1' }}
            />
          </div>
        )}

        {/* Header */}
        <div
          className="bg-gradient-to-br from-[#466460] to-[#38524d] px-5 sm:px-6 py-6 sm:py-8 text-white relative flex-shrink-0"
          onTouchStart={isBottomSheet ? handleTouchStart : undefined}
          onTouchMove={isBottomSheet ? handleTouchMove : undefined}
          onTouchEnd={isBottomSheet ? handleTouchEnd : undefined}
          style={{ cursor: isBottomSheet ? 'grab' : 'default', userSelect: 'none' }}
        >
          <button
            onClick={onClose}
            className="sm:hidden absolute top-3 left-4 bg-white/10 border-none text-white w-8 h-8 rounded-full cursor-pointer text-sm flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <i className="fa-solid fa-chevron-down"></i>
          </button>

          <button
            onClick={onClose}
            className="hidden sm:flex absolute top-4 right-4 bg-white/20 border-none text-white w-8 h-8 rounded-full cursor-pointer text-sm items-center justify-center hover:bg-white/35 transition-all"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`absolute top-4 ${isMobile ? 'right-4' : 'right-14'} bg-white/10 border-none text-white px-3 py-1.5 rounded-full cursor-pointer text-xs font-semibold flex items-center gap-1.5 hover:bg-white/25 transition-all`}
          >
            <i className={`fa-solid ${isEditing ? 'fa-eye' : 'fa-pen'}`}></i>
            {isEditing ? 'View' : 'Edit'}
          </button>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] rounded-full border-2 border-white/40 overflow-hidden bg-white/10 flex-shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=466460&size=70`}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="First"
                    className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Last"
                    className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:border-white"
                  />
                </div>
              ) : (
                <h2 className="text-lg sm:text-xl font-extrabold mb-0.5 break-words leading-tight">{displayName}</h2>
              )}
              <p className="text-xs opacity-75 truncate">{formData.email || 'No email provided'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase">
                  {formData.role || 'USER'}
                </span>
                {formData.universityId && (
                  <span className="inline-block bg-white/10 px-3 py-1 rounded-full text-[9px] font-bold tracking-wide font-mono">
                    {formData.universityId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Personal Details ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <SectionHeader label="Personal Details" />

            {isEditing ? (
              <div className="flex items-center justify-between py-2 text-xs border-b border-slate-50 gap-3 min-h-[40px]">
                <div className="flex items-center gap-2.5 text-slate-500 shrink-0 min-w-[110px]">
                  <i className="fa-solid fa-cake-candles text-[#466460] w-4 text-center opacity-70 flex-shrink-0"></i>
                  <span className="whitespace-nowrap">Birthday</span>
                </div>
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={formData.birthday || ''}
                    onChange={(val) => handleChange('birthday', val)}
                  />
                </div>
              </div>
            ) : (
              <EditableInfoRow icon="fa-cake-candles" label="Birthday" field="birthday" value={formData.birthday} />
            )}

            <EditableInfoRow icon="fa-hashtag"    label="Age"          field="age"         type="number" value={formData.age} />
            <EditableInfoRow icon="fa-venus-mars" label="Sex"          field="sex"         value={formData.sex}         options={['Male', 'Female']} />
            <EditableInfoRow icon="fa-droplet"    label="Blood Type"   field="bloodType"   value={formData.bloodType}   options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <EditableInfoRow icon="fa-ring"       label="Civil Status" field="civilStatus" value={formData.civilStatus} options={['Single', 'Married', 'Widowed', 'Separated']} />
            <EditableInfoRow icon="fa-church"     label="Religion"     field="religion"    value={formData.religion} />
            <EditableInfoRow icon="fa-flag"       label="Nationality"  field="nationality" value={formData.nationality} />
            <EditableInfoRow icon="fa-house"      label="Home Address" field="homeAddress" value={formData.homeAddress} />
          </div>

          {/* ── Academic / Professional ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <SectionHeader label={isStudent ? 'Academic Information' : 'Professional Information'} />

            <EditableInfoRow
              icon="fa-id-card"
              label={isStudent ? 'Student No.' : 'Employee ID'}
              field="universityId"
              value={formData.universityId}
            />

            {isStudent ? (
              <>
                <EditableInfoRow icon="fa-building"      label="Department" field="department" value={formData.department} />
                <EditableInfoRow icon="fa-graduation-cap" label="Program"   field="program"    value={formData.program} />
                <EditableInfoRow icon="fa-layer-group"   label="Year Level" field="yearLevel"  value={formData.yearLevel} />
                <EditableInfoRow icon="fa-users"         label="Section"    field="section"    value={formData.section} />
              </>
            ) : (
              <>
                <EditableInfoRow icon="fa-user-tie"  label="Classification" field="classification" value={formData.classification} />
                <EditableInfoRow icon="fa-building"  label="Department"     field="department"     value={formData.department} />
                <EditableInfoRow icon="fa-briefcase" label="Job Title"      field="jobTitle"       value={formData.jobTitle} />
              </>
            )}
          </div>

          {/* ── Contact ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <SectionHeader label="Contact Information" />
            <EditableInfoRow icon="fa-phone"    label="Phone Number"  field="phoneNumber" type="tel"   value={formData.phoneNumber} />
            <EditableInfoRow icon="fa-envelope" label="Email Address" field="email"       type="email" value={formData.email} />
          </div>

          {/* ── Emergency Contact ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-red-50/30">
            <SectionHeader label="Emergency Contact" color="text-red-400" />
            <EditableInfoRow icon="fa-address-book"  label="Full Name"    field="emergencyContact" nestedField="name"         value={formData.emergencyContact?.name} />
            <EditableInfoRow icon="fa-heart"         label="Relationship" field="emergencyContact" nestedField="relationship" value={formData.emergencyContact?.relationship} />
            <EditableInfoRow icon="fa-phone-volume"  label="Phone Number" field="emergencyContact" nestedField="phone"        type="tel" value={formData.emergencyContact?.phone} />
            <EditableInfoRow icon="fa-location-dot" label="Address"      field="emergencyContact" nestedField="address"      value={formData.emergencyContact?.address} />
          </div>

          {/* ── COVID-19 Vaccination ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-blue-50/20">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader label="COVID-19 Vaccination" color="text-blue-400" />
              {!isEditing && (
                <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full -mt-3">
                  {vaccineDoseCount} / 5 doses
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {VACCINE_DOSE_KEYS.map(({ key, label }) => {
                const dose = formData.vaccinations?.[key] || {};
                if (!isEditing && !dose.vaccineName) return null;

                return (
                  <div key={key} className="flex flex-col bg-white rounded-lg px-3 py-2 border border-slate-100 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 w-16 text-center">
                        {label}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          placeholder="Vaccine Brand (e.g., Pfizer)"
                          value={dose.vaccineName || ''}
                          onChange={(e) => handleVaccineChange(key, 'vaccineName', e.target.value)}
                          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#466460] text-slate-800"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-700 font-medium truncate flex-1">{dose.vaccineName}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="pl-[72px]">
                        <DatePicker
                          value={dose.date || ''}
                          onChange={(val) => handleVaccineChange(key, 'date', val)}
                        />
                      </div>
                    ) : (
                      dose.date && (
                        <div className="text-[10px] text-slate-400 pl-[72px]">{dose.date}</div>
                      )
                    )}
                  </div>
                );
              })}

              {!isEditing && vaccineDoseCount === 0 && (
                <p className="text-[11px] text-slate-400 italic">No vaccination records on file.</p>
              )}
            </div>
          </div>

          {/* ── Dental History ── */}
          <DentalHistoryDrawerSection
            dentalHistory={formData.dentalHistory || {}}
            isEditing={isEditing}
            onUpdate={handleDentalHistoryUpdate}
          />

        </div>

        {/* ── Footer Actions ── */}
        <div className="px-4 sm:px-6 py-6 border-t border-slate-100 bg-white flex-shrink-0">
          {isEditing ? (
            <div className="flex gap-3 animate-fadeIn">
              <button
                onClick={() => { setFormData(userProfile || {}); setIsEditing(false); }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-[#466460] text-white rounded-xl font-bold text-sm hover:bg-[#38524d] transition-colors shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                Save Changes
              </button>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4 px-1">
                <span>MediTrack v2.4.1</span>
                <span>Server: Online <span className="text-emerald-500 ml-1">✓</span></span>
              </div>

              {/* ── Settings Button ── */}
              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-3 mb-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm cursor-pointer transition-all hover:bg-slate-100 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <i className="fa-solid fa-gear"></i>
                Settings
              </button>

              {/* ── Sign Out Button ── */}
              <button
                onClick={onLogout}
                className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm cursor-pointer transition-all hover:bg-red-100 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Settings Overlay ── */}
      {showSettings && (
        <div className="fixed inset-0 z-[3000]">
          <Settings onLogout={onLogout} onClose={() => setShowSettings(false)} />
        </div>
      )}
    </>
  );
}

// ─── Logout Confirmation Modal ────────────────────────────────────────────────
function LogoutConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[3000] px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl p-6 sm:p-6 shadow-2xl animate-slideUp">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-arrow-right-from-bracket text-2xl text-red-600"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Confirm Logout</h3>
          <p className="text-sm text-slate-500 mt-2">Are you sure you want to log out?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Header ───────────────────────────────────────────────────────────
export const DesktopHeader = ({ onOpenQR }) => {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const authUser = authService.getCurrentUser();
  const [fullProfile, setFullProfile] = useState(authUser || {});

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          showLoading('Session expired', 'light');
          authService.logout();
          hideLoading();
          navigate('/login');
          return;
        }

        const result = await response.json();
        if (result.success && result.data) {
          setFullProfile({ ...authUser, ...result.data });
        }
      } catch (err) {
        console.error('Error fetching full profile for header:', err);
      }
    };

    fetchFullProfile();
  }, [navigate]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayName = (fullProfile.firstName && fullProfile.lastName)
    ? `${fullProfile.firstName} ${fullProfile.lastName}`
    : (fullProfile.name || 'Admin User');
  const displayRole = fullProfile.role || 'Administrator';

  const handleLogoutClick = () => {
    setShowProfileDrawer(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    showLoading('Signing out', 'light');
    authService.logout();
    hideLoading();
    navigate('/login');
  };

  return (
    <>
      <header className="
        bg-gradient-to-br from-[#466460] to-[#38524d]
        flex items-center justify-between
        shadow-lg z-20 border-b border-white/10
        px-3 py-2
        sm:px-5 sm:py-0
        lg:px-6
      ">
        <img
          src="/logo1.jpg"
          alt="MediTrack Logo"
          className="w-[110px] h-[44px] sm:w-[160px] sm:h-[58px] lg:w-[200px] lg:h-[70px] object-contain"
          onError={e => { e.target.src = 'https://placehold.co/200x70/466460/white?text=MediTrack'; }}
        />

        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell
            onClick={() => setShowNotifications(true)}
            count={unreadCount}
          />

          <div className="flex items-center gap-2 sm:gap-3 sm:border-l sm:border-white/20 sm:pl-4 lg:pl-6">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-white leading-tight">{displayName}</p>
              <p className="text-[9px] text-white/60 uppercase">{displayRole}</p>
            </div>

            <button
              onClick={() => setShowProfileDrawer(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 hover:border-white/60 transition-colors cursor-pointer flex-shrink-0 active:scale-95"
              aria-label="Open profile"
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=466460`}
                alt="User"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>

      <ProfileDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        onLogout={handleLogoutClick}
        userProfile={fullProfile}
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};

// ─── Desktop Navigation Bar ───────────────────────────────────────────────────
export const DesktopNav = () => {
  const navLinkClass = ({ isActive }) =>
    `relative font-bold tracking-[0.025em] transition-all pb-[4px] whitespace-nowrap flex-shrink-0
     text-[12px] sm:text-[13px] lg:text-[14px]
     ${
      isActive
        ? 'opacity-100 text-[#466460] after:content-[""] after:absolute after:-bottom-[13px] sm:after:-bottom-[17px] after:left-0 after:w-full after:h-[3px] after:bg-gradient-to-r after:from-[#466460] after:to-[#81b29a] after:rounded-full'
        : 'text-[#466460] opacity-60 hover:opacity-100 hover:text-[#e07a5f]'
    }`;

  return (
    <nav className="
      bg-white border-b border-slate-200 shadow-sm
      flex gap-4 sm:gap-6 lg:gap-12
      px-3 sm:px-6 lg:px-8
      py-3 sm:py-4
      z-10
      overflow-y-auto scrollbar-none
    ">
      <NavLink to="/dashboard"     className={navLinkClass}>Dashboard</NavLink>
      <NavLink to="/records"       className={navLinkClass}>Records</NavLink>
      <NavLink to="/appointments"  className={navLinkClass}>Appointments</NavLink>
      <NavLink to="/examinations"  className={navLinkClass}>Examination</NavLink>
      <NavLink to="/approvals"     className={navLinkClass}>Approvals</NavLink>
      <NavLink to="/announcements" className={navLinkClass}>Announcements</NavLink>
      <NavLink to="/consultations" className={navLinkClass}>Consultation</NavLink>
      <NavLink to="/users"         className={navLinkClass}>User Management</NavLink>
    </nav>
  );
};

// ─── Mobile Header ────────────────────────────────────────────────────────────
export const MobileHeader = ({ userName = 'User', userId = 'N/A', onLogout, simple = false, onProfileClick, onNotificationClick, notificationCount = 0 }) => {
  if (simple) {
    return (
      <header className="
        absolute top-0 left-0 right-0 z-40
        bg-white
        flex items-center justify-center
        shadow-sm border-b border-slate-100
        px-4 pt-[env(safe-area-inset-top,12px)] pb-3
        min-h-[64px]
        sm:px-6 sm:min-h-[70px]
      ">
        <img
          src="/logo.jpg"
          alt="MediTrack Logo"
          className="h-10 object-contain rounded-xl"
          onError={e => { e.target.src = 'https://placehold.co/200x40/557a5b/white?text=MediTrack'; }}
        />
      </header>
    );
  }

  return (
    <header className="
      absolute top-0 left-0 right-0 z-40
      bg-gradient-to-br from-[#466460] to-[#38524d]
      flex items-center justify-between
      shadow-lg border-b border-white/10
      px-4 pt-[env(safe-area-inset-top,12px)] pb-3
      min-h-[64px]
      sm:px-6 sm:min-h-[70px]
    ">
      <img
        src="/logo1.jpg"
        alt="MediTrack Logo"
        className="w-[110px] h-[42px] sm:w-[140px] sm:h-[50px] object-contain"
        onError={e => { e.target.src = 'https://placehold.co/140x50/466460/white?text=MediTrack'; }}
      />

      <div className="flex items-center gap-2 sm:gap-3">
        {onNotificationClick && (
          <NotificationBell
            onClick={onNotificationClick}
            count={notificationCount}
          />
        )}

        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-white leading-tight">{userName}</p>
          <p className="text-[9px] text-white/60 uppercase truncate max-w-[140px]">{userId}</p>
        </div>

        <button
          onClick={onProfileClick}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 hover:border-white/50 transition-colors cursor-pointer flex-shrink-0 active:scale-95"
          aria-label="Open profile"
        >
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=ffffff&color=466460`}
            alt="User"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
};

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────
export const MobileNav = ({
  active = 'dashboard',
  onSwitch,
  items = [
    { id: 'dashboard',     label: 'Home',     icon: HomeIcon         },
    { id: 'records',       label: 'Records',  icon: RecordsIcon      },
    { id: 'appointments',  label: 'Schedule', icon: CalendarIcon     },
    { id: 'examinations',  label: 'Exam',     icon: ExamIcon         },
    { id: 'approvals',     label: 'Approval', icon: ApprovalsIcon    },
    { id: 'consultations', label: 'Consult',  icon: ConsultIcon      },
    { id: 'announcements', label: 'Announce', icon: AnnouncementIcon },
    { id: 'users',         label: 'Users',    icon: UsersIcon        },
  ],
}) => {
  return (
    <nav className="
      absolute bottom-0 left-0 right-0
      bg-white border-t border-slate-100
      flex justify-between items-center
      shadow-[0_-4px_10px_rgba(0,0,0,0.05)]
      z-40
      h-[70px] px-1
      pb-[env(safe-area-inset-bottom,8px)]
      overflow-y-auto scrollbar-none
      sm:h-[76px] sm:px-4
    ">
      {items.map((item) => {
        const IconComponent = item.icon || DefaultIcon;
        const isActive = active === item.id;

        return (
          <button
            key={item.id}
            onClick={() => typeof onSwitch === 'function' && onSwitch(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all flex-shrink-0 ${
              isActive ? 'text-[#557a5b]' : 'text-slate-400'
            }`}
            aria-label={item.label}
          >
            <div className={`transition-transform flex items-center justify-center w-6 h-6 ${isActive ? 'scale-110' : ''}`}>
              <IconComponent />
            </div>
            <span className={`text-[7px] font-black uppercase tracking-wide whitespace-nowrap ${isActive ? 'text-[#557a5b]' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 bg-[#557a5b] rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

// ─── Full Mobile Layout ───────────────────────────────────────────────────────
export const MobileLayout = ({
  children,
  activeTab,
  onTabChange,
  userName,
  userId,
  bottomNavItems,
  onLogout,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutRequest = () => setShowLogoutConfirm(true);
  const handleConfirm       = () => { setShowLogoutConfirm(false); onLogout?.(); };
  const handleCancel        = () => setShowLogoutConfirm(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800;9..40,900&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.28s ease both; }
        .animate-slideUp { animation: slideUp 0.32s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      {/* Phone: full screen */}
      <div className="md:hidden relative flex flex-col h-screen bg-slate-50 overflow-hidden">
        <MobileHeader
          userName={userName}
          userId={userId}
          onProfileClick={onProfileClick}
        />
        <div className="flex-1 overflow-y-auto pt-[64px] pb-[70px] scrollbar-none">
          {children}
        </div>
        <MobileNav active={activeTab} onSwitch={onTabChange} items={bottomNavItems} />
      </div>

      {/* Tablet & Desktop: centered phone frame */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-slate-800">
        <div
          className="
            relative overflow-hidden bg-slate-50
            border-[10px] lg:border-[12px] border-slate-700
            w-[420px] h-[860px] rounded-[36px]
            lg:w-[375px] lg:h-[812px] lg:rounded-[40px]
          "
          style={{ boxShadow: '0 35px 70px -10px rgba(0,0,0,0.65)' }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130px] h-[20px] lg:w-[140px] lg:h-[22px] bg-slate-700 rounded-b-2xl z-50" />

          <MobileHeader
            userName={userName}
            userId={userId}
            onLogout={onLogout ? handleLogoutRequest : undefined}
          />
          <div className="h-full overflow-y-auto pt-[64px] pb-[80px] scrollbar-none">
            {children}
          </div>
          <MobileNav active={activeTab} onSwitch={onTabChange} items={bottomNavItems} />
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default { DesktopHeader, DesktopNav, MobileHeader, MobileNav, MobileLayout };