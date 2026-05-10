// frontend/src/features/admin-clinic/User-Management.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [message, setMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [editForm, setEditForm] = useState({
    role: '',
    department: '',
    jobTitle: '',
    status: 'active',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getFullName = (user) => {
    const parts = [
      user.firstName,
      user.middleInitial ? `${user.middleInitial}.` : '',
      user.lastName,
      user.suffix || '',
    ].filter(Boolean);
    return parts.join(' ') || '—';
  };

  const getInitials = (user) => {
    const f = user.firstName?.[0] || '';
    const l = user.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  const getRoleLabel = (role) =>
    ({ admin: 'Admin', administrator: 'Admin', doctor: 'Doctor', nurse: 'Nurse', staff: 'Staff', employee: 'Staff', student: 'Student' }[role?.toLowerCase()] || (role || '—'));

  const getRoleBadgeStyle = (role) => {
    const r = role?.toLowerCase();
    if (r === 'admin' || r === 'administrator') return { background: '#fef9c3', color: '#854d0e' };
    if (r === 'doctor') return { background: '#dbeafe', color: '#1d4ed8' };
    if (r === 'nurse') return { background: '#dcfce7', color: '#166534' };
    if (r === 'student') return { background: '#f3e8ff', color: '#6b21a8' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredUsers = users.filter(user => {
    if (currentFilter !== 'all' && user.role?.toLowerCase() !== currentFilter) return false;
    if (searchInput) {
      const s = searchInput.toLowerCase();
      return (
        getFullName(user).toLowerCase().includes(s) ||
        user.email?.toLowerCase().includes(s) ||
        user.universityId?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // ── Edit modal ─────────────────────────────────────────────────────────────

  const openEditModal = (user) => {
    setEditTarget(user);
    setEditForm({
      role: user.role || 'staff',
      department: user.department || '',
      jobTitle: user.jobTitle || '',
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const userRef = doc(db, 'users', editTarget.id);
      await updateDoc(userRef, {
        role: editForm.role,
        department: editForm.department,
        jobTitle: editForm.jobTitle,
        status: editForm.status,
      });
      setUsers(users.map(u =>
        u.id === editTarget.id ? { ...u, ...editForm } : u
      ));
      showSnackbar('User updated successfully', 'success');
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating user:', err);
      showSnackbar('Error updating user', 'error');
    }
  };

  // ── Delete modal ───────────────────────────────────────────────────────────

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'users', deleteTarget.id));
      setUsers(users.filter(u => u.id !== deleteTarget.id));
      showSnackbar('User deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting user:', err);
      showSnackbar('Error deleting user', 'error');
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // ── Snackbar ───────────────────────────────────────────────────────────────

  const showSnackbar = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const statTotal    = users.length;
  const statAdmin    = users.filter(u => ['admin', 'administrator'].includes(u.role?.toLowerCase())).length;
  const statDoctor   = users.filter(u => u.role?.toLowerCase() === 'doctor').length;
  const statNurse    = users.filter(u => u.role?.toLowerCase() === 'nurse').length;
  const statStudent  = users.filter(u => u.role?.toLowerCase() === 'student').length;

  // ── Shared styles ──────────────────────────────────────────────────────────

  const inputCls = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]";
  const selectCls = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]";
  const labelCls = "block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide";

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* ── Top Section ── */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">User Management</h2>
          <button
            onClick={fetchUsers}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            {/* SVG Refresh Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Users',    value: statTotal   },
            { label: 'Administrators', value: statAdmin   },
            { label: 'Doctors',        value: statDoctor  },
            { label: 'Nurses',         value: statNurse   },
            { label: 'Students',       value: statStudent },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 md:mb-2 truncate">{label}</div>
              <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Merged Table & Filter Area ── */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">
        
        {/* Filter and Search Toolbar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <select
            value={currentFilter}
            onChange={(e) => setCurrentFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="staff">Staff</option>
            <option value="student">Students</option>
          </select>

          <div className="relative w-full sm:w-64">
            {/* SVG Search Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
            />
          </div>
        </div>

        {/* Scrollable Table Content */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Name</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">University ID</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Role</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Department</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Sex</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="bg-slate-50 text-left p-3 pr-6 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">No users found</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-[#e0eceb]/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-xs md:text-sm shrink-0">
                          {getInitials(user)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-700 text-sm whitespace-nowrap">{getFullName(user)}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px] md:max-w-xs">{user.email || '—'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-sm font-mono text-slate-600 whitespace-nowrap">
                      {user.universityId || '—'}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold"
                        style={getRoleBadgeStyle(user.role)}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{user.department || '—'}</td>
                    <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{user.sex || '—'}</td>

                    <td className="p-3 whitespace-nowrap">
                      {user.isProfileSetup ? (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-amber-100 text-amber-700">
                          Pending Setup
                        </span>
                      )}
                    </td>

                    <td className="p-3 pr-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Edit Button with SVG */}
                        <button
                          onClick={() => openEditModal(user)}
                          title="Edit user"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#466460] bg-slate-50 hover:bg-[#e0eceb] transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8zM16.862 4.487L19.5 7.125" />
                          </svg>
                        </button>

                        {/* Delete Button with SVG */}
                        <button
                          onClick={() => openDeleteModal(user)}
                          title="Delete user"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-slate-50 hover:bg-red-50 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 md:py-5 text-white shrink-0 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <div className="overflow-hidden">
                <h3 className="text-base md:text-lg font-bold truncate">Edit User — {getFullName(editTarget)}</h3>
                <p className="text-xs md:text-sm text-white/70 mt-0.5 truncate">{editTarget.email}</p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={saveEdit} className="flex flex-col gap-4">
                <div>
                  <label className={labelCls}>Role</label>
                  <select className={selectCls} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Department / Office</label>
                  <input
                    type="text"
                    placeholder="e.g. CCSE, Clinic, Registrar"
                    className={inputCls}
                    value={editForm.department}
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Nurse, Associate Professor"
                    className={inputCls}
                    value={editForm.jobTitle}
                    onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>Account Status</label>
                  <select className={selectCls} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {showDeleteModal && deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-red-600 to-red-700 px-6 py-5 text-white rounded-t-2xl flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold">Delete User</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm md:text-base mb-5">
                Are you sure you want to delete <strong>{getFullName(deleteTarget)}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Snackbar ───────────────────────────────────────────────────────── */}
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

export default UserManagement;