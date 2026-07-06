// frontend/src/features/admin-clinic/Record-Management.jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../supabase';

const STATUS_OPTIONS = ['pending', 'approved', 'done', 'rejected'];
const STATUS_STYLES = {
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  done:     { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400'   },
  rejected: { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getStatusStyle = (status) =>
  STATUS_STYLES[status?.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };

const formatDate = (raw) => {
  if (!raw) return '—';
  const [y, m, d] = raw.split('T')[0].split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
};

const getFullName = (r) => {
  const fn = r.first_name || '', ln = r.last_name || '', mn = r.middle_name || '';
  if (ln) return `${ln}, ${fn}${mn ? ' ' + mn : ''}`.trim();
  return fn || r.email || '—';
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
};

const StatusPill = ({ status }) => {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {status || 'unknown'}
    </span>
  );
};

// ── Action dropdown menu (portal – escapes overflow clipping) ─────────────
const ActionMenu = ({ record, onStatusChange, onDelete, onClose, anchorRect }) => {
  const [editStatus, setEditStatus] = useState(record.status || 'pending');
  const [saving, setSaving]         = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const ref = useRef(null);

  // Flip upward when not enough room below the button
  const menuHeight = confirmDel ? 210 : 285;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUpward = spaceBelow < menuHeight + 8;
  // When opening downward: top of menu = bottom of button + gap
  // When opening upward:   bottom of menu = top of button - gap (use CSS bottom)
  const posStyle = openUpward
    ? { bottom: window.innerHeight - anchorRect.top + 4 }
    : { top: anchorRect.bottom + 4 };
  const right = window.innerWidth - anchorRect.right;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onStatusChange(record, editStatus);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', ...posStyle, right, zIndex: 9999, width: '13rem' }}
      className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden"
    >
      {/* Status picker */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
          Change status
        </p>
        <div className="flex flex-col gap-1">
          {STATUS_OPTIONS.map(s => {
            const style = getStatusStyle(s);
            const isSelected = editStatus === s;
            return (
              <button
                key={s}
                onClick={() => setEditStatus(s)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all text-left ${
                  isSelected
                    ? `${style.bg} ${style.text} ring-1 ring-inset`
                    : 'hover:bg-slate-50 text-slate-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? style.dot : 'bg-slate-300'}`}></span>
                {s}
                {isSelected && (
                  <svg className="ml-auto w-3 h-3 opacity-70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <button
          onClick={handleSave}
          disabled={saving || editStatus === record.status}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#466460] text-white text-[11px] font-bold hover:bg-[#3a524f] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save changes
            </>
          )}
        </button>

        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-200 text-red-500 text-[11px] font-semibold hover:bg-red-50 transition"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete record
          </button>
        ) : (
          <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
            <p className="text-[10px] text-red-600 font-semibold text-center mb-2">
              Delete this record?
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setConfirmDel(false)}
                className="flex-1 py-1.5 rounded-md border border-slate-200 text-[10px] font-semibold text-slate-500 bg-white hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(record)}
                className="flex-1 py-1.5 rounded-md bg-red-600 text-[10px] font-bold text-white hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ── Record row ─────────────────────────────────────────────────────────────
const RecordRow = ({ record, onStatusChange, onDelete }) => {
  const [showMenu, setShowMenu]   = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const btnRef = useRef(null);
  const isMedical = record._kind === 'medical';
  const vitals    = record.vital_records?.[0] || {};
  const name      = getFullName(record._user || record);
  const initials  = getInitials(name);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
      {/* Type */}
      <td className="p-3 pl-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          isMedical ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          <i className={`fa-solid ${isMedical ? 'fa-stethoscope' : 'fa-tooth'} text-[8px]`}></i>
          {isMedical ? 'Medical' : 'Dental'}
        </span>
      </td>

      {/* Patient */}
      <td className="p-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
            isMedical ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {initials}
          </div>
          <div>
            <p className="font-semibold text-xs text-slate-800">{name}</p>
            <p className="text-[10px] text-slate-400">
              {record._user?.role || '—'} · {record._user?.department || '—'}
            </p>
          </div>
        </div>
      </td>

      {/* ID */}
      <td className="p-3 hidden sm:table-cell">
        <span className="text-[11px] font-mono text-slate-500">
          {record.university_id || record._user?.university_id || '—'}
        </span>
      </td>

      {/* Exam date */}
      <td className="p-3 hidden md:table-cell">
        <span className="text-[11px] text-slate-500">
          {formatDate(record.exam_date || record.created_at)}
        </span>
      </td>

      {/* Details */}
      <td className="p-3 hidden lg:table-cell">
        {isMedical ? (
          <div className="flex flex-wrap gap-1">
            {vitals.bp   && <span className="text-[9px] bg-white border border-blue-100 rounded px-1.5 py-0.5 text-slate-600">BP: <strong className="text-[#466460]">{vitals.bp}</strong></span>}
            {vitals.temp && <span className="text-[9px] bg-white border border-blue-100 rounded px-1.5 py-0.5 text-slate-600">Temp: <strong className="text-[#466460]">{vitals.temp}</strong></span>}
            {record.bmi  && <span className="text-[9px] bg-white border border-blue-100 rounded px-1.5 py-0.5 text-slate-600">BMI: <strong className="text-[#466460]">{record.bmi}</strong></span>}
            {record.is_fit !== null && (
              <span className={`text-[9px] rounded px-1.5 py-0.5 font-semibold ${record.is_fit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {record.is_fit ? 'Fit' : 'Not Fit'}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {record.finding1 && <span className="text-[9px] bg-white border border-purple-100 rounded px-1.5 py-0.5 text-slate-600">{record.finding1}</span>}
            <span className="text-[9px] text-slate-400">{record.examined_by ? `Dr. ${record.examined_by}` : '—'}</span>
          </div>
        )}
      </td>

      {/* Status */}
      <td className="p-3">
        <StatusPill status={record.status} />
      </td>

      {/* Actions */}
      <td className="p-3 pr-4">
        <button
          ref={btnRef}
          onClick={() => {
            if (!showMenu && btnRef.current) {
              setAnchorRect(btnRef.current.getBoundingClientRect());
            }
            setShowMenu(v => !v);
          }}
          className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border font-semibold transition-all ${
            showMenu
              ? 'bg-[#466460] text-white border-[#466460] shadow-sm'
              : 'bg-white text-slate-500 border-slate-200 hover:border-[#466460] hover:text-[#466460]'
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
          <svg
            className={`w-2.5 h-2.5 transition-transform duration-150 ${showMenu ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && anchorRect && (
          <ActionMenu
            record={record}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onClose={() => setShowMenu(false)}
            anchorRect={anchorRect}
          />
        )}
      </td>
    </tr>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const RecordManagement = () => {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchInput, setSearchInput]   = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept]     = useState('all');
  const [sortOrder, setSortOrder]       = useState('desc');
  const [message, setMessage]           = useState(null);
  const snackbarTimer = useRef(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      const [{ data: medData, error: medErr }, { data: denData, error: denErr }] = await Promise.all([
        supabase
          .from('medical_records')
          .select('*, _user:users!medical_records_user_id_fkey(id, first_name, last_name, middle_name, email, role, department, university_id, program, year_level, section)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('dental_records')
          .select('*, _user:users!dental_records_user_id_fkey(id, first_name, last_name, middle_name, email, role, department, university_id, program, year_level, section)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
      ]);

      if (medErr) console.error('Medical error:', medErr);
      if (denErr) console.error('Dental error:', denErr);

      const med = (medData || []).map(r => ({ ...r, _kind: 'medical', _id: r.id }));
      const den = (denData || []).map(r => ({ ...r, _kind: 'dental',  _id: r.id }));

      const all = [...med, ...den].sort((a, b) =>
        (b.created_at || '').localeCompare(a.created_at || '')
      );
      setRecords(all);
    } catch (err) {
      console.error('Fetch error:', err);
      showSnackbar('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllRecords(); }, []);

  const deptOptions = ['all', ...new Set(
    records.map(r => r._user?.department).filter(Boolean)
  )].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));

  const filtered = records
    .filter(r => {
      if (filterType   !== 'all' && r._kind             !== filterType)   return false;
      if (filterStatus !== 'all' && r.status            !== filterStatus) return false;
      if (filterDept   !== 'all' && r._user?.department !== filterDept)   return false;
      if (searchInput) {
        const s    = searchInput.toLowerCase();
        const name = getFullName(r._user || r).toLowerCase();
        const uid  = (r.university_id || r._user?.university_id || '').toLowerCase();
        const email = (r._user?.email || '').toLowerCase();
        return name.includes(s) || uid.includes(s) || email.includes(s);
      }
      return true;
    })
    .sort((a, b) => {
      const da = a.exam_date || a.created_at || '';
      const db = b.exam_date || b.created_at || '';
      return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });

  const totalMed     = records.filter(r => r._kind === 'medical').length;
  const totalDen     = records.filter(r => r._kind === 'dental').length;
  const totalPending = records.filter(r => r.status === 'pending').length;

  const handleStatusChange = async (record, newStatus) => {
    const table = record._kind === 'medical' ? 'medical_records' : 'dental_records';
    const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', record._id);
    if (error) { showSnackbar('Failed to update status', 'error'); throw error; }
    setRecords(prev => prev.map(r => r._id === record._id ? { ...r, status: newStatus } : r));
    showSnackbar('Status updated');
  };

  const handleDelete = async (record) => {
    try {
      // Get current user info for deleted_by
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = localStorage.getItem('name') || '';

      // Set is_archived to true instead of deleting
      const table = record._kind === 'medical' ? 'medical_records' : 'dental_records';
      const { error } = await supabase.from(table).update({
        is_archived: true,
        deleted_by: name || user.email || 'Admin',
        updated_at: new Date().toISOString()
      }).eq('id', record._id);
      if (error) { showSnackbar('Failed to delete record', 'error'); throw error; }
      setRecords(prev => prev.filter(r => r._id !== record._id));
      showSnackbar('Record archived successfully. You can restore it from the Archives page.');
    } catch (err) {
      console.error('Failed to archive record:', err);
      showSnackbar('Failed to archive record', 'error');
    }
  };

  const selectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 7;

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#466460]">Record Management</h2>
            <p className="text-xs text-slate-400 mt-0.5">All medical and dental records</p>
          </div>
          <button
            onClick={fetchAllRecords}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Total',   count: records.length, color: 'text-slate-700'   },
            { label: 'Medical', count: totalMed,       color: 'text-blue-700'    },
            { label: 'Dental',  count: totalDen,       color: 'text-purple-700'  },
            { label: 'Pending', count: totalPending,   color: 'text-amber-700'   },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-2">
              <span className={`text-base font-bold ${s.color}`}>{s.count}</span>
              <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

          <div className="flex flex-wrap gap-2 items-center flex-1">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`${selectCls} w-28`}>
              <option value="all">All types</option>
              <option value="medical">Medical</option>
              <option value="dental">Dental</option>
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${selectCls} w-28`}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s} className="capitalize">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={`${selectCls} w-36`}>
              <option value="all">All departments</option>
              {deptOptions.filter(d => d !== 'all').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-600 hover:border-[#466460] hover:text-[#466460] transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
            </button>

            <span className="ml-auto text-[10px] text-slate-400 font-medium whitespace-nowrap">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-3 pl-4 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden sm:table-cell">ID</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Exam Date</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Details</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left p-3 pr-4 text-[10px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
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
                      <span className="text-sm">Loading records…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16">
                    <i className="fa-regular fa-folder-open text-slate-200 text-4xl block mb-2"></i>
                    <p className="text-slate-400 text-sm">No records found</p>
                  </td>
                </tr>
              ) : filtered.map(record => (
                <RecordRow
                  key={`${record._kind}-${record._id}`}
                  record={record}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl transition-all ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success'
            ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          }
          {message.text}
        </div>
      )}
    </div>
  );
};

export default RecordManagement;