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

const RETENTION_DAYS = 14; // keep in sync with archive_old_audit_logs() default in SQL
const PERMANENT_RETENTION_DAYS = 90; // keep in sync with archive_old_audit_logs() default in SQL

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'archived'
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0, users: 0, actions: 0 });
  const [message, setMessage] = useState(null);

  const snackbarTimer = useRef(null);
  const searchTimeout = useRef(null);

  const isArchived = viewMode === 'archived';

  // Archived rows come back from public.archives as
  // { id, type, original_id, data, archived_at, ... } — flatten `data`
  // (the original audit_logs row) back into a log-shaped object so the
  // rest of the component can render it the same way as a live row.
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

  const calculateStats = useCallback((logData) => {
    const todayStr = new Date().toDateString();
    const uniqueUsers = new Set(logData.map(l => l.userId || l.userEmail)).size;
    const uniqueActions = new Set(logData.map(l => l.action)).size;

    setStats({
      total: logData.length,
      today: logData.filter(l => new Date(l.created_at || l.timestamp).toDateString() === todayStr).length,
      users: uniqueUsers,
      actions: uniqueActions,
    });
  }, []);

  // Build query constraints dynamically for server-side processing.
  // Archived rows live inside a jsonb `data` column, so filters there
  // need to reach into the JSON path instead of a plain column.
  const buildQuery = useCallback((baseQuery) => {
    let q = baseQuery;
    if (typeFilter !== 'all') {
      q = isArchived ? q.eq('data->>type', typeFilter) : q.eq('type', typeFilter);
    }
    if (searchInput.trim()) {
      const term = `%${searchInput.trim()}%`;
      q = isArchived
        ? q.or(`data->>userName.ilike.${term},data->>userEmail.ilike.${term},data->>description.ilike.${term},data->>action.ilike.${term}`)
        : q.or(`userName.ilike.${term},userEmail.ilike.${term},description.ilike.${term},action.ilike.${term}`);
    }
    return q;
  }, [typeFilter, searchInput, isArchived]);

  // Archived rows sort/paginate on archived_at (top-level column);
  // live rows sort/paginate on created_at, same as before.
  const cursorField = isArchived ? 'archived_at' : 'created_at';

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = isArchived
        ? supabase.from('archives').select('*').eq('type', 'audit_log')
        : supabase.from('audit_logs').select('*');

      query = buildQuery(query);
      query = query.order(cursorField, { ascending: false }).limit(50);

      const { data, error } = await query;
      if (error) throw error;

      const rawRows = data || [];
      const fetchedLogs = isArchived ? rawRows.map(normalizeArchiveRow) : rawRows;
      setLogs(fetchedLogs);
      setLastDoc(rawRows[rawRows.length - 1] || null);
      setHasMore(rawRows.length === 50);
      calculateStats(fetchedLogs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      showSnackbar('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, calculateStats, isArchived, cursorField]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      let query = isArchived
        ? supabase.from('archives').select('*').eq('type', 'audit_log')
        : supabase.from('audit_logs').select('*');

      query = buildQuery(query);
      query = query
        .lt(cursorField, lastDoc[cursorField])
        .order(cursorField, { ascending: false })
        .limit(50);

      const { data, error } = await query;
      if (error) throw error;

      const rawRows = data || [];
      const newLogs = isArchived ? rawRows.map(normalizeArchiveRow) : rawRows;
      setLogs(prev => {
        const combined = [...prev, ...newLogs];
        calculateStats(combined);
        return combined;
      });
      setLastDoc(rawRows[rawRows.length - 1] || null);
      setHasMore(rawRows.length === 50);
    } catch (err) {
      console.error('Error loading more logs:', err);
      showSnackbar('Failed to load more logs', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Debounced search to prevent overwhelming Supabase on every keystroke
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchLogs();
    }, 400);
  };

  // Trigger query refetch whenever filter/view adjustments occur
  useEffect(() => {
    fetchLogs();
  }, [typeFilter, viewMode]);

  // Manually invoke the retention sweep (mirrors the daily pg_cron job).
  // Useful for testing, or as a fallback if pg_cron isn't enabled on your project.
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

  // Clean layout array mapped directly to CSV strings for compliance reports
  const exportComplianceReport = () => {
    if (logs.length === 0) {
      showSnackbar('No data available to export', 'error');
      return;
    }

    const headers = ['Timestamp', 'User Name', 'User Email', 'User ID', 'Action', 'Type', 'Description', 'Details'];
    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        `"${formatDate(log.created_at || log.timestamp)}"`,
        `"${log.userName || ''}"`,
        `"${log.userEmail || ''}"`,
        `"${log.userId || ''}"`,
        `"${log.action || ''}"`,
        `"${log.type || ''}"`,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ].join(','))
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

  const filterSelectCls = "px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">Audit Logs</h2>
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap justify-end">
            <button
              onClick={runArchiveNow}
              disabled={archiving || viewMode === 'archived'}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Move logs older than ${RETENTION_DAYS} days to the archive now`}
            >
              <i className={`fa-solid ${archiving ? 'fa-spinner fa-spin' : 'fa-box-archive'} text-slate-500`}></i>
              <span>{archiving ? 'Archiving…' : 'Archive Now'}</span>
            </button>
            <button
              onClick={exportComplianceReport}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
              title="Export filtered records to CSV"
            >
              <i className="fa-solid fa-file-export text-slate-500"></i>
              <span>Export Report</span>
            </button>
            <button
              onClick={() => fetchLogs()}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mb-4">
          Logs are kept for {RETENTION_DAYS} days, then archived automatically.
        </p>

        {/* View mode toggle */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 mb-4 shadow-sm">
          <button
            onClick={() => setViewMode('live')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'live' ? 'bg-[#466460] text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setViewMode('archived')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'archived' ? 'bg-[#466460] text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Archived
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Loaded Logs</div>
            <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Today</div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600">{stats.today}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Active Users</div>
            <div className="text-xl md:text-2xl font-extrabold text-blue-600">{stats.users}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Action Types</div>
            <div className="text-xl md:text-2xl font-extrabold text-purple-600">{stats.actions}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-slate-200 p-3 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-44`}
            >
              {ACTIVITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search user, action, details..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-xl border border-slate-200">
        <div className="h-full overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
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
                  <td colSpan={6} className="text-center py-12 text-slate-400">
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
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-solid fa-clipboard-list text-3xl text-slate-300"></i>
                      <p>No {viewMode === 'archived' ? 'archived' : ''} audit logs found</p>
                      <p className="text-xs text-slate-400">Activities matching filters will appear here once recorded</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {/* Timestamp */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-xs text-slate-600 font-medium">{formatDate(log.created_at || log.timestamp)}</div>
                    </td>

                    {/* User */}
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

                    {/* Action */}
                    <td className="p-3 whitespace-nowrap">
                      <ActionPill action={log.action} />
                    </td>

                    {/* Type */}
                    <td className="p-3 whitespace-nowrap">
                      <TypePill type={log.type} />
                    </td>

                    {/* Description */}
                    <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                      <span className="truncate block" title={log.description}>{log.description || '—'}</span>
                    </td>

                    {/* Details */}
                    <td className="p-3 text-xs text-slate-500 hidden lg:table-cell max-w-[150px]">
                      <span className="truncate block" title={log.details}>{log.details || '—'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Load More */}
          {hasMore && !loading && (
            <div className="p-4 text-center border-t border-slate-200">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
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