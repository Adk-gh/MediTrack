// frontend/src/features/admin-clinic/AuditLogs.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'auth', label: 'Authentication' },
  { value: 'user', label: 'User Management' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'examination', label: 'Examinations' },
  { value: 'archive', label: 'Archives' },
  { value: 'system', label: 'System' },
];

const RETENTION_DAYS = 14;
const PERMANENT_RETENTION_DAYS = 90;
const ITEMS_PER_PAGE = 100;

const ACTION_COLORS = {
  create:       { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-plus' },
  read:         { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: 'fa-eye' },
  update:       { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: 'fa-pen' },
  delete:       { bg: 'bg-red-100',    text: 'text-red-700',    icon: 'fa-trash' },
  archive:      { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: 'fa-box-archive' },
  end:          { bg: 'bg-rose-100',    text: 'text-rose-700',    icon: 'fa-stop' },
  restore:      { bg: 'bg-teal-100',    text: 'text-teal-700',    icon: 'fa-arrow-rotate-left' },
  cleanup:      { bg: 'bg-orange-100',  text: 'text-orange-700',  icon: 'fa-broom' },
  login:        { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-right-to-bracket' },
  logout:       { bg: 'bg-slate-100',  text: 'text-slate-600',  icon: 'fa-right-from-bracket' },
  register:     { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'fa-user-plus' },
  approve:      { bg: 'bg-teal-100',   text: 'text-teal-700',   icon: 'fa-check' },
  reject:       { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-xmark' },
  ocr_start:    { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'fa-gear fa-spin' },
  ocr_success:  { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-file-circle-check' },
  ocr_failed:   { bg: 'bg-rose-100',    text: 'text-rose-700',    icon: 'fa-file-circle-exclamation' },
};

const getActionStyle = (action) =>
  ACTION_COLORS[action?.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'fa-circle' };

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return timestamp;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

const getInitials = (name = '') => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const ActionPill = ({ action }) => {
  const s = getActionStyle(action);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.bg} ${s.text}`}>
      <i className={`fa-solid ${s.icon} text-[8px]`}></i>
      {action?.replace('_', ' ') || 'action'}
    </span>
  );
};

const TypePill = ({ type }) => (
  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600 uppercase">
    {type || 'system'}
  </span>
);

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'archived'
  const [typeFilter, setTypeFilter] = useState('all');

  // Search & Pagination States
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [stats, setStats] = useState({ total: 0, today: 0, users: 0, actions: 0 });
  const [message, setMessage] = useState(null);

  // Confirmation modal state: 'archive' | 'export' | null
  const [confirmAction, setConfirmAction] = useState(null);

  const snackbarTimer = useRef(null);
  const searchTimeout = useRef(null);

  const isArchived = viewMode === 'archived';
  const cursorField = isArchived ? 'archived_at' : 'created_at';
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  const normalizeArchiveRow = (row) => ({
    ...row.data,
    id: row.original_id,
    archived_at: row.archived_at,
    permanent_delete_at: row.permanent_delete_at,
  });

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, viewMode, debouncedSearch]);

  const buildQuery = useCallback((baseQuery) => {
    let q = baseQuery;
    if (typeFilter !== 'all') {
      q = isArchived ? q.eq('data->>type', typeFilter) : q.eq('type', typeFilter);
    }
    if (debouncedSearch.trim()) {
      const term = `%${debouncedSearch.trim()}%`;
      q = isArchived
        ? q.or(`data->>userName.ilike.${term},data->>userEmail.ilike.${term},data->>description.ilike.${term},data->>action.ilike.${term}`)
        : q.or(`userName.ilike.${term},userEmail.ilike.${term},description.ilike.${term},action.ilike.${term}`);
    }
    return q;
  }, [typeFilter, debouncedSearch, isArchived]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = isArchived
        ? supabase.from('archives').select('*', { count: 'exact' }).eq('type', 'audit_log')
        : supabase.from('audit_logs').select('*', { count: 'exact' });

      query = buildQuery(query);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      query = query
        .order(cursorField, { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      const rawRows = data || [];
      const fetchedLogs = isArchived ? rawRows.map(normalizeArchiveRow) : rawRows;

      setLogs(fetchedLogs);
      setTotalRecords(count || 0);

      // Compute stats for current page visualization
      const todayStr = new Date().toDateString();
      const uniqueUsers = new Set(fetchedLogs.map(l => l.userId || l.userEmail)).size;
      const uniqueActions = new Set(fetchedLogs.map(l => l.action)).size;

      setStats({
        total: count || 0,
        today: fetchedLogs.filter(l => new Date(l.created_at || l.timestamp).toDateString() === todayStr).length,
        users: uniqueUsers,
        actions: uniqueActions,
      });

    } catch (err) {
      console.error('Error fetching audit logs:', err);
      showSnackbar('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, isArchived, cursorField, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 400);
  };

  const runArchiveNow = async () => {
    try {
      setArchiving(true);
      const { data, error } = await supabase.rpc('archive_old_audit_logs', {
        retention_days: RETENTION_DAYS,
        permanent_retention_days: PERMANENT_RETENTION_DAYS,
      });
      if (error) throw error;
      showSnackbar(`Archived ${data ?? 0} log${data === 1 ? '' : 's'} older than ${RETENTION_DAYS} days`);
      if (viewMode === 'live') fetchLogs();
    } catch (err) {
      console.error('Error archiving logs:', err);
      showSnackbar('Failed to archive logs', 'error');
    } finally {
      setArchiving(false);
    }
  };

  const exportComplianceReport = () => {
    if (logs.length === 0) {
      showSnackbar('No data available to export', 'error');
      return;
    }

    const headers = ['Timestamp', 'User Name', 'User Email', 'User ID', 'Action', 'Type', 'Description', 'Details'];
    const csvRows = [
      headers.join(','),
      ...logs.map(log => {
        // Safely stringify objects to avoid [object Object] in CSV exports
        const safeDesc = typeof log.description === 'object' ? JSON.stringify(log.description) : (log.description || '');
        const safeDetails = typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '');

        return [
          `"${formatDate(log.created_at || log.timestamp)}"`,
          `"${log.userName || ''}"`,
          `"${log.userEmail || ''}"`,
          `"${log.userId || ''}"`,
          `"${log.action || ''}"`,
          `"${log.type || ''}"`,
          `"${safeDesc.replace(/"/g, '""')}"`,
          `"${safeDetails.replace(/"/g, '""')}"`
        ].join(',');
      })
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `compliance_report_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSnackbar('Compliance report exported successfully!');
  };

  // ── Confirmation modal handlers ──
  const handleArchiveClick = () => setConfirmAction('archive');
  const handleExportClick = () => setConfirmAction('export');

  const handleConfirm = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'archive') {
      await runArchiveNow();
    } else if (action === 'export') {
      exportComplianceReport();
    }
  };

  const selectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";

  const summaryStats = [
    { label: 'Total',  count: stats.total,   color: 'text-slate-700'   },
    { label: 'Today',  count: stats.today,   color: 'text-emerald-700' },
    { label: 'Users',  count: stats.users,   color: 'text-blue-700'    },
    { label: 'Types',  count: stats.actions, color: 'text-purple-700'  },
  ];

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Summary stats — its own row, separate from the toolbar, stretched full width */}
      <div className="shrink-0 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summaryStats.map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm flex items-center justify-center gap-2">
            <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Unified Inline Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

          {/* Left side: Search & Filters */}
          <div className="flex flex-wrap gap-3 items-center flex-1 w-full xl:w-auto">
            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search user, action, details..."
                value={searchInput}
                onChange={handleSearchChange}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>

            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value)}
              className={`${selectCls} w-full sm:w-32`}
            >
              <option value="live">Live Logs</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`${selectCls} w-full sm:w-44`}
            >
              {ACTIVITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleArchiveClick}
              disabled={archiving || viewMode === 'archived'}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Move logs older than ${RETENTION_DAYS} days to the archive now`}
            >
              <i className={`fa-solid ${archiving ? 'fa-spinner fa-spin' : 'fa-box-archive'} text-slate-400`}></i>
              <span className="hidden sm:inline">{archiving ? 'Archiving…' : 'Archive'}</span>
            </button>

            <button
              onClick={handleExportClick}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm"
              title="Export filtered records to CSV"
            >
              <i className="fa-solid fa-file-export text-slate-400"></i>
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => fetchLogs()}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-center p-3 pl-4 w-12 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Timestamp</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">User</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Action</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Description</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Details</th>
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
                      Loading audit logs…
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-solid fa-clipboard-list text-3xl text-slate-300"></i>
                      <p>No {viewMode === 'archived' ? 'archived' : ''} audit logs found</p>
                      <p className="text-xs text-slate-400">Activities matching filters will appear here once recorded</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-xs text-slate-600 font-medium">{formatDate(log.created_at || log.timestamp)}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-xs shrink-0">
                          {getInitials(log.userName || log.userEmail)}
                        </div>
                        <div>
                          <div className="text-sm text-slate-700 font-medium whitespace-nowrap">{log.userName || '—'}</div>
                          <div className="text-xs text-slate-400">{log.userEmail || log.userId || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <ActionPill action={log.action} />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <TypePill type={log.type} />
                    </td>
                    <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                      <span
                        className="truncate block"
                        title={typeof log.description === 'object' ? JSON.stringify(log.description) : log.description}
                      >
                        {typeof log.description === 'object' ? JSON.stringify(log.description) : (log.description || '—')}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 hidden lg:table-cell max-w-[150px]">
                      <span
                        className="truncate block"
                        title={typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      >
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '—')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{totalRecords === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)}</span> of <span className="font-semibold">{totalRecords}</span> records
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
                Page {currentPage} of {Math.max(1, totalPages)}
              </div>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal (Archive / Export) */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                confirmAction === 'archive' ? 'bg-amber-100' : 'bg-blue-100'
              }`}>
                <i className={`fa-solid ${confirmAction === 'archive' ? 'fa-box-archive text-amber-600' : 'fa-file-export text-blue-600'} text-lg`}></i>
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {confirmAction === 'archive' ? 'Archive old logs?' : 'Export logs to CSV?'}
              </h3>
            </div>

            <p className="text-sm text-slate-600 mb-2">
              {confirmAction === 'archive'
                ? `This will move all logs older than ${RETENTION_DAYS} days into the archive.`
                : `This will download the ${logs.length} record${logs.length === 1 ? '' : 's'} currently shown in the table as a CSV file.`}
            </p>

            {confirmAction === 'archive' && (
              <p className="text-xs text-slate-400 mb-4">
                Logs are kept for {RETENTION_DAYS} days, then archived automatically — this just runs it now.
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all ${
                  confirmAction === 'archive' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#466460] hover:bg-[#3a524f]'
                }`}
              >
                {confirmAction === 'archive' ? 'Archive Now' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
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

export default AuditLogs;