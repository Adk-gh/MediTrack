// frontend/src/features/admin-clinic/Record-Management.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { logAdminAction } from '../../services/audit.service';
import DatePicker from '../../components/Datepicker';

const STATUS_OPTIONS = ['pending', 'approved'];
const EDIT_STATUS_OPTIONS = ['pending', 'approved'];
const CERT_OPTIONS = [
  { value: 'all', label: 'All Certificates' },
  { value: 'issued', label: 'Issued' },
  { value: 'not_issued', label: 'Not Issued' },
];

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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {status || 'unknown'}
    </span>
  );
};

// ── Record row ─────────────────────────────────────────────────────────────
const RecordRow = ({ index, record, onEdit, onDelete }) => {
  const isMedical = record._kind === 'medical';
  const name      = getFullName(record._user || record);
  const initials  = getInitials(name);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
      {/* Number Index */}
      <td className="p-3 pl-4 text-sm font-semibold text-slate-500 w-12 text-center">
        {index}
      </td>

      {/* Type */}
      <td className="p-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
          isMedical ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          <i className={`fa-solid ${isMedical ? 'fa-stethoscope' : 'fa-tooth'} text-[9px]`}></i>
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
            <p className="font-semibold text-sm text-slate-800">{name}</p>
            <p className="text-xs text-slate-400">
              {record._user?.role || '—'} · {record._user?.department || '—'}
            </p>
          </div>
        </div>
      </td>

      {/* ID (Enlarged and bolded for visibility) */}
      <td className="p-3 hidden sm:table-cell">
        <span className="text-sm font-bold text-slate-700 tracking-wide">
          {record.university_id || record._user?.university_id || '—'}
        </span>
      </td>

      {/* Exam date */}
      <td className="p-3 hidden md:table-cell">
        <span className="text-sm text-slate-500">
          {formatDate(record.exam_date || record.created_at)}
        </span>
      </td>

      {/* Details */}
      <td className="p-3 hidden lg:table-cell">
        {isMedical ? (
          <div className="flex flex-wrap gap-2">
            {record.physician && (
              <span className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-500 shadow-sm">
                MD: <strong className="text-slate-800 font-semibold">{record.physician}</strong>
              </span>
            )}
            {record.nurse_on_duty && (
              <span className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-500 shadow-sm">
                RN: <strong className="text-slate-800 font-semibold">{record.nurse_on_duty}</strong>
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {record.examined_by ? (
              <span className="text-xs bg-white border border-purple-200 rounded px-2.5 py-1.5 text-purple-600 shadow-sm">
                DMD: <strong className="text-slate-800 font-semibold">{record.examined_by}</strong>
              </span>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="p-3">
        <StatusPill status={record.status} />
      </td>

      {/* Document (Issued / Not Issued) */}
      <td className="p-3 whitespace-nowrap hidden sm:table-cell">
        {record.issue_cert ? (
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">
            Issued
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-500">
            Not Issued
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="p-3 pr-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(record)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all"
            title="Edit Record"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(record)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-all"
            title="Archive Record"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const RecordManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);

  // Filters
  const [searchInput, setSearchInput]   = useState('');
  const [filterType, setFilterType]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDept, setFilterDept]     = useState('all');
  const [filterDate, setFilterDate]     = useState('');
  const [filterCert, setFilterCert]     = useState('all');
  const [sortOrder, setSortOrder]       = useState('desc');
  const [message, setMessage]           = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage]   = useState(1);
  const ITEMS_PER_PAGE = 100;

  const snackbarTimer = useRef(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord]       = useState(null);
  const [editStatus, setEditStatus]       = useState('pending');
  const [editIssueCert, setEditIssueCert] = useState(false);
  const [savingEdit, setSavingEdit]       = useState(false);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, filterType, filterStatus, filterDept, filterDate, filterCert, sortOrder]);

  const deptOptions = ['all', ...new Set(
    records.map(r => r._user?.department).filter(Boolean)
  )].sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));

  const filtered = records
    .filter(r => {
      if (filterType   !== 'all' && r._kind            !== filterType)   return false;
      if (filterStatus !== 'all' && r.status           !== filterStatus) return false;
      if (filterDept   !== 'all' && r._user?.department !== filterDept)   return false;
      if (filterCert === 'issued' && r.issue_cert !== true) return false;
      if (filterCert === 'not_issued' && r.issue_cert === true) return false;
      if (filterDate) {
        const recDateStr = (r.exam_date || r.created_at || '').split('T')[0];
        if (recDateStr !== filterDate) return false;
      }
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

  const totalMed      = filtered.filter(r => r._kind === 'medical').length;
  const totalDen      = filtered.filter(r => r._kind === 'dental').length;
  const totalPending  = filtered.filter(r => r.status === 'pending').length;
  const totalApproved = filtered.filter(r => r.status === 'approved' || r.status === 'done').length;
  const totalIssued   = filtered.filter(r => r.issue_cert === true).length;
  const totalNotIssue = filtered.filter(r => r.issue_cert !== true).length;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedRecords = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openEditModal = (record) => {
    setEditRecord(record);
    setEditStatus(record.status || 'pending');
    setEditIssueCert(record.issue_cert || false);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditRecord(null);
  };

  const handleEditSave = async () => {
    if (!editRecord) return;
    setSavingEdit(true);
    try {
      const table = editRecord._kind === 'medical' ? 'medical_records' : 'dental_records';
      const updates = {
        status: editStatus,
        is_approved: editStatus === 'approved',
        approved_at: editStatus === 'approved' ? new Date().toISOString() : null,
        issue_cert: editIssueCert,
      };

      const { error } = await supabase.from(table).update(updates).eq('id', editRecord._id);
      if (error) throw error;

      logAdminAction({
        action: 'record_updated',
        details: {
          recordId: editRecord._id,
          recordType: editRecord._kind,
          newStatus: editStatus,
          issueCert: editIssueCert,
          table,
        },
        adminUid,
      });

      setRecords(prev => prev.map(r => r._id === editRecord._id ? { ...r, ...updates } : r));
      showSnackbar('Record updated successfully');
      closeEditModal();
    } catch (err) {
      console.error('Failed to update record:', err);
      showSnackbar('Failed to update record', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setDeleting(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = localStorage.getItem('name') || '';

      const table = recordToDelete._kind === 'medical' ? 'medical_records' : 'dental_records';
      const { error } = await supabase.from(table).update({
        is_archived: true,
        deleted_by: name || user.email || 'Admin',
        updated_at: new Date().toISOString()
      }).eq('id', recordToDelete._id);
      if (error) { showSnackbar('Failed to delete record', 'error'); throw error; }

      logAdminAction({
        action: 'record_archived',
        details: {
          recordId: recordToDelete._id,
          recordType: recordToDelete._kind,
          table,
        },
        adminUid,
      });

      setRecords(prev => prev.filter(r => r._id !== recordToDelete._id));
      showSnackbar('Record archived successfully. You can restore it from the Archives page.');
    } catch (err) {
      console.error('Failed to archive record:', err);
      showSnackbar('Failed to archive record', 'error');
    } finally {
      setShowDeleteModal(false);
      setRecordToDelete(null);
      setDeleting(false);
    }
  };

  const selectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 9; // Updated for the new Document column

const summaryStats = [
    { label: 'Total',      count: filtered.length, color: 'text-slate-800'   },
    { label: 'Medical',    count: totalMed,        color: 'text-blue-600'    },
    { label: 'Dental',     count: totalDen,        color: 'text-purple-600'  },
    { label: 'Pending',    count: totalPending,    color: 'text-amber-600'   },
    { label: 'Approved',   count: totalApproved,   color: 'text-emerald-600' },
    { label: 'Issued Cert',count: totalIssued,     color: 'text-sky-600'     },
    { label: 'Not Issued', count: totalNotIssue,   color: 'text-slate-400'   },
  ];

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Summary stats */}
      <div className="shrink-0 mb-4 flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-[4px] [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
        {summaryStats.map(s => (
          <div key={s.label} className="flex-1 min-w-[110px] bg-white border border-slate-200 rounded-lg px-2 py-3 shadow-sm flex flex-col items-center justify-center">
            <span className={`text-xl font-bold leading-none mb-1.5 ${s.color}`}>{s.count}</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Combined Inline Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

          <div className="flex flex-wrap gap-3 items-center flex-1">

            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, ID, email…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>

            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`${selectCls} min-w-[120px]`}>
              <option value="all">All types</option>
              <option value="medical">Medical</option>
              <option value="dental">Dental</option>
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${selectCls} min-w-[140px]`}>
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s} className="capitalize">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select value={filterCert} onChange={e => setFilterCert(e.target.value)} className={`${selectCls} min-w-[140px]`}>
              {CERT_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={`${selectCls} min-w-[160px]`}>
              <option value="all">All departments</option>
              {deptOptions.filter(d => d !== 'all').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-40">
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                placeholder="All Dates"
                className={`${selectCls} w-full pr-8`}
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-slate-400 hover:bg-slate-600 text-white flex items-center justify-center shadow-md z-10 transition-colors"
                  title="Clear date filter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-600 hover:border-[#466460] hover:text-[#466460] transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
            </button>
          </div>

          <button
              onClick={fetchAllRecords}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center p-3 pl-4 w-12 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden sm:table-cell">ID</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Exam Date</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Details</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden sm:table-cell">Document</th>
                <th className="text-left p-3 pr-4 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
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
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16">
                    <i className="fa-regular fa-folder-open text-slate-200 text-4xl block mb-2"></i>
                    <p className="text-slate-400 text-sm">No records found</p>
                  </td>
                </tr>
              ) : paginatedRecords.map((record, index) => (
                <RecordRow
                  key={`${record._kind}-${record._id}`}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  record={record}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-semibold">{filtered.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>
              <div className="text-xs font-semibold px-2">
                Page {currentPage} of {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal using Portal */}
      {showEditModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={closeEditModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#466460" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Record</h3>
                <p className="text-sm text-slate-500">
                  {editRecord ? getFullName(editRecord._user || editRecord) : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Status Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Status</label>
                <div className="flex gap-2">
                  {EDIT_STATUS_OPTIONS.map(s => {
                    const style = getStatusStyle(s);
                    const isSelected = editStatus === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setEditStatus(s)}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold capitalize transition ${
                          isSelected
                            ? `${style.bg} ${style.text} border-2 border-current`
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Issue Cert Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                  {editRecord?._kind === 'dental' ? 'Dental Report Sent' : 'Certificate Issued'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditIssueCert(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      !editIssueCert
                        ? 'bg-red-100 text-red-700 border-2 border-red-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> No
                  </button>
                  <button
                    onClick={() => setEditIssueCert(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      editIssueCert
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-check mr-1"></i> Yes
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={savingEdit || !editRecord}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#466460] text-white font-semibold hover:bg-[#3a524f] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal using Portal */}
      {showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={() => { setShowDeleteModal(false); setRecordToDelete(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Archive Record</h3>
                <p className="text-sm text-slate-500">You can restore it later from Archives</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to archive this {recordToDelete?._kind} record for <span className="font-semibold">{recordToDelete?._user ? `${recordToDelete._user.last_name}, ${recordToDelete._user.first_name}` : 'Unknown Patient'}</span>?
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Current status: <span className="font-semibold">{recordToDelete?.status || 'Pending'}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setRecordToDelete(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Archiving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0a3 3 0 013 3h-2.25a3 3 0 013-3m0 0h.008v.008h-.008V14.25m0 0h2.25a3 3 0 003-3v-2.25a3 3 0 00-3-3H9.75a3 3 0 00-3 3v2.25a3 3 0 003 3h2.25z" />
                    </svg>
                    Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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