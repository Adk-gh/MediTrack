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
    <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#466460]">User Management</h2>
        <button
          onClick={fetchUsers}
          className="bg-[#466460] hover:bg-[#3a524f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm"
        >
          <i className="fa-solid fa-rotate-right"></i> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Users',     value: statTotal   },
          { label: 'Administrators',  value: statAdmin   },
          { label: 'Doctors',         value: statDoctor  },
          { label: 'Nurses',          value: statNurse   },
          { label: 'Students',        value: statStudent },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</div>
            <div className="text-3xl font-extrabold text-[#466460]">{value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 rounded-xl p-4 mb-5 flex justify-between items-center flex-wrap gap-3 border border-slate-200">
        <div className="flex gap-2 flex-wrap">
          {['all', 'admin', 'doctor', 'nurse', 'staff', 'student'].map(filter => (
            <button
              key={filter}
              onClick={() => setCurrentFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                currentFilter === filter
                  ? 'bg-[#466460] text-white border border-[#466460]'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-[#e0eceb] hover:border-[#466460]'
              }`}
            >
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-full text-sm w-64 outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Name</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">University ID</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Role</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Department</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Sex</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Status</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">No users found</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-[#e0eceb]/40 transition-colors">

                  {/* Name + Email */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-sm shrink-0">
                        {getInitials(user)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700 text-sm">{getFullName(user)}</div>
                        <div className="text-xs text-slate-400">{user.email || '—'}</div>
                      </div>
                    </div>
                  </td>

                  {/* University ID */}
                  <td className="p-3 text-sm font-mono text-slate-600">
                    {user.universityId || '—'}
                  </td>

                  {/* Role badge */}
                  <td className="p-3">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-[11px] font-bold"
                      style={getRoleBadgeStyle(user.role)}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="p-3 text-sm text-slate-600">{user.department || '—'}</td>

                  {/* Sex */}
                  <td className="p-3 text-sm text-slate-600">{user.sex || '—'}</td>

                  {/* Status */}
                  <td className="p-3">
                    {user.isProfileSetup ? (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                        Pending Setup
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        title="Edit user"
                        className="p-2 rounded-lg text-[#466460] hover:bg-[#e0eceb] transition"
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        title="Delete user"
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {showEditModal && editTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={e => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-5 text-white">
              <h3 className="text-lg font-bold">
                <i className="fa-solid fa-user-pen mr-2"></i>
                Edit User — {getFullName(editTarget)}
              </h3>
              <p className="text-sm text-white/70 mt-0.5">{editTarget.email}</p>
            </div>

            <form onSubmit={saveEdit} className="p-6 flex flex-col gap-4">
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

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition">
                  Save Changes
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {showDeleteModal && deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-red-600 to-red-700 px-6 py-5 text-white rounded-t-2xl">
              <h3 className="text-lg font-bold"><i className="fa-solid fa-trash-can mr-2"></i>Delete User</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-5">
                Are you sure you want to delete <strong>{getFullName(deleteTarget)}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition">
                  Delete
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Snackbar ───────────────────────────────────────────────────────── */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {message.text}
        </div>
      )}

    </div>
  );
};

export default UserManagement;