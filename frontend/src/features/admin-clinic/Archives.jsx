// frontend/src/features/admin-clinic/Archives.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';

// Archive type labels - maps to actual table names
const ARCHIVE_TYPE_LABELS = {
  user: 'User',
  announcement: 'Announcement',
  appointment: 'Appointment',
  consultation: 'Consultation',
  medical_record: 'Medical Record',
  dental_record: 'Dental Record',
  all: 'All Types'
};

export default function Archives() {
  const [archives, setArchives] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Modal states
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState(null);

  // Show snackbar notification
  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 3000);
  };

  // Fetch archives from all tables using is_archived flag
  const fetchArchives = async () => {
    setLoading(true);
    try {
      // Set Supabase session for authenticated fetch
      const accessToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';
      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      }

      // Fetch archived items from all tables
      const [
        usersData, announcementsData, appointmentsData, consultationsData,
        medicalData, dentalData
      ] = await Promise.all([
        supabase.from('users').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('announcements').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('consultations').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('medical_records').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('dental_records').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
      ]);

      // Log any errors
      if (usersData.error) console.error('Users error:', usersData.error);
      if (announcementsData.error) console.error('Announcements error:', announcementsData.error);
      if (appointmentsData.error) console.error('Appointments error:', appointmentsData.error);
      if (consultationsData.error) console.error('Consultations error:', consultationsData.error);
      if (medicalData.error) console.error('Medical error:', medicalData.error);
      if (dentalData.error) console.error('Dental error:', dentalData.error);

      // Debug: Log counts from each table
      console.log('Archived counts:', {
        users: usersData.data?.length || 0,
        announcements: announcementsData.data?.length || 0,
        appointments: appointmentsData.data?.length || 0,
        consultations: consultationsData.data?.length || 0,
        medical: medicalData.data?.length || 0,
        dental: dentalData.data?.length || 0,
      });

      // Combine all archived items with type labels
      let allArchives = [
        ...(usersData.data || []).map(r => ({
          ...r,
          archiveType: 'user',
          table: 'users',
          id: r.uid,
          displayName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || r.university_id || 'User',
          detail: r.university_id || r.email || '',
          deletedBy: r.deleted_by || 'System'
        })),
        ...(announcementsData.data || []).map(r => ({
          ...r,
          archiveType: 'announcement',
          table: 'announcements',
          id: r.id,
          displayName: r.title || 'Announcement',
          detail: `Posted: ${r.author_name || 'Admin'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(appointmentsData.data || []).map(r => ({
          ...r,
          archiveType: 'appointment',
          table: 'appointments',
          id: r.id,
          displayName: r.patient_name || r.reason || 'Appointment',
          detail: `${r.service_type || 'Medical'} - ${r.reason || 'No reason'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(consultationsData.data || []).map(r => ({
          ...r,
          archiveType: 'consultation',
          table: 'consultations',
          id: r.id,
          displayName: r.patient_name || 'Consultation',
          detail: `${r.consultation_type || 'General'} - ${r.status || ''}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(medicalData.data || []).map(r => ({
          ...r,
          archiveType: 'medical_record',
          table: 'medical_records',
          id: r.id,
          displayName: r.patient_name || r.patientId || 'Medical Record',
          detail: `Type: ${r.record_type || 'General'} | Visit: ${r.visit_date || 'N/A'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(dentalData.data || []).map(r => ({
          ...r,
          archiveType: 'dental_record',
          table: 'dental_records',
          id: r.id,
          displayName: r.patient_name || r.patientId || 'Dental Record',
          detail: `Type: ${r.record_type || 'Dental'} | Visit: ${r.visit_date || 'N/A'}`,
          deletedBy: r.deleted_by || 'System'
        })),
      ];

      // Filter by type
      if (filterType !== 'all') {
        allArchives = allArchives.filter(a => a.archiveType === filterType);
      }

      // Filter by search
      if (search) {
        const s = search.toLowerCase();
        allArchives = allArchives.filter(a => {
          const searchable = `${a.displayName} ${a.detail} ${a.deletedBy} ${a.archiveType}`.toLowerCase();
          return searchable.includes(s);
        });
      }

      setArchives(allArchives);
      setTotalCount(allArchives.length);
    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      // Set Supabase session for authenticated fetch
      const accessToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';
      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      }

      // Get count from each table
      const [usersCount, announcementsCount, appointmentsCount, consultationsCount, medicalCount, dentalCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('medical_records').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('dental_records').select('*', { count: 'exact', head: true }).eq('is_archived', true),
      ]);

      setStats({
        total: (usersCount.count || 0) + (announcementsCount.count || 0) + (appointmentsCount.count || 0) +
               (consultationsCount.count || 0) + (medicalCount.count || 0) + (dentalCount.count || 0),
        users: usersCount.count || 0,
        announcements: announcementsCount.count || 0,
        appointments: appointmentsCount.count || 0,
        consultations: consultationsCount.count || 0,
        records: (medicalCount.count || 0) + (dentalCount.count || 0),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, [filterType, page]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchArchives();
  };

  // View archive details
  const handleView = (archive) => {
    setSelectedArchive(archive);
    setShowViewModal(true);
  };

  // Open restore modal
  const handleRestoreClick = (archive) => {
    setSelectedArchive(archive);
    setShowRestoreModal(true);
  };

  // Confirm restore - set is_archived to false
  const confirmRestore = async () => {
    if (!selectedArchive) return;

    setActionLoading(true);
    try {
      // Users table uses 'uid' as primary key, others use 'id'
      const idColumn = selectedArchive.table === 'users' ? 'uid' : 'id';

      const { error } = await supabase
        .from(selectedArchive.table)
        .update({
          is_archived: false,
          deleted_by: null,
          updated_at: new Date().toISOString()
        })
        .eq(idColumn, selectedArchive.id);

      if (error) throw error;

      showSnackbar('Item restored successfully!', 'success');
      setShowRestoreModal(false);
      setShowViewModal(false);
      fetchArchives();
      fetchStats();
    } catch (error) {
      console.error('Error restoring:', error);
      showSnackbar('Error restoring item: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Permanently delete
  const handlePermanentDelete = (archive) => {
    setSelectedArchive(archive);
    setShowDeleteModal(true);
  };

  const confirmPermanentDelete = async () => {
    if (!selectedArchive) return;
    if (!window.confirm('WARNING: This action cannot be undone! The item will be permanently deleted.')) return;

    setActionLoading(true);
    try {
      // Users table uses 'uid' as primary key, others use 'id'
      const idColumn = selectedArchive.table === 'users' ? 'uid' : 'id';

      const { error } = await supabase
        .from(selectedArchive.table)
        .delete()
        .eq(idColumn, selectedArchive.id);

      if (error) throw error;

      showSnackbar('Item permanently deleted!', 'success');
      setShowDeleteModal(false);
      fetchArchives();
      fetchStats();
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar('Error deleting item: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      {/* Snackbar Notification */}
      {snackbar && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white text-sm font-medium animate-fade-in`}>
          {snackbar.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a2e22]">Archives</h1>
        <p className="text-slate-500 mt-1">View and manage archived items. Restore or permanently delete them.</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-2xl font-bold text-[#466460]">{stats.total}</div>
            <div className="text-xs text-slate-500 font-medium">Total Archived</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-2xl font-bold text-blue-600">{stats.records}</div>
            <div className="text-xs text-slate-500 font-medium">Medical Records</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-2xl font-bold text-green-600">{stats.announcements}</div>
            <div className="text-xs text-slate-500 font-medium">Announcements</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-2xl font-bold text-purple-600">{stats.consultations}</div>
            <div className="text-xs text-slate-500 font-medium">Consultations</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="text-2xl font-bold text-orange-600">{stats.users}</div>
            <div className="text-xs text-slate-500 font-medium">Users</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent"
          >
            {Object.entries(ARCHIVE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search archives..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#466460] focus:border-transparent"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#466460] text-white rounded-lg text-sm font-medium hover:bg-[#3a524d] transition"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Archives Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#466460] mx-auto"></div>
            <p className="text-slate-500 mt-2">Loading archives...</p>
          </div>
        ) : archives.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-slate-500">No archived items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Details</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Deleted By</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archives.map((archive) => (
                  <tr key={`${archive.table}-${archive.id}`} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        archive.archiveType === 'medical_record' ? 'bg-blue-100 text-blue-700' :
                        archive.archiveType === 'dental_record' ? 'bg-cyan-100 text-cyan-700' :
                        archive.archiveType === 'announcement' ? 'bg-green-100 text-green-700' :
                        archive.archiveType === 'user' ? 'bg-purple-100 text-purple-700' :
                        archive.archiveType === 'consultation' ? 'bg-orange-100 text-orange-700' :
                        archive.archiveType === 'appointment' ? 'bg-pink-100 text-pink-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ARCHIVE_TYPE_LABELS[archive.archiveType] || archive.archiveType}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-slate-700">
                        {archive.displayName}
                      </div>
                      <div className="text-xs text-slate-400">ID: {String(archive.id).substring(0, 12)}...</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-slate-600 max-w-xs truncate" title={archive.detail}>
                        {archive.detail}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-slate-600">
                        {archive.deletedBy}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-slate-600">{formatDate(archive.updated_at)}</div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleView(archive)}
                          className="px-3 py-1.5 text-sm text-[#466460] hover:bg-[#466460]/10 rounded-lg transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRestoreClick(archive)}
                          className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(archive)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} items
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedArchive && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  selectedArchive.archiveType === 'medical_record' ? 'bg-blue-100 text-blue-700' :
                  selectedArchive.archiveType === 'dental_record' ? 'bg-cyan-100 text-cyan-700' :
                  selectedArchive.archiveType === 'announcement' ? 'bg-green-100 text-green-700' :
                  selectedArchive.archiveType === 'user' ? 'bg-purple-100 text-purple-700' :
                  selectedArchive.archiveType === 'consultation' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || selectedArchive.archiveType}
                </span>
                <h2 className="text-xl font-bold text-[#1a2e22]">Archive Details</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Key Info - Different based on type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Name/Title</label>
                  <p className="text-sm font-medium text-slate-700">{selectedArchive.displayName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Details</label>
                  <p className="text-sm text-slate-600">{selectedArchive.detail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Deleted By</label>
                  <p className="text-sm text-slate-700">{selectedArchive.deletedBy}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Archived Date</label>
                  <p className="text-sm text-slate-700">{formatDate(selectedArchive.updated_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">ID</label>
                <p className="text-sm font-mono text-slate-500">{String(selectedArchive.id)}</p>
              </div>

              {/* Full Data - Collapsible */}
              <details className="group">
                <summary className="text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-[#466460]">
                  View Full Data
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono overflow-auto max-h-48">
                  {JSON.stringify(selectedArchive, null, 2)}
                </pre>
              </details>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setShowRestoreModal(true);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedArchive && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1a2e22]">Restore Archive?</h2>
              <p className="text-slate-500 mt-2">
                Are you sure you want to restore this {ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || selectedArchive.archiveType}?
                It will be restored and visible in its original location.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedArchive && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1a2e22]">Permanently Delete?</h2>
              <p className="text-slate-500 mt-2">
                This will permanently delete the {ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || selectedArchive.archiveType}.
                This action cannot be undone.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPermanentDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}