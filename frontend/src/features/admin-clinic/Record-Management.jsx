// frontend/src/features/admin-clinic/Record-Management.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, getDocs, deleteDoc, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['pending', 'approved', 'done', 'rejected'];

const STATUS_STYLES = {
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  done:     { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  rejected: { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

const departmentsData = [
  { abbr: 'CCSE', full: 'College of Computing Science and Engineering', programs: ['Bachelor of Science in Information Technology','Bachelor of Science in Information System','Bachelor of Science in Computer Engineering','Bachelor of Science in Industrial Engineering'] },
  { abbr: 'CBAM', full: 'College of Business Administration and Management', programs: ['Bachelor of Science in Entrepreneurship','Bachelor of Science in Public Administration','Bachelor of Science in Office Administration','Bachelor of Science in Business Administration Major in Human Resource Development Management','Bachelor of Science in Business Administration Major in Financial Management','Bachelor of Science in Business Administration Major in Marketing Management'] },
  { abbr: 'CAS',  full: 'College of Art and Sciences', programs: ['Bachelor of Science in Economics','Bachelor of Arts in Communication','Bachelor of Science in Psychology','Bachelor of Arts in Political Science'] },
  { abbr: 'CTHM', full: 'College of Tourism and Hospitality Management', programs: ['Bachelor of Science in Tourism Management','Bachelor of Science in Hospitality Management'] },
  { abbr: 'COA',  full: 'College of Accountancy', programs: ['Bachelor of Science in Accountancy','Bachelor of Science in Accountancy Information System','Bachelor of Science in Management Accounting'] },
  { abbr: 'CTE',  full: 'College of Teacher Education', programs: ['Bachelor of Secondary Education Major in English','Bachelor of Secondary Education Major in Filipino','Bachelor of Secondary Education Major in Math','Bachelor of Secondary Education Major in Science','Bachelor of Secondary Education Major in Social Studies','Bachelor of Elementary Education','Bachelor of Technical-Vocational Teacher Education','Bachelor of Special Needs Education'] },
  { abbr: 'CHK',  full: 'College of Human Kinetics', programs: ['Bachelor of Science in Physical Education','Bachelor of Science in Sports Science'] },
  { abbr: 'CNAHS',full: 'College of Nursing and Allied Health Sciences', programs: ['Bachelor of Science in Nursing'] },
];

const NON_ACADEMIC_OFFICES = ['Accounting Office','University Clinic','Human Resources','Library','Maintenance','Registrar Office','Security Services'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getStatusStyle = (status) =>
  STATUS_STYLES[status?.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };

const formatDate = (raw) => {
  if (!raw) return '—';
  if (typeof raw === 'string') {
    if (raw.includes('-')) {
      const [y, m, d] = raw.split('-');
      return `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
    }
    return raw;
  }
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
  return name.slice(0, 2).toUpperCase() || '?';
};

const normalizeUser = (docData) => {
  const d = docData;
  const name = getFullName(d) || d.email || d.uid;
  return {
    uid:          d.uid || d.id,
    name,
    firstName:    d.firstName    || '',
    lastName:     d.lastName     || '',
    id:           d.universityId || d.studentId || d.uid,
    role:         d.role         || d.type      || 'staff',
    prog:         d.program      || d.course    || '',
    year:         d.yearLevel    || '',
    section:      d.section      || '',
    department:   d.department   || '',
    email:        d.email        || '',
    jobTitle:     d.jobTitle     || '',
    classification: d.classification || '',
    _raw: d,
  };
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {status || 'unknown'}
    </span>
  );
};

// Inline record detail card inside the expanded user row
const RecordCard = ({ record, onStatusChange, onDelete }) => {
  const [editStatus, setEditStatus] = useState(record.status || 'pending');
  const [saving, setSaving]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const isMedical = record._kind === 'medical';
  const vitals = record.vitalRecords?.[0] || {};

  const handleSave = async () => {
    setSaving(true);
    try { await onStatusChange(record, editStatus); }
    finally { setSaving(false); }
  };

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isMedical ? 'border-blue-100 bg-blue-50/40' : 'border-purple-100 bg-purple-50/40'}`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMedical ? 'bg-blue-100' : 'bg-purple-100'}`}>
            <i className={`fa-solid ${isMedical ? 'fa-notes-medical text-blue-600' : 'fa-tooth text-purple-600'} text-sm`}></i>
          </div>
          <div>
            <p className="font-bold text-xs text-slate-800">
              {isMedical ? 'Medical Record' : 'Dental Record'}
              <span className="ml-2 text-slate-400 font-normal">{formatDate(record.examDate || record._date)}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {isMedical
                ? (record.purpose || record.reason || 'Medical Examination')
                : (record.procedure || 'Dental Visit')}
              {isMedical && record.nurseOnDuty ? ` · Nurse: ${record.nurseOnDuty}` : ''}
              {!isMedical && record.dentistName ? ` · Dr. ${record.dentistName}` : ''}
            </p>
          </div>
        </div>
        <StatusPill status={record.status} />
      </div>

      {/* Vitals strip (medical only) */}
      {isMedical && (vitals.bp || vitals.temp || vitals.pr) && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { l: 'BP',   v: vitals.bp,                   u: 'mmHg' },
            { l: 'PR',   v: vitals.pr,                   u: 'bpm'  },
            { l: 'Temp', v: vitals.temp,                 u: '°C'   },
            { l: 'O₂',  v: vitals.o2sat || vitals.o2Sat, u: '%'   },
          ].filter(x => x.v).map(x => (
            <span key={x.l} className="text-[9px] bg-white border border-blue-100 rounded-md px-2 py-0.5 text-slate-600 font-medium">
              {x.l}: <strong className="text-[#466460]">{x.v}</strong> {x.u}
            </span>
          ))}
          {(record.height || record.weight || record.bmi) && (
            <>
              {record.height && <span className="text-[9px] bg-white border border-blue-100 rounded-md px-2 py-0.5 text-slate-600 font-medium">Ht: <strong className="text-[#466460]">{record.height}</strong> cm</span>}
              {record.weight && <span className="text-[9px] bg-white border border-blue-100 rounded-md px-2 py-0.5 text-slate-600 font-medium">Wt: <strong className="text-[#466460]">{record.weight}</strong> kg</span>}
              {record.bmi    && <span className="text-[9px] bg-white border border-blue-100 rounded-md px-2 py-0.5 text-slate-600 font-medium">BMI: <strong className="text-[#466460]">{record.bmi}</strong></span>}
            </>
          )}
        </div>
      )}

      {/* Assessment badges (medical) */}
      {isMedical && (record.isNormalFindings !== undefined || record.isFit !== undefined) && (
        <div className="flex flex-wrap gap-1.5">
          {record.isNormalFindings !== undefined && (
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${record.isNormalFindings ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              <i className={`fa-solid ${record.isNormalFindings ? 'fa-circle-check' : 'fa-circle-xmark'} text-[8px]`}></i>
              {record.isNormalFindings ? 'Normal' : 'Abnormal'}
            </span>
          )}
          {record.isFit !== undefined && (
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${record.isFit ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
              <i className={`fa-solid ${record.isFit ? 'fa-circle-check' : 'fa-circle-xmark'} text-[8px]`}></i>
              {record.isFit ? 'Fit' : 'Not Fit'}
            </span>
          )}
          {record.finding1 && (
            <span className="text-[9px] bg-white border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 truncate max-w-[200px]">{record.finding1}</span>
          )}
        </div>
      )}

      {/* Dental details */}
      {!isMedical && (record.diagnosis || record.toothNumber) && (
        <div className="flex flex-wrap gap-1.5">
          {record.toothNumber && <span className="text-[9px] bg-white border border-purple-100 rounded-md px-2 py-0.5 text-slate-600">Tooth #{record.toothNumber}</span>}
          {record.diagnosis   && <span className="text-[9px] bg-white border border-purple-100 rounded-md px-2 py-0.5 text-slate-600">{record.diagnosis}</span>}
          {record.notes       && <span className="text-[9px] bg-white border border-purple-100 rounded-md px-2 py-0.5 text-slate-500 truncate max-w-[200px]">{record.notes}</span>}
        </div>
      )}

      {/* Status changer + delete */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map(s => {
            const st = getStatusStyle(s);
            return (
              <button
                key={s}
                onClick={() => setEditStatus(s)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-bold capitalize transition-all border ${
                  editStatus === s
                    ? `${st.bg} ${st.text} border-transparent scale-105`
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || editStatus === record.status}
          className="px-3 py-1 rounded-lg bg-[#466460] text-white text-[9px] font-bold hover:bg-[#3a524f] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {saving && <i className="fa-solid fa-spinner fa-spin text-[8px]"></i>}
          {saving ? 'Saving…' : 'Update'}
        </button>
        <div className="ml-auto">
          {!confirmDel ? (
            <button
              onClick={() => setConfirmDel(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-500 border border-red-200 bg-white text-[9px] font-bold hover:bg-red-50 transition"
            >
              <i className="fa-solid fa-trash-can text-[8px]"></i> Delete
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-red-600 font-medium">Sure?</span>
              <button onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 text-[9px] font-bold hover:bg-slate-50 transition">No</button>
              <button onClick={() => onDelete(record)} className="px-2 py-1 rounded-md bg-red-600 text-white text-[9px] font-bold hover:bg-red-700 transition">Yes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Expanded row: shows all records for a user, with medical/dental tab
const ExpandedUserRow = ({ user, onStatusChange, onDelete, colSpan }) => {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('medical');

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const fetch = async () => {
      try {
        const [medSnap, denSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'medical_records')),
          getDocs(collection(db, 'users', user.uid, 'dental_records')),
        ]);
        const med = medSnap.docs.map(d => ({ _id: d.id, _kind: 'medical', _patientUid: user.uid, _patientName: user.name, _patientId: user.id, ...d.data(), _date: d.data().examDate || d.data().createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '' }));
        const den = denSnap.docs.map(d => ({ _id: d.id, _kind: 'dental',  _patientUid: user.uid, _patientName: user.name, _patientId: user.id, ...d.data(), _date: d.data().examDate || d.data().createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '' }));
        const all = [...med, ...den].sort((a, b) => (b._date || '').localeCompare(a._date || ''));
        setRecords(all);
      } catch (err) {
        console.error('Error fetching records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user.uid]);

  // When a record's status changes, update local state too
  const handleStatusChange = async (record, newStatus) => {
    await onStatusChange(record, newStatus);
    setRecords(prev => prev.map(r => r._id === record._id ? { ...r, status: newStatus } : r));
  };

  // When a record is deleted, remove from local list
  const handleDelete = async (record) => {
    await onDelete(record);
    setRecords(prev => prev.filter(r => r._id !== record._id));
  };

  const filtered = records.filter(r => r._kind === tab);
  const medCount = records.filter(r => r._kind === 'medical').length;
  const denCount = records.filter(r => r._kind === 'dental').length;

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-gradient-to-br from-slate-50 to-white border-t border-b border-slate-200 px-6 py-5">
          {/* Tab bar */}
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Records for</p>
            <p className="text-xs font-bold text-[#466460]">{user.name}</p>
            <div className="ml-auto flex bg-white border border-slate-200 rounded-lg p-0.5 gap-0.5">
              {['medical', 'dental'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all capitalize ${
                    tab === t ? 'bg-[#466460] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <i className={`fa-solid ${t === 'medical' ? 'fa-stethoscope' : 'fa-tooth'} text-[9px]`}></i>
                  {t}
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${tab === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {t === 'medical' ? medCount : denCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Record cards */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
              <svg className="animate-spin w-4 h-4 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Loading records…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <i className={`fa-solid ${tab === 'medical' ? 'fa-stethoscope' : 'fa-tooth'} text-3xl mb-2 opacity-20`}></i>
              <p className="text-xs">No {tab} records for this patient</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {filtered.map(record => (
                <RecordCard
                  key={`${record._kind}-${record._id}`}
                  record={record}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const RecordManagement = () => {
  const [allUsers, setAllUsers]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [expandedUid, setExpandedUid]       = useState(null);
  const [searchInput, setSearchInput]       = useState('');
  const [filterDept, setFilterDept]         = useState('all');
  const [filterRole, setFilterRole]         = useState('all');
  const [filterYear, setFilterYear]         = useState('all');
  const [filterSection, setFilterSection]   = useState('all');
  const [filterProgram, setFilterProgram]   = useState('all');
  const [sortOrder, setSortOrder]           = useState('asc');
  const [message, setMessage]               = useState(null);
  const snackbarTimer = useRef(null);

  // ── Fetch all users ─────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => normalizeUser({ uid: d.id, ...d.data() }));
      setAllUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      showSnackbar('Failed to load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Snackbar ────────────────────────────────────────────────────────────────
  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  // ── Derived filter options ─────────────────────────────────────────────────
  const deptOptions = ['all', ...new Set(allUsers.map(u => u.department).filter(Boolean))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));

  const usersInDept = filterDept === 'all' ? allUsers : allUsers.filter(u => u.department === filterDept);

  const roleOptions    = ['all', ...new Set(usersInDept.map(u => u.role).filter(Boolean))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  const programOptions = ['all', ...new Set(usersInDept.map(u => u.prog).filter(Boolean))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  const yearOptions    = ['all', ...new Set(usersInDept.map(u => u.year).filter(Boolean))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  const sectionOptions = ['all', ...new Set(usersInDept.map(u => u.section).filter(Boolean))].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));

  // ── Filtering + sorting ─────────────────────────────────────────────────────
  const filteredUsers = allUsers
    .filter(u => {
      if (filterDept    !== 'all' && u.department !== filterDept)    return false;
      if (filterRole    !== 'all' && u.role        !== filterRole)    return false;
      if (filterProgram !== 'all' && u.prog        !== filterProgram) return false;
      if (filterYear    !== 'all' && u.year        !== filterYear)    return false;
      if (filterSection !== 'all' && u.section     !== filterSection) return false;
      if (searchInput) {
        const s = searchInput.toLowerCase();
        return u.name.toLowerCase().includes(s) || u.id?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
      }
      return true;
    })
    .sort((a, b) => {
      const na = a.name.toLowerCase(), nb = b.name.toLowerCase();
      return sortOrder === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
    });

  // ── Status update ───────────────────────────────────────────────────────────
  const handleStatusChange = async (record, newStatus) => {
    try {
      const subcol = record._kind === 'medical' ? 'medical_records' : 'dental_records';
      await updateDoc(doc(db, 'users', record._patientUid, subcol, record._id), { status: newStatus });
      showSnackbar('Status updated successfully');
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to update status', 'error');
      throw err;
    }
  };

  // ── Delete record ───────────────────────────────────────────────────────────
  const handleDelete = async (record) => {
    try {
      const subcol = record._kind === 'medical' ? 'medical_records' : 'dental_records';
      await deleteDoc(doc(db, 'users', record._patientUid, subcol, record._id));
      showSnackbar('Record deleted');
    } catch (err) {
      console.error(err);
      showSnackbar('Failed to delete record', 'error');
      throw err;
    }
  };

  const selectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm truncate";

  const COL_COUNT = 7;

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#466460]">Record Management</h2>
            <p className="text-xs text-slate-400 mt-0.5">Click any row to view and manage that patient's records</p>
          </div>
          <button
            onClick={fetchUsers}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Table container ── */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, ID, email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-xs outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center flex-1">
            {/* Department */}
            <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterRole('all'); setFilterProgram('all'); setFilterYear('all'); setFilterSection('all'); }} className={`${selectCls} w-36`}>
              <option value="all">All Departments</option>
              {deptOptions.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Role */}
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className={`${selectCls} w-28`}>
              <option value="all">All Roles</option>
              {roleOptions.filter(r => r !== 'all').map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>

            {/* Program */}
            {programOptions.length > 1 && (
              <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterYear('all'); setFilterSection('all'); }} className={`${selectCls} max-w-[180px]`}>
                <option value="all">All Programs</option>
                {programOptions.filter(p => p !== 'all').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}

            {/* Year */}
            {yearOptions.length > 1 && (
              <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterSection('all'); }} className={`${selectCls} w-28`}>
                <option value="all">All Years</option>
                {yearOptions.filter(y => y !== 'all').map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}

            {/* Section */}
            {sectionOptions.length > 1 && (
              <select value={filterSection} onChange={e => setFilterSection(e.target.value)} className={`${selectCls} w-24`}>
                <option value="all">All Secs</option>
                {sectionOptions.filter(s => s !== 'all').map(s => <option key={s} value={s}>Sec {s}</option>)}
              </select>
            )}

            {/* Sort */}
            <button
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-600 hover:border-[#466460] hover:text-[#466460] transition shadow-sm"
              title={`Sort ${sortOrder === 'asc' ? 'Z→A' : 'A→Z'}`}
            >
              {sortOrder === 'asc' ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <text x="1" y="7" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                  <text x="1" y="13" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                  <path d="M11 2v10M11 12l-2-2M11 12l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <text x="1" y="7" fontSize="7" fontWeight="700" fill="currentColor">Z</text>
                  <text x="1" y="13" fontSize="5" fontWeight="700" fill="currentColor">A</text>
                  <path d="M11 14V4M11 4l-2 2M11 4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span className="hidden sm:inline">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
            </button>

            <span className="ml-auto text-[10px] text-slate-400 font-medium whitespace-nowrap">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-3 pl-4 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap w-8"></th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden sm:table-cell">ID</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Role</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Department</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden xl:table-cell">Program / Year</th>
                <th className="text-left p-3 pr-4 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Records</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span className="text-sm">Loading users…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16">
                    <i className="fa-regular fa-user-circle text-slate-200 text-4xl block mb-2"></i>
                    <p className="text-slate-400 text-sm">No users found</p>
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const isExpanded = expandedUid === user.uid;
                const initials   = getInitials(user.name);

                return (
                  <React.Fragment key={user.uid}>
                    {/* User row */}
                    <tr
                      onClick={() => setExpandedUid(isExpanded ? null : user.uid)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors group ${
                        isExpanded ? 'bg-[#e0eceb]/50 border-[#c8ddd8]' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Expand chevron */}
                      <td className="p-3 pl-4 w-8">
                        <div className={`w-5 h-5 flex items-center justify-center rounded transition-transform ${isExpanded ? 'rotate-90 text-[#466460]' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </td>

                      {/* Name + avatar */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${isExpanded ? 'bg-[#466460] text-white' : 'bg-[#e0eceb] text-[#466460]'}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-800 whitespace-nowrap">{user.name}</p>
                            <p className="text-[10px] text-slate-400 sm:hidden">{user.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="p-3 hidden sm:table-cell">
                        <p className="text-xs text-slate-500 font-mono">{user.id || '—'}</p>
                      </td>

                      {/* Role */}
                      <td className="p-3 hidden md:table-cell">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${
                          user.role === 'student' ? 'bg-blue-100 text-blue-700'
                          : ['instructor','faculty','doctor','nurse'].some(k => user.role?.includes(k)) ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                        }`}>
                          {user.role || '—'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="p-3 hidden lg:table-cell">
                        <p className="text-xs text-slate-600 whitespace-nowrap">{user.department || '—'}</p>
                      </td>

                      {/* Program / Year */}
                      <td className="p-3 hidden xl:table-cell">
                        <p className="text-xs text-slate-600 truncate max-w-[180px]">
                          {user.prog || user.jobTitle || '—'}
                          {user.year ? <span className="text-slate-400"> · {user.year}</span> : null}
                          {user.section ? <span className="text-slate-400"> Sec {user.section}</span> : null}
                        </p>
                      </td>

                      {/* View records CTA */}
                      <td className="p-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold transition-colors ${isExpanded ? 'text-[#466460]' : 'text-slate-400 group-hover:text-[#466460]'}`}>
                          <i className="fa-solid fa-folder-open text-[9px]"></i>
                          {isExpanded ? 'Hide records' : 'View records'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded records row */}
                    {isExpanded && (
                      <ExpandedUserRow
                        user={user}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        colSpan={COL_COUNT}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Snackbar ── */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl transition-all ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
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