// frontend/src/features/admin-clinic/Archives.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Archive type labels
const ARCHIVE_TYPE_LABELS = {
  record: 'User Record',
  announcement: 'Announcement',
  user: 'User',
  consultation: 'Consultation',
  appointment: 'Appointment',
  examination: 'Examination',
  audit_log: 'Audit Log',
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
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch archives
  const fetchArchives = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', limit);

      const response = await fetch(`${API_URL}/archives?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setArchives(result.data.data || []);
        setTotalCount(result.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/archives/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
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

  // Restore archive
  const handleRestore = async (id) => {
    if (!window.confirm('Are you sure you want to restore this item?')) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/archives/${id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        alert('Item restored successfully!');
        setShowViewModal(false);
        fetchArchives();
        fetchStats();
      } else {
        alert('Failed to restore: ' + result.message);
      }
    } catch (error) {
      console.error('Error restoring:', error);
      alert('Error restoring item');
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/archives/${selectedArchive.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        alert('Item permanently deleted!');
        setShowDeleteModal(false);
        fetchArchives();
        fetchStats();
      } else {
        alert('Failed to delete: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting item');
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

  // Calculate days until permanent deletion
  const getDaysUntilDelete = (dateStr) => {
    if (!dateStr) return 'N/A';
    const deleteDate = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((deleteDate - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} days` : 'Due for deletion';
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1a2e22]">Archives</h1>
        <p className="text-slate-500 mt-1">View and manage deleted items. Items are permanently deleted after 2 years.</p>
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
            <div className="text-xs text-slate-500 font-medium">Records</div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Original ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Deleted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Archived Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Auto-Delete</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archives.map((archive) => (
                  <tr key={archive.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        archive.type === 'record' ? 'bg-blue-100 text-blue-700' :
                        archive.type === 'announcement' ? 'bg-green-100 text-green-700' :
                        archive.type === 'user' ? 'bg-purple-100 text-purple-700' :
                        archive.type === 'consultation' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ARCHIVE_TYPE_LABELS[archive.type] || archive.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{archive.original_id?.substring(0, 12)}...</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{archive.deleted_by || 'System'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(archive.archived_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={archive.permanent_delete_at && new Date(archive.permanent_delete_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-red-600 font-medium' : 'text-slate-600'}>
                        {getDaysUntilDelete(archive.permanent_delete_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(archive)}
                          className="px-3 py-1.5 text-sm text-[#466460] hover:bg-[#466460]/10 rounded-lg transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRestore(archive.id)}
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
              <h2 className="text-xl font-bold text-[#1a2e22]">Archive Details</h2>
              <p className="text-sm text-slate-500 mt-1">{ARCHIVE_TYPE_LABELS[selectedArchive.type] || selectedArchive.type}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Original ID</label>
                <p className="text-sm font-mono text-slate-700">{selectedArchive.original_id}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Deleted By</label>
                <p className="text-sm text-slate-700">{selectedArchive.deleted_by || 'System'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Archived Date</label>
                <p className="text-sm text-slate-700">{formatDate(selectedArchive.archived_at)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Scheduled Deletion</label>
                <p className="text-sm text-slate-700">{formatDate(selectedArchive.permanent_delete_at)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Archived Data</label>
                <pre className="mt-1 p-3 bg-slate-50 rounded-lg text-xs font-mono overflow-auto max-h-48">
                  {JSON.stringify(JSON.parse(selectedArchive.data || '{}'), null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Close
              </button>
              <button
                onClick={() => handleRestore(selectedArchive.id)}
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
                This will permanently delete the {ARCHIVE_TYPE_LABELS[selectedArchive.type] || selectedArchive.type} from archives.
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