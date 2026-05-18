// frontend/src/features/admin-clinic/Record-Management.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, deleteDoc, doc, updateDoc,
  query, orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ── Constants ─────────────────────────────────────────────────────────────────

const RECORD_TYPES = ['all', 'medical', 'dental'];

const STATUS_OPTIONS = ['pending', 'approved', 'done', 'rejected'];

const STATUS_STYLES = {
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  pending:  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  done:     { bg: 'bg-slate-100',   text: 'text-slate-500'   },
  rejected: { bg: 'bg-red-100',     text: 'text-red-700'     },
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getStatusStyle = (status) =>
  STATUS_STYLES[status?.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-500' };

const formatDate = (raw) => {
  if (!raw) return '—';
  if (typeof raw === 'string') return raw;
  if (raw?.toDate) {
    const d = raw.toDate();
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return '—';
};

const getFullName = (user) => {
  const parts = [
    user.firstName,
    user.middleInitial ? `${user.middleInitial}.` : '',
    user.lastName,
    user.suffix || '',
  ].filter(Boolean);
  return parts.join(' ') || user.name || '—';
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'R';
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.bg} ${s.text}`}>
      {status || 'unknown'}
    </span>
  );
};

// Detail panel for a single record (medical or dental)
const RecordDetailPanel = ({ record, onClose, onStatusChange, onDelete }) => {
  const [editStatus, setEditStatus] = useState(record.status || 'pending');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!record) return null;

  const isMedical = record._kind === 'medical';
  const vitals = record.vitalRecords?.[0] || {};
  const surgicalHistory = (record.surgicalHistory || []).map(s =>
    typeof s === 'object' ? `${s.operation || ''}${s.date ? ` (${s.date})` : ''}` : s
  );

  const handleSaveStatus = async () => {
    setSaving(true);
    try {
      await onStatusChange(record, editStatus);
    } finally {
      setSaving(false);
    }
  };

  const SectionHeading = ({ icon, label }) => (
    <p className="text-[9px] font-bold text-[#466460] uppercase tracking-widest mb-2 flex items-center gap-1.5">
      <i className={`fa-solid ${icon}`}></i> {label}
    </p>
  );

  const TagList = ({ items, color }) => (
    <div className="flex flex-wrap gap-1">
      {(items?.length > 0 ? items : ['None recorded']).map((h, i) => (
        <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${color}`}>{h}</span>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#f4f8f7] to-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isMedical ? 'bg-blue-100' : 'bg-purple-100'}`}>
            <i className={`fa-solid ${isMedical ? 'fa-notes-medical text-blue-600' : 'fa-tooth text-purple-600'} text-sm`}></i>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-800 truncate">{record._patientName || '—'}</p>
            <p className="text-[10px] text-slate-500">{record._patientId || '—'} · {isMedical ? 'Medical' : 'Dental'} · {formatDate(record.examDate || record._date)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">

        {/* Status editor */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Record Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setEditStatus(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold capitalize transition-all border ${
                  editStatus === s
                    ? `${getStatusStyle(s).bg} ${getStatusStyle(s).text} border-transparent scale-105`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={handleSaveStatus}
            disabled={saving || editStatus === record.status}
            className="mt-3 bg-[#466460] text-white px-4 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-[#3a524f] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving && <i className="fa-solid fa-spinner fa-spin text-[9px]"></i>}
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>

        {/* Medical record details */}
        {isMedical && (
          <>
            {/* Overview grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Exam Date',     value: formatDate(record.examDate || record._date) },
                { label: 'Nurse on Duty', value: record.nurseOnDuty || '—'                  },
                { label: 'Purpose',       value: record.purpose || record.reason || '—'      },
                { label: 'Department',    value: record._patientDept || '—'                  },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[8px] text-slate-400 uppercase mb-0.5">{label}</p>
                  <p className="text-[11px] font-semibold text-slate-700">{value}</p>
                </div>
              ))}
            </div>

            {/* Vitals */}
            <div>
              <SectionHeading icon="fa-heart-pulse" label="Vital Signs" />
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'BP',     value: vitals.bp,                   unit: 'mmHg' },
                  { label: 'PR',     value: vitals.pr,                   unit: 'bpm'  },
                  { label: 'RR',     value: vitals.rr,                   unit: 'cpm'  },
                  { label: 'Temp',   value: vitals.temp,                 unit: '°C'   },
                  { label: 'O₂ Sat', value: vitals.o2sat || vitals.o2Sat, unit: '%'  },
                ].map(v => (
                  <div key={v.label} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                    <p className="text-[7px] text-slate-400 uppercase">{v.label}</p>
                    <p className="text-xs font-bold text-[#466460]">{v.value || '—'}</p>
                    <p className="text-[7px] text-slate-400">{v.unit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Anthropometrics */}
            <div>
              <SectionHeading icon="fa-ruler-vertical" label="Anthropometrics" />
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Height', value: record.height, unit: 'cm' },
                  { label: 'Weight', value: record.weight, unit: 'kg' },
                  { label: 'BMI',    value: record.bmi,    unit: ''   },
                  { label: 'Waist',  value: record.waist,  unit: 'cm' },
                ].map(v => (
                  <div key={v.label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[7px] text-slate-400 uppercase">{v.label}</p>
                    <p className="text-xs font-semibold text-slate-700">{v.value ? `${v.value}${v.unit ? ' ' + v.unit : ''}` : '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Histories */}
            <div className="space-y-3">
              <div>
                <SectionHeading icon="fa-clock-rotate-left" label="Past Medical History" />
                <TagList items={record.checkedMedical} color="bg-amber-50 text-amber-700 border-amber-100" />
              </div>
              <div>
                <SectionHeading icon="fa-scissors" label="Surgical History" />
                <TagList items={surgicalHistory} color="bg-blue-50 text-blue-700 border-blue-100" />
              </div>
              <div>
                <SectionHeading icon="fa-dna" label="Family History" />
                <TagList items={record.checkedFamily} color="bg-purple-50 text-purple-700 border-purple-100" />
              </div>
            </div>

            {/* Lab results */}
            {(record.labCbc || record.labUa || record.labXray) && (
              <div>
                <SectionHeading icon="fa-flask" label="Laboratory Results" />
                <table className="w-full text-[10px] border border-slate-100 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 border-b border-slate-100 font-semibold text-slate-500">Test</th>
                      <th className="text-left p-2 border-b border-slate-100 font-semibold text-slate-500">Result</th>
                      <th className="text-left p-2 border-b border-slate-100 font-semibold text-slate-500">Facility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { test: 'CBC',         result: record.labCbc,  facility: record.labCbcFacility  },
                      { test: 'Urinalysis',  result: record.labUa,   facility: record.labUaFacility   },
                      { test: 'Chest X-Ray', result: record.labXray, facility: record.labXrayFacility },
                    ].filter(r => r.result).map((row, i, arr) => (
                      <tr key={row.test} className={i < arr.length - 1 ? 'border-b border-slate-100' : ''}>
                        <td className="p-2 text-slate-500">{row.test}</td>
                        <td className="p-2 font-semibold text-slate-700">{row.result}</td>
                        <td className="p-2 text-slate-400">{row.facility || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Doctor's assessment */}
            {(record.finding1 || record.remarks || record.isNormalFindings !== undefined || record.isFit !== undefined) && (
              <div className="border border-[#e0eceb] rounded-xl p-3 bg-[#f7fbfa]">
                <SectionHeading icon="fa-notes-medical" label="Doctor's Assessment" />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {record.isNormalFindings !== undefined && (
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${record.isNormalFindings ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      <i className={`fa-solid ${record.isNormalFindings ? 'fa-circle-check' : 'fa-circle-xmark'} text-[8px]`}></i>
                      {record.isNormalFindings ? 'Normal Findings' : 'Abnormal Findings'}
                    </span>
                  )}
                  {record.isFit !== undefined && (
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${record.isFit ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      <i className={`fa-solid ${record.isFit ? 'fa-circle-check' : 'fa-circle-xmark'} text-[8px]`}></i>
                      {record.isFit ? 'Physically Fit' : 'Not Fit'}
                    </span>
                  )}
                </div>
                {record.finding1 && (
                  <div className="mb-2">
                    <p className="text-[8px] text-slate-400 uppercase mb-1">Findings</p>
                    <p className="text-[10px] text-slate-700 bg-white rounded-lg p-2.5 leading-relaxed border border-slate-100">{record.finding1}</p>
                  </div>
                )}
                {record.remarks && (
                  <div>
                    <p className="text-[8px] text-slate-400 uppercase mb-1">Remarks</p>
                    <p className="text-[10px] text-slate-700 bg-white rounded-lg p-2.5 leading-relaxed border border-slate-100">{record.remarks}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Dental record details */}
        {!isMedical && (
          <div className="grid grid-cols-1 gap-3 text-xs">
            {[
              { label: 'Dentist',    value: record.dentistName },
              { label: 'Procedure',  value: record.procedure   },
              { label: 'Tooth No.',  value: record.toothNumber },
              { label: 'Diagnosis',  value: record.diagnosis   },
            ].filter(f => f.value).map(f => (
              <div key={f.label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <p className="text-[8px] text-slate-400 uppercase mb-0.5">{f.label}</p>
                <p className="text-[11px] font-semibold text-slate-700">{f.value}</p>
              </div>
            ))}
            {record.notes && (
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <p className="text-[8px] text-slate-400 uppercase mb-1">Notes</p>
                <p className="text-[10px] text-slate-700 leading-relaxed">{record.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Delete zone */}
        <div className="border border-red-100 rounded-xl p-3.5 bg-red-50 mt-2">
          <p className="text-[9px] font-bold text-red-500 uppercase mb-1.5">Danger Zone</p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-100 transition"
            >
              <i className="fa-solid fa-trash-can text-[10px]"></i>
              Delete this Record
            </button>
          ) : (
            <div>
              <p className="text-[10px] text-red-700 mb-2 font-medium">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={() => onDelete(record)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition">
                  Yes, Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const RecordManagement = () => {
  const [allRecords, setAllRecords]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [typeFilter, setTypeFilter]         = useState('all');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [searchInput, setSearchInput]       = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [message, setMessage]               = useState(null);
  const snackbarTimer = useRef(null);

  // ── Fetch all users then their sub-collections ──────────────────────────────
  const fetchAllRecords = async () => {
    try {
      setLoading(true);

      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

      const allFetched = [];

      await Promise.all(
        users.map(async (user) => {
          const name = getFullName(user) || user.email || user.uid;
          const patientId = user.universityId || user.studentId || user.uid;
          const dept = user.department || '—';

          // Medical
          try {
            const mSnap = await getDocs(collection(db, 'users', user.uid, 'medical_records'));
            mSnap.docs.forEach(d => {
              const data = d.data();
              allFetched.push({
                _id:          d.id,
                _kind:        'medical',
                _patientUid:  user.uid,
                _patientName: name,
                _patientId:   patientId,
                _patientDept: dept,
                _date:        data.examDate || data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
                ...data,
              });
            });
          } catch (_) { /* sub-collection may not exist */ }

          // Dental
          try {
            const dSnap = await getDocs(collection(db, 'users', user.uid, 'dental_records'));
            dSnap.docs.forEach(d => {
              const data = d.data();
              allFetched.push({
                _id:          d.id,
                _kind:        'dental',
                _patientUid:  user.uid,
                _patientName: name,
                _patientId:   patientId,
                _patientDept: dept,
                _date:        data.examDate || data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
                ...data,
              });
            });
          } catch (_) { /* sub-collection may not exist */ }
        })
      );

      // Sort newest first
      allFetched.sort((a, b) => (b._date || '').localeCompare(a._date || ''));
      setAllRecords(allFetched);
    } catch (err) {
      console.error('Error fetching records:', err);
      showSnackbar('Failed to load records from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllRecords(); }, []);

  // ── Snackbar ────────────────────────────────────────────────────────────────
  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredRecords = allRecords.filter(r => {
    if (typeFilter !== 'all'   && r._kind          !== typeFilter)    return false;
    if (statusFilter !== 'all' && r.status?.toLowerCase() !== statusFilter) return false;
    if (searchInput) {
      const s = searchInput.toLowerCase();
      return (
        r._patientName?.toLowerCase().includes(s) ||
        r._patientId?.toLowerCase().includes(s)   ||
        r._patientDept?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const statTotal    = allRecords.length;
  const statMedical  = allRecords.filter(r => r._kind === 'medical').length;
  const statDental   = allRecords.filter(r => r._kind === 'dental').length;
  const statPending  = allRecords.filter(r => r.status?.toLowerCase() === 'pending').length;
  const statApproved = allRecords.filter(r => r.status?.toLowerCase() === 'approved').length;

  // ── Update status ───────────────────────────────────────────────────────────
  const handleStatusChange = async (record, newStatus) => {
    try {
      const subcol = record._kind === 'medical' ? 'medical_records' : 'dental_records';
      const ref = doc(db, 'users', record._patientUid, subcol, record._id);
      await updateDoc(ref, { status: newStatus });
      setAllRecords(prev =>
        prev.map(r => r._id === record._id && r._patientUid === record._patientUid
          ? { ...r, status: newStatus }
          : r
        )
      );
      // Update selectedRecord too
      setSelectedRecord(prev => prev ? { ...prev, status: newStatus } : prev);
      showSnackbar('Record status updated successfully', 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showSnackbar('Failed to update status', 'error');
    }
  };

  // ── Delete record ───────────────────────────────────────────────────────────
  const handleDelete = async (record) => {
    try {
      const subcol = record._kind === 'medical' ? 'medical_records' : 'dental_records';
      await deleteDoc(doc(db, 'users', record._patientUid, subcol, record._id));
      setAllRecords(prev =>
        prev.filter(r => !(r._id === record._id && r._patientUid === record._patientUid))
      );
      setSelectedRecord(null);
      showSnackbar('Record deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting record:', err);
      showSnackbar('Failed to delete record', 'error');
    }
  };

  // ── Shared class strings ────────────────────────────────────────────────────
  const filterSelectCls = "px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">Record Management</h2>
          <button
            onClick={fetchAllRecords}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Records',   value: statTotal    },
            { label: 'Medical',         value: statMedical  },
            { label: 'Dental',          value: statDental   },
            { label: 'Pending Review',  value: statPending  },
            { label: 'Approved',        value: statApproved },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 md:mb-2 truncate">{label}</div>
              <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main panel: table + detail ── */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* Left: table */}
        <div className={`flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0 transition-all ${selectedRecord ? 'flex-[1.4]' : 'flex-1'}`}>

          {/* Toolbar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className={`${filterSelectCls} w-full sm:w-36`}
              >
                <option value="all">All Types</option>
                <option value="medical">Medical</option>
                <option value="dental">Dental</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`${filterSelectCls} w-full sm:w-36`}
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search patient name, ID, dept..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                  <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                  <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Date</th>
                  <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Department</th>
                  <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Purpose / Procedure</th>
                  <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                  <th className="bg-slate-50 text-left p-3 pr-4 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        Loading records…
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No records found</td>
                  </tr>
                ) : (
                  filteredRecords.map(record => {
                    const isSelected = selectedRecord?._id === record._id && selectedRecord?._patientUid === record._patientUid;
                    const isMedical  = record._kind === 'medical';
                    return (
                      <tr
                        key={`${record._patientUid}-${record._id}`}
                        onClick={() => setSelectedRecord(isSelected ? null : record)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#e0eceb]/60' : 'hover:bg-[#e0eceb]/30'
                        }`}
                      >
                        {/* Patient */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-xs shrink-0">
                              {getInitials(record._patientName)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-700 text-sm whitespace-nowrap">{record._patientName}</div>
                              <div className="text-xs text-slate-400 font-mono">{record._patientId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Type badge */}
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isMedical ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            <i className={`fa-solid ${isMedical ? 'fa-notes-medical' : 'fa-tooth'} text-[9px]`}></i>
                            {isMedical ? 'Medical' : 'Dental'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(record.examDate || record._date)}</td>

                        {/* Department */}
                        <td className="p-3 text-sm text-slate-600 whitespace-nowrap hidden md:table-cell">{record._patientDept}</td>

                        {/* Purpose / Procedure */}
                        <td className="p-3 text-sm text-slate-500 whitespace-nowrap hidden lg:table-cell max-w-[160px]">
                          <span className="truncate block">{record.purpose || record.reason || record.procedure || '—'}</span>
                        </td>

                        {/* Status */}
                        <td className="p-3 whitespace-nowrap">
                          <StatusPill status={record.status} />
                        </td>

                        {/* Actions */}
                        <td className="p-3 pr-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {/* View/Select */}
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedRecord(isSelected ? null : record); }}
                              title="View record"
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
                                isSelected ? 'bg-[#466460] text-white' : 'text-[#466460] bg-slate-50 hover:bg-[#e0eceb]'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>

                            {/* Quick approve */}
                            {record.status !== 'approved' && (
                              <button
                                onClick={e => { e.stopPropagation(); handleStatusChange(record, 'approved'); }}
                                title="Approve"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-600 bg-slate-50 hover:bg-emerald-50 transition"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(record); }}
                              title="Delete record"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-slate-50 hover:bg-red-50 transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail panel */}
        {selectedRecord && (
          <div className="flex-[1] min-w-[320px] max-w-[440px] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            <RecordDetailPanel
              record={selectedRecord}
              onClose={() => setSelectedRecord(null)}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* ── Snackbar ── */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default RecordManagement;