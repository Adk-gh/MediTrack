// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\AuditLogs.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker';

// ─── Brand palette ────────────────────────────────────────────────────────────
const BRAND = '466460';
const BRAND_DARK = '3A524F';
const HEADER_TEXT = 'FFFFFF';
const LIGHT_BG = 'F4F7F6';
const BORDER_COLOR = 'D9E2E1';

const thinBorder = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

function addTitleBanner(ws, title, subtitleLines, colSpan = 4) {
  ws.mergeCells(1, 1, 1, colSpan);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: HEADER_TEXT } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  ws.getRow(1).height = 30;

  subtitleLines.forEach((line, i) => {
    ws.mergeCells(2 + i, 1, 2 + i, colSpan);
    const c = ws.getCell(2 + i, 1);
    c.value = line;
    c.font = { size: 10, color: { argb: '5B6B69' }, italic: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
  });
  return 2 + subtitleLines.length + 1;
}

function addSectionHeader(ws, row, text, colSpan) {
  ws.mergeCells(row, 1, row, colSpan);
  const c = ws.getCell(row, 1);
  c.value = text;
  c.font = { bold: true, size: 12, color: { argb: HEADER_TEXT } };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } };
  c.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 22;
  return row + 1;
}

function addTableHeader(ws, row, headers) {
  headers.forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: HEADER_TEXT } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    c.border = thinBorder;
    c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
  });
  ws.getRow(row).height = 18;
  return row + 1;
}

function addDataRow(ws, row, values, { zebra = false, boldFirst = false } = {}) {
  values.forEach((v, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = v;
    c.border = thinBorder;
    c.font = { size: 10, bold: boldFirst && i === 0 };
    c.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: i >= 7 };
    if (zebra) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFA' } };
  });
  return row + 1;
}

// ─── Activity Types ─────────────────────────────────────────────────────────
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
const EXPORT_BATCH_SIZE = 1000;

// ─── Action Colors ───────────────────────────────────────────────────────────
const ACTION_COLORS = {
  create: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-plus' },
  read: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fa-eye' },
  update: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'fa-pen' },
  delete: { bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-trash' },
  archive: { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'fa-box-archive' },
  end: { bg: 'bg-rose-100', text: 'text-rose-700', icon: 'fa-stop' },
  restore: { bg: 'bg-teal-100', text: 'text-teal-700', icon: 'fa-arrow-rotate-left' },
  cleanup: { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-broom' },
  login: { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-right-to-bracket' },
  logout: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'fa-right-from-bracket' },
  register: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'fa-user-plus' },
  approve: { bg: 'bg-teal-100', text: 'text-teal-700', icon: 'fa-check' },
  reject: { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-xmark' },
  ocr_start: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: 'fa-gear fa-spin' },
  ocr_success: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-file-circle-check' },
  ocr_failed: { bg: 'bg-rose-100', text: 'text-rose-700', icon: 'fa-file-circle-exclamation' },
};

const getActionStyle = (action) => ACTION_COLORS[action?.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'fa-circle' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return timestamp;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const getInitials = (name = '') => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'object' ? (JSON.stringify(value) || String(value)) : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const parseDetails = (details) => {
  if (!details) return [];
  let parsed = details;

  if (typeof details === 'string') {
    try {
      parsed = JSON.parse(details);
    } catch (e) {
      return [{ key: null, value: details }];
    }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    return Object.entries(parsed).map(([k, v]) => ({
      key: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof v === 'object' ? JSON.stringify(v) : String(v)
    }));
  }

  return [{ key: null, value: String(parsed) }];
};

// ─── UI Pills ────────────────────────────────────────────────────────────────
const ActionPill = ({ action }) => {
  const s = getActionStyle(action);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.bg} ${s.text}`}>
      <i className={`fa-solid ${s.icon} text-[8px]`}></i>{action?.replace('_', ' ') || 'action'}
    </span>
  );
};

const TypePill = ({ type }) => (
  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600 uppercase">{type || 'system'}</span>
);

const StatusPill = ({ isArchived }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isArchived ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
    <i className={`fa-solid ${isArchived ? 'fa-box-archive' : 'fa-bolt'} text-[8px]`}></i>{isArchived ? 'Archived' : 'Live'}
  </span>
);

// ─── Shared Styles ───────────────────────────────────────────────────────────
const selectCls = 'px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm';
const compactSelectCls = `${selectCls} w-full sm:w-auto max-w-[160px] truncate`;
const compactWideSelectCls = `${selectCls} w-full sm:w-auto max-w-[180px] truncate`;

// ─── Main Component ──────────────────────────────────────────────────────────
export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [viewMode, setViewMode] = useState('live');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState({ total: 0, today: 0, users: 0, actions: 0 });
  const [message, setMessage] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [exportFormat, setExportFormat] = useState('xlsx');

  const snackbarTimer = useRef(null);
  const searchTimeout = useRef(null);

  const isArchived = viewMode === 'archived';
  const cursorField = isArchived ? 'archived_at' : 'created_at';
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  const normalizeArchiveRow = useCallback((row) => ({
    ...(row.data || {}), id: row.original_id, archived_at: row.archived_at, permanent_delete_at: row.permanent_delete_at,
  }), []);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => { setCurrentPage(1); }, [typeFilter, viewMode, debouncedSearch, dateFilter]);

  const buildQuery = useCallback((baseQuery) => {
    let q = baseQuery;

    if (typeFilter !== 'all') {
      q = isArchived ? q.eq('data->>type', typeFilter) : q.eq('type', typeFilter);
    }

    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);

      const dateColumn = isArchived ? 'data->>created_at' : 'created_at';
      q = q.gte(dateColumn, startOfDay.toISOString()).lte(dateColumn, endOfDay.toISOString());
    }

    if (debouncedSearch.trim()) {
      const term = `%${debouncedSearch.trim()}%`;
      q = isArchived
        ? q.or(`data->>userName.ilike.${term},data->>userEmail.ilike.${term},data->>description.ilike.${term},data->>action.ilike.${term}`)
        : q.or(`userName.ilike.${term},userEmail.ilike.${term},description.ilike.${term},action.ilike.${term}`);
    }
    return q;
  }, [typeFilter, debouncedSearch, isArchived, dateFilter]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = isArchived
        ? supabase.from('archives').select('*', { count: 'exact' }).eq('type', 'audit_log')
        : supabase.from('audit_logs').select('*', { count: 'exact' });

      query = buildQuery(query);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.order(cursorField, { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      const fetchedLogs = isArchived ? (data || []).map(normalizeArchiveRow) : (data || []);
      setLogs(fetchedLogs);
      setTotalRecords(count || 0);

      const todayStr = new Date().toDateString();
      setStats({
        total: count || 0,
        today: fetchedLogs.filter(l => new Date(l.created_at || l.timestamp).toDateString() === todayStr).length,
        users: new Set(fetchedLogs.map(l => l.userId || l.userEmail)).size,
        actions: new Set(fetchedLogs.map(l => l.action)).size,
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      showSnackbar('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, isArchived, cursorField, currentPage, normalizeArchiveRow]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(e.target.value), 400);
  };

  const runArchiveNow = async () => {
    try {
      setArchiving(true);
      const { data, error } = await supabase.rpc('archive_old_audit_logs', { retention_days: RETENTION_DAYS, permanent_retention_days: PERMANENT_RETENTION_DAYS });
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

  const fetchAllAuditLogs = useCallback(async () => {
    let allRows = [];
    let from = 0;
    while (true) {
      let query = isArchived ? supabase.from('archives').select('*').eq('type', 'audit_log') : supabase.from('audit_logs').select('*');
      query = buildQuery(query);
      const { data, error } = await query.order(cursorField, { ascending: false }).range(from, from + EXPORT_BATCH_SIZE - 1);
      if (error) throw error;

      const rows = data || [];
      allRows.push(...rows);
      if (rows.length < EXPORT_BATCH_SIZE) break;
      from += EXPORT_BATCH_SIZE;
    }
    return isArchived ? allRows.map(normalizeArchiveRow) : allRows;
  }, [buildQuery, cursorField, isArchived, normalizeArchiveRow]);

  const exportComplianceReport = async () => {
    try {
      showSnackbar(`Preparing all ${isArchived ? 'archived' : 'live'} audit logs...`);
      const exportLogs = await fetchAllAuditLogs();
      if (exportLogs.length === 0) return showSnackbar('No audit logs available to export', 'error');

      const todayLabel = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const viewLabel = isArchived ? 'Archived Logs' : 'Live Logs';
      const typeLabel = ACTIVITY_TYPES.find(t => t.value === typeFilter)?.label || 'All Activities';
      const dateLabel = dateFilter ? `Filtered Date: ${new Date(dateFilter).toLocaleDateString()}` : 'All Dates';

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MediTrack';
      workbook.created = new Date();
      const subtitle = [`Generated: ${todayLabel}`, `View: ${viewLabel}`, `Type Filter: ${typeLabel}`, dateLabel, `Records Exported: ${exportLogs.length.toLocaleString()}`];
      if (debouncedSearch.trim()) subtitle.push(`Search: "${debouncedSearch.trim()}"`);

      const ws = workbook.addWorksheet('Audit Logs');
      ws.columns = [
        { width: 20 }, { width: 22 }, { width: 26 }, { width: 24 }, { width: 16 },
        { width: 14 }, { width: 12 }, { width: 50 }, { width: 50 },
      ];

      let r = addTitleBanner(ws, 'MediTrack Audit Logs', subtitle, 9);
      r = addSectionHeader(ws, r, 'Activity Log', 9);
      const headerRow = addTableHeader(ws, r, ['Timestamp', 'User Name', 'User Email', 'User ID', 'Action', 'Type', 'Status', 'Description', 'Details']);
      r = headerRow;

      exportLogs.forEach((log, i) => {
        const safeDesc = typeof log.description === 'object' ? JSON.stringify(log.description) : log.description || '';
        const safeDetails = typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '';
        r = addDataRow(ws, r, [
          formatDate(log.created_at || log.timestamp), log.userName || '', log.userEmail || '', log.userId || '',
          log.action || '', log.type || '', isArchived ? 'Archived' : 'Live', safeDesc, safeDetails,
        ], { zebra: i % 2 === 1 });
      });

      ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: r - 1, column: 9 } };
      ws.views = [{ state: 'frozen', ySplit: headerRow }];

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `MediTrack_AuditLogs_${viewMode}_${dateFilter || 'ALL'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showSnackbar(`Exported ${exportLogs.length.toLocaleString()} audit logs as Excel`);
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      showSnackbar('Failed to export audit logs', 'error');
    }
  };

  const handleArchiveClick = () => setConfirmAction('archive');
  const handleExportClick = () => setConfirmAction('export');

  const handleConfirm = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'archive') await runArchiveNow();
    else if (action === 'export') await exportComplianceReport();
  };

  const summaryStats = [
    { label: 'Total', count: stats.total, color: 'text-slate-700' },
    { label: 'Today', count: stats.today, color: 'text-emerald-700' },
    { label: 'Users', count: stats.users, color: 'text-blue-700' },
    { label: 'Types', count: stats.actions, color: 'text-purple-700' },
  ];

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">
      <div className="shrink-0 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm flex items-center justify-center gap-2">
            <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1 w-full xl:w-auto">

            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input type="text" placeholder="Search user, action, details..." value={searchInput} onChange={handleSearchChange} className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors shadow-sm ${isArchived ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`} title={isArchived ? 'Viewing Archived Logs' : 'Viewing Live Logs'}>
                <i className={`fa-solid ${isArchived ? 'fa-box-archive' : 'fa-bolt'}`}></i>
              </div>
              <select value={viewMode} onChange={e => setViewMode(e.target.value)} className={compactSelectCls}>
                <option value="live">Live Logs</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={compactWideSelectCls}>
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <div className="relative w-full sm:w-40">
              <DatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="All Dates"
                className={`${selectCls} w-full pr-8 max-w-[160px] truncate`}
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-400 hover:bg-slate-600 text-white flex items-center justify-center shadow-md z-10 transition-colors"
                  title="Clear date filter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>

          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleArchiveClick} disabled={archiving || viewMode === 'archived'} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" title={`Move logs older than ${RETENTION_DAYS} days to the archive now`}>
              <i className={`fa-solid ${archiving ? 'fa-spinner fa-spin' : 'fa-box-archive'} text-slate-400`}></i>
              <span className="hidden sm:inline">{archiving ? 'Archiving…' : 'Archive'}</span>
            </button>
            <button onClick={handleExportClick} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm" title="Export all matching audit logs">
              <i className="fa-solid fa-file-export text-slate-400"></i>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={() => fetchLogs()} className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-center p-3 pl-4 w-12 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Timestamp</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">User</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Action</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Description</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Details</th>
                <th className="bg-slate-50 text-right p-3 pr-6 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
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
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-sm">
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
                    <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-xs text-slate-600 font-medium">{formatDate(log.created_at || log.timestamp)}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-xs shrink-0">
                        {getInitials(log.userName || log.userEmail || log.userId || '?')}
                      </div>
                        <div>
                          <div className="text-sm text-slate-700 font-medium whitespace-nowrap">{log.userName || '—'}</div>
                          <div className="text-xs text-slate-400">{log.userEmail || log.userId || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap"><ActionPill action={log.action} /></td>
                    <td className="p-3 whitespace-nowrap"><TypePill type={log.type} /></td>
                    <td className="p-3 whitespace-nowrap"><StatusPill isArchived={isArchived} /></td>
                    <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                      <span className="truncate block" title={log.description ? (typeof log.description === 'object' ? JSON.stringify(log.description) : log.description) : ''}>
                        {log.description ? (typeof log.description === 'object' ? JSON.stringify(log.description) : log.description) : '—'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 hidden lg:table-cell max-w-[150px]">
                      <span className="truncate block" title={
                        parseDetails(log.details).map(d => d.key ? `${d.key}: ${d.value}` : d.value).join(' | ')
                      }>
                        {parseDetails(log.details).map(d => d.key ? `${d.key}: ${d.value}` : d.value).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="p-3 pr-6 text-right">
                      <button onClick={() => { setSelectedLog(log); setShowViewModal(true); }} className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all" title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{totalRecords === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)}</span> of <span className="font-semibold">{totalRecords}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Previous</button>
              <div className="text-xs font-semibold px-2">Page {currentPage} of {Math.max(1, totalPages)}</div>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {showViewModal && selectedLog && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <TypePill type={selectedLog.type} />
                <h2 className="text-xl font-bold text-[#1a2e22]">Audit Log Details</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">User / Performer</label>
                  <p className="text-sm font-medium text-slate-700">{selectedLog.userName || 'System'}</p>
                  <p className="text-xs text-slate-500">{selectedLog.userEmail || selectedLog.userId}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Action</label>
                  <div className="mt-1"><ActionPill action={selectedLog.action} /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Timestamp</label>
                  <p className="text-sm text-slate-700">{formatDate(selectedLog.created_at || selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                  <div className="mt-1"><StatusPill isArchived={viewMode === 'archived'} /></div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLog.description ? (typeof selectedLog.description === 'object' ? JSON.stringify(selectedLog.description) : selectedLog.description) : '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Details</label>
                <div className="text-sm text-slate-700">
                  {(() => {
                    const parsed = parseDetails(selectedLog.details);
                    if (!parsed || parsed.length === 0) return <p>—</p>;

                    if (parsed.length === 1 && !parsed[0].key) return <p>{parsed[0].value}</p>;

                    return (
                      <ul className="list-none space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {parsed.map((item, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-semibold text-slate-500 min-w-[70px]">{item.key}:</span>
                            <span className="text-slate-800 break-all">{item.value}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
              <details className="group mt-4 border-t border-slate-100 pt-4">
  <summary className="text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-[#466460] flex items-center gap-1.5 transition-colors">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 group-open:rotate-90 transition-transform">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
    View Full Data
  </summary>
  <div className="mt-3 bg-slate-50 rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
    <ul className="list-none text-xs divide-y divide-slate-200">
      {Object.entries(selectedLog).map(([key, value]) => (
        <li key={key} className="flex flex-col sm:flex-row p-3 hover:bg-slate-100/50 transition-colors">
          <span className="font-bold text-slate-500 uppercase sm:w-1/3 shrink-0 mb-1 sm:mb-0">
            {/* Converts camelCase and underscores to spaced words (e.g., "userId" -> "user Id") */}
            {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
          </span>
          <span className="text-slate-800 break-all sm:w-2/3">
            {typeof value === 'object' && value !== null
              ? JSON.stringify(value)
              : String(value || '—')}
          </span>
        </li>
      ))}
    </ul>
  </div>
</details>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowViewModal(false)} className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmAction && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] px-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${confirmAction === 'archive' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                <i className={`fa-solid ${confirmAction === 'archive' ? 'fa-box-archive text-amber-600' : 'fa-file-export text-blue-600'} text-lg`}></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{confirmAction === 'archive' ? 'Archive old logs?' : 'Export audit logs'}</h3>
                {confirmAction === 'export' && <p className="text-xs text-slate-400 mt-0.5">Export all matching records</p>}
              </div>
            </div>

            {confirmAction === 'archive' ? (
              <>
                <p className="text-sm text-slate-600 mb-2">This will move all logs older than <span className="font-semibold">{RETENTION_DAYS} days</span> into the archive.</p>
                <p className="text-xs text-slate-400 mb-5">Logs are normally archived automatically. This simply runs the archival process now.</p>
              </>
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Records to export</span>
                    <span className="text-sm font-bold text-[#466460]">ALL MATCHING</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {isArchived ? 'Archived audit logs' : 'Live audit logs'} {' • '} {ACTIVITY_TYPES.find(t => t.value === typeFilter)?.label || 'All Activities'}
                  </div>
                  {dateFilter && <div className="mt-1 text-xs text-slate-500">Date: <span className="font-medium">{new Date(dateFilter).toLocaleDateString()}</span></div>}
                  {debouncedSearch.trim() && <div className="mt-1 text-xs text-slate-400">Search: <span className="font-medium">"{debouncedSearch.trim()}"</span></div>}
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Export Format</label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg border-2 border-[#466460] bg-[#e0eceb] text-left flex items-center justify-between cursor-default">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <i className="fa-solid fa-file-excel"></i>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700">Excel Document</div>
                          <div className="text-[10px] text-slate-500">.xlsx</div>
                        </div>
                      </div>
                      <i className="fa-solid fa-check text-[#466460]"></i>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mb-5">The export includes <strong>all matching audit logs</strong>, not only the records currently visible on this page.</div>
              </>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleConfirm} className={`flex-1 px-4 py-2.5 rounded-lg text-white font-semibold text-sm transition-all ${confirmAction === 'archive' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#466460] hover:bg-[#3a524f]'}`}>
                {confirmAction === 'archive' ? 'Archive Now' : `Export ${exportFormat === 'xlsx' ? 'Excel' : 'CSV'}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-[100000] flex items-center gap-3 shadow-xl transition-all ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="shrink-0">
            {message.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </span>
          <span className="whitespace-normal">{message.text}</span>
          <button onClick={() => setMessage(null)} className="shrink-0 ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition" title="Close">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;