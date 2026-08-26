// C:\Users\HP\MediTrack\frontend\src\features\users\BulkAppointmentPanel.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../../supabase';
import { createBulkAppointment } from '../../services/appointments.service';
import { useTranslation } from 'react-i18next'; // <-- Imported i18next hook

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Bulk requests are always face-to-face (the whole class visits the clinic
// together), so only the two checkup types are offered here — both can be
// selected at once. The actual occasion (educational tour, group screening,
// etc.) is captured separately as free text since it varies per request.
const BULK_PURPOSES_OPTS = [
  { value: 'Medical Check-up', key: 'medicalCheckup' },
  { value: 'Dental Check-up', key: 'dentalCheckup' },
];

const STATUS_STYLES = {
  Pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  Approved: { bg: 'bg-[#E1F5EE]', text: 'text-[#466460]', label: 'Approved' },
  Done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
  Missed:   { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Missed'   },
  Declined: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Declined' },
  Rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Rejected' },
  pending:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Pending'  },
  approved: { bg: 'bg-[#E1F5EE]', text: 'text-[#466460]', label: 'Approved' },
  done:     { bg: 'bg-[#f1f5f9]', text: 'text-[#64748b]', label: 'Done'     },
  missed:   { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', label: 'Missed'   },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', label: 'Rejected' },
};

function parseCsvToIds(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const stripQuotes = (s) => s.trim().replace(/^"|"$/g, '');
  const headerCells = lines[0].split(',').map(stripQuotes);
  const idColIdx = headerCells.findIndex((h) => /^(university[_ ]?id|student[_ ]?id|id|idno)$/i.test(h));
  const hasHeader = idColIdx !== -1;
  const startRow  = hasHeader ? 1 : 0;
  const colIdx    = hasHeader ? idColIdx : 0;
  const ids = [];
  for (let i = startRow; i < lines.length; i++) {
    const cells = lines[i].split(',').map(stripQuotes);
    const val = cells[colIdx];
    if (val) ids.push(val);
  }
  return [...new Set(ids)];
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    return true;
  }
}

async function getFreshToken() {
  const accessToken  = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token') || '';
  if (!accessToken) return null;
  if (!isTokenExpired(accessToken)) return accessToken;
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data?.session) {
      const newAccess  = data.session.access_token;
      const newRefresh = data.session.refresh_token;
      localStorage.setItem('token', newAccess);
      if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
      try { supabase.realtime.setAuth(newAccess); } catch {}
      return newAccess;
    }
  } catch (err) {}
  return accessToken;
}

// ── Date Formatting Helper ──
const formatDisplayDateWithMonth = (raw, preferences) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);

  const formatString = preferences?.dateFormat?.toUpperCase() || 'MM/DD/YYYY';
  const monthStr = date.toLocaleDateString('en-US', { month: 'long' });
  const dayStr = String(date.getDate()).padStart(2, '0');
  const yearStr = date.getFullYear();

  if (formatString.startsWith('DD')) {
    return `${dayStr} ${monthStr} ${yearStr}`;
  } else if (formatString.startsWith('YYYY')) {
    return `${yearStr} ${monthStr} ${dayStr}`;
  } else {
    return `${monthStr} ${dayStr}, ${yearStr}`;
  }
};

export default function BulkAppointmentPanel({ currentPatient, userProfile }) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);

  // Sync i18next with the user's database preference
  useEffect(() => {
    if (userProfile?.preferences?.language) {
      const langCode = userProfile.preferences.language.toLowerCase() === 'filipino' ? 'fil' : 'en';
      if (i18n.language !== langCode) {
        i18n.changeLanguage(langCode);
      }
    }
  }, [userProfile?.preferences?.language, i18n]);

  // ── Dashboard View State ──
  const [showForm, setShowForm] = useState(false);

  // ── Request Form State ──
  const [fileName, setFileName]         = useState('');
  const [studentIds, setStudentIds]     = useState([]);
  const [parseError, setParseError]     = useState('');
  const [selectedPurposes, setSelectedPurposes] = useState([]);
  const [occasion, setOccasion]         = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [result, setResult]             = useState(null);

  // ── Monitor History State ──
  const [history, setHistory]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    if (!currentPatient?.uid) return;

    try {
      setLoadingHistory(true);
      const token = await getFreshToken();

      const response = await axios.get(`${API_URL}/appointments/bulk-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-uid': currentPatient.uid,
        },
      });

      if (response.data.success) {
        setHistory(response.data.data || []);
      }
    } catch (err) {
      console.error('[BulkAppointmentPanel] Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!showForm) {
      fetchHistory();
    }
  }, [showForm]);

  const groupedHistory = useMemo(() => {
    const groups = {};
    const prefs = userProfile?.preferences || {};
    history.forEach((appt) => {
      const date = new Date(appt.created_at || appt.bookedAt || Date.now());
      const displayDate = formatDisplayDateWithMonth(date, prefs);
      const sortDate = date.toISOString().split('T')[0];

      const key = `${sortDate} | ${displayDate} | ${appt.reason || appt.service_type}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0].split(' | ')[0]) - new Date(a[0].split(' | ')[0]));
  }, [history, userProfile?.preferences]);

  const togglePurpose = (purpose) => {
    setSelectedPurposes((prev) => (prev.includes(purpose) ? prev.filter((p) => p !== purpose) : [...prev, purpose]));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setSubmitError('');
    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const ids = parseCsvToIds(String(reader.result || ''));
      if (ids.length === 0) {
        setParseError(t('bulk.errNoIds', 'No University IDs found. Make sure the CSV has a "university_id" column, or one ID per row.'));
        setStudentIds([]);
        return;
      }
      setStudentIds(ids);
    };
    reader.onerror = () => setParseError(t('bulk.errRead', 'Could not read that file. Please try again.'));
    reader.readAsText(file);
  };

  const removeId = (id) => setStudentIds((prev) => prev.filter((sid) => sid !== id));

  const resetFile = () => {
    setFileName('');
    setStudentIds([]);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = studentIds.length > 0 && selectedPurposes.length > 0 && occasion.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const reason = `${selectedPurposes.join(', ')} — ${occasion.trim()}`;

    setSubmitting(true);
    setSubmitError('');
    setResult(null);

    const isDental = selectedPurposes.some((p) => p.toLowerCase().includes('dent') || p.toLowerCase().includes('oral') || p.toLowerCase().includes('tooth'));
    const resolvedServiceType = isDental ? 'Dental Examination' : (selectedPurposes.join(', ') || 'Medical Examination');

    try {
      const payload = {
        authUid: currentPatient?.uid,
        facultyName: currentPatient?.name,
        facultyId: userProfile?.university_id || currentPatient?.idno,
        serviceType: resolvedServiceType,
        reason,
        studentIds,
      };

      const data = await createBulkAppointment(payload);
      setResult(data);
      setStudentIds([]);
      setFileName('');
      setSelectedPurposes([]);
      setOccasion('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => setShowForm(false), 2500);
    } catch (err) {
      console.error('[BulkAppointmentPanel] Submission Error:', err);
      setSubmitError(err.message || t('bulk.errSubmit', 'Could not submit the bulk request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f7faf8] overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 max-w-[800px] w-full mx-auto">

        {showForm ? (
          /* ── REQUEST FORM VIEW ── */
          <div className="animate-fadeIn">
            <button
              onClick={() => setShowForm(false)}
              className="text-[12px] font-bold text-[#6b8577] hover:text-[#1a2e22] transition-colors mb-6 flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left"></i> {t('bulk.backToClassRequests', 'Back to Class Requests')}
            </button>

            <div className="mb-6">
              <div className="text-[16px] font-bold text-[#1a2e22]">{t('bulk.newBulkRequest', 'New Class Bulk Request')}</div>
              <div className="text-[12px] text-[#6b8577] mt-1">
                {t('bulk.uploadCsvDesc', "Upload a CSV of your students' University IDs to request appointments for the whole group.")}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="bg-white border border-[#ddeee5] rounded-2xl px-5 py-4">
                <div className="text-[10px] font-bold text-[#466460] uppercase tracking-widest mb-1.5">{t('bulk.requestedBy', 'Requested by')}</div>
                <div className="text-[14px] font-bold text-[#1a2e22]">{currentPatient.name}</div>
                <div className="text-[12px] text-[#6b8577] mt-1">
                  {userProfile?.university_id || currentPatient.idno || t('appointments.idNotSet', 'ID Not Set')} · {currentPatient.dept}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#466460] uppercase tracking-widest">
                  {t('bulk.studentListCsv', 'Student List (CSV)')} <span className="normal-case font-medium text-[#9bb5a5]">{t('bulk.mustIncludeId', '* must include University ID')}</span>
                </label>

                <div className="border border-dashed border-[#c6dfd0] rounded-2xl px-4 py-8 flex flex-col items-center gap-3 bg-white">
                  <i className="fa-solid fa-file-csv text-3xl text-[#9bb5a5]"></i>
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={submitting} className="text-[12px]" />
                  {fileName && <div className="text-[12px] text-[#466460] font-bold">{fileName}</div>}
                </div>

                {parseError && (
                  <div className="text-[12px] text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3">{parseError}</div>
                )}

                {studentIds.length > 0 && (
                  <div className="border border-[#ddeee5] rounded-2xl px-4 py-4 bg-white mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[12px] font-bold text-[#1a2e22]">{t('bulk.studentsLoaded', '{{count}} student(s) loaded', { count: studentIds.length })}</div>
                      <button onClick={resetFile} disabled={submitting} className="text-[11px] font-bold text-[#9bb5a5] hover:text-[#dc2626]">{t('common.clear', 'Clear')}</button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2">
                      {studentIds.map((id) => (
                        <span key={id} className="flex items-center gap-1.5 text-[11px] font-bold bg-[#eef3f2] text-[#466460] px-3 py-1.5 rounded-lg border border-[#c6dfd0]">
                          {id} <button onClick={() => !submitting && removeId(id)} className="text-[#9bb5a5] hover:text-[#dc2626]"><i className="fa-solid fa-xmark"></i></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── PURPOSE: face-to-face checkup type(s) ── */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[12px] font-bold text-[#466460] uppercase tracking-widest">
                  {t('appointments.purpose', 'Purpose')} <span className="normal-case font-medium text-[#9bb5a5]">{t('appointments.selectAllThatApply', '* select all that apply')}</span>
                </label>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6b8577] uppercase tracking-wider">
                  <i className="fa-solid fa-hospital text-[10px]"></i>
                  {t('bulk.f2fOnlyLabel', 'Face-to-face — class visits the clinic together')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BULK_PURPOSES_OPTS.map((p) => {
                    const checked = selectedPurposes.includes(p.value);
                    return (
                      <label key={p.key} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all text-[13px] font-bold select-none ${checked ? 'bg-[#eef3f2] border-[#466460] text-[#466460]' : 'bg-white border-[#ddeee5] text-[#1a2e22] hover:border-[#9bb5a5]'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <span className={`flex-shrink-0 w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#466460] border-[#466460]' : 'bg-white border-[#c6dfd0]'}`}>
                          {checked && <svg width="10" height="8" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => !submitting && togglePurpose(p.value)} disabled={submitting} />
                        {t(`bulk.purposes.${p.key}`, p.value)}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── OCCASION: free text for the actual reason (educational tour, screening, etc.) ── */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-[#466460] uppercase tracking-widest">
                  {t('bulk.occasion', 'Occasion / Reason')} <span className="normal-case font-medium text-[#9bb5a5]">{t('bulk.occasionHint', '* e.g. Educational Tour, Group Health Screening')}</span>
                </label>
                <textarea
                  placeholder={t('bulk.occasionPlaceholder', 'Describe the occasion for this class request...')}
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  disabled={submitting}
                  className="border border-[#ddeee5] rounded-2xl px-4 py-3 text-[13px] bg-white outline-none resize-none disabled:opacity-50 focus:border-[#466460] transition-colors"
                  rows="2"
                />
              </div>

              <div className="flex items-start gap-3 bg-[#FAEEDA] border border-[#f0c070] rounded-2xl px-5 py-4 text-[12px] text-[#854F0B] mt-2">
                <i className="fa-solid fa-circle-info mt-[2px] shrink-0 text-[14px]"></i>
                <span>{t('bulk.infoNotice', 'Each student on the list gets an individual appointment request. Any University ID that doesn\'t match an existing student record will be skipped and reported back to you.')}</span>
              </div>

              {submitError && (
                <div className="flex items-start gap-3 bg-[#fef2f2] border border-[#fecaca] rounded-2xl px-5 py-4 text-[12px] text-[#dc2626]">
                  <i className="fa-solid fa-circle-exclamation mt-[2px] shrink-0 text-[14px]"></i>
                  <span>{submitError}</span>
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-2 bg-[#EAF3DE] border border-[#a3c77a] rounded-2xl px-5 py-4 text-[13px] text-[#3B6D11]">
                  <div className="font-bold flex items-center gap-2">
                    <i className="fa-solid fa-circle-check text-[16px]"></i>
                    {t('bulk.appointmentsCreated', '{{count}} appointment(s) created.', { count: result.created?.length || 0 })}
                  </div>
                  {result.notFoundIds?.length > 0 && (
                    <div className="text-[12px] font-medium text-[#854F0B]">
                      {t('bulk.idsNotFound', '{{count}} ID(s) not found:', { count: result.notFoundIds.length })} {result.notFoundIds.join(', ')}
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleSubmit} disabled={!canSubmit} className="w-full bg-[#466460] border-none py-3.5 mt-2 rounded-[40px] font-bold text-[14px] text-white cursor-pointer hover:bg-[#364e4a] disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-sm">
                {submitting ? <><i className="fa-solid fa-spinner fa-spin text-[12px]"></i> {t('bulk.submitting', 'Submitting…')}</> : t('bulk.submitForStudents', 'Submit for {{count}} Student(s)', { count: studentIds.length || 0 })}
              </button>
            </div>
          </div>
        ) : (
          /* ── MONITOR HISTORY VIEW (DEFAULT) ── */
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-[#1a2e22]">{t('appointments.classBulkRequests', 'Class Bulk Requests')}</h2>
                <p className="text-[12px] font-medium text-[#6b8577] mt-1">
                  {t('bulk.monitorDesc', 'Monitor the status of appointments requested for your students.')}
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="bg-[#466460] text-white border-none py-2.5 px-5 rounded-xl font-bold text-[12px] flex items-center gap-2 hover:bg-[#364e4a] transition-all cursor-pointer shadow-sm"
              >
                <i className="fa-solid fa-plus text-[11px]"></i>
                {t('bulk.newRequest', 'New Request')}
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-12 text-[#9bb5a5] text-[13px] font-bold">
                <i className="fa-solid fa-spinner fa-spin block text-3xl mb-3 text-[#c6dfd0]"></i>
                {t('bulk.loadingRequests', 'Loading your class requests...')}
              </div>
            ) : groupedHistory.length === 0 ? (
              <div className="text-center py-16 text-[#9bb5a5] text-[13px] font-medium border border-dashed border-[#c6dfd0] rounded-3xl bg-white shadow-sm">
                <i className="fa-regular fa-folder-open block text-4xl mb-4 text-[#c6dfd0]"></i>
                {t('bulk.noRequestsFound1', 'No class bulk requests found.')}<br/>
                {t('bulk.noRequestsFound2', 'Click "New Request" above to upload a CSV.')}
              </div>
            ) : (
              <div className="flex flex-col gap-8 pb-6">
                {groupedHistory.map(([groupKey, appts]) => {
                  const [, displayDate, reason] = groupKey.split(' | ');
                  return (
                    <div key={groupKey} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b-2 border-[#ddeee5] pb-2">
                        <div className="text-[14px] font-bold text-[#1a2e22]">{reason}</div>
                        <div className="text-[11px] font-bold text-[#6b8577] bg-[#eef3f2] px-3 py-1.5 rounded-lg border border-[#ddeee5]">
                          {t('bulk.requestedOn', 'Requested on')} {displayDate}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {appts.map((appt) => {
                          const style = STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending;
                          return (
                            <div key={appt.id} className="bg-white border border-[#ddeee5] rounded-2xl p-4 flex justify-between items-center hover:border-[#9bb5a5] transition-colors shadow-sm">
                              <div>
                                <div className="text-[14px] font-bold text-[#1a2e22]">
                                  {appt.patient_name || t('bulk.unknownStudent', 'Unknown Student')}
                                </div>
                                <div className="text-[11px] font-medium text-[#6b8577] mt-0.5">
                                  {t('bulk.idPrefix', 'ID:')} {appt.users?.university_id || '—'}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1.5">
                                <span className={`text-[11px] font-bold px-3 py-1 rounded-lg ${style.bg} ${style.text}`}>
                                  {t(`appointments.status.${(appt.status || 'pending').toLowerCase()}`, style.label)}
                                </span>
                                {appt.time && appt.status?.toLowerCase() === 'approved' && (
                                  <div className="text-[10px] text-[#466460] font-bold bg-[#eef3f2] px-2 py-1 rounded-md">
                                    {formatDisplayDateWithMonth(`${appt.year}-${String(appt.month).padStart(2, '0')}-${String(appt.day).padStart(2, '0')}`, userProfile?.preferences)} @ {appt.time}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}