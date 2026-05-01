// frontend/src/features/admin-clinic/User-Management.jsx
import React, { useState, useEffect } from 'react';

// Initial user data
const initialUsers = [
  { id: 1, name: "Admin User", email: "admin@plsp.edu.ph", userId: "ADM-001", role: "admin", status: "active", department: "IT Administration", phone: "+63 912 345 6789", lastLogin: "2026-04-28 09:30 AM" },
  { id: 2, name: "Dr. Maria Santos", email: "maria.santos@plsp.edu.ph", userId: "DOC-101", role: "doctor", status: "active", department: "Clinic Department", phone: "+63 917 123 4567", lastLogin: "2026-04-27 03:15 PM" },
  { id: 3, name: "Nurse John Cruz", email: "john.cruz@plsp.edu.ph", userId: "NUR-202", role: "nurse", status: "active", department: "Clinic Department", phone: "+63 920 987 6543", lastLogin: "2026-04-28 08:45 AM" },
  { id: 4, name: "Staff Mark Garcia", email: "mark.garcia@plsp.edu.ph", userId: "STF-303", role: "staff", status: "inactive", department: "Registrar's Office", phone: "+63 915 555 1234", lastLogin: "2026-04-20 11:00 AM" },
  { id: 5, name: "Dr. James Rivera", email: "james.rivera@plsp.edu.ph", userId: "DOC-102", role: "doctor", status: "active", department: "Medical Department", phone: "+63 918 777 8888", lastLogin: "2026-04-26 02:30 PM" },
  { id: 6, name: "Nurse Anna Reyes", email: "anna.reyes@plsp.edu.ph", userId: "NUR-203", role: "nurse", status: "active", department: "Clinic Department", phone: "+63 922 333 4444", lastLogin: "2026-04-28 10:15 AM" },
  { id: 7, name: "Staff Leah Fernandez", email: "leah.fernandez@plsp.edu.ph", userId: "STF-304", role: "staff", status: "active", department: "Accounting Office", phone: "+63 916 222 3333", lastLogin: "2026-04-27 01:45 PM" },
  { id: 8, name: "Dr. Paolo Villanueva", email: "paolo.villanueva@plsp.edu.ph", userId: "DOC-103", role: "doctor", status: "inactive", department: "Pediatrics", phone: "+63 923 444 5555", lastLogin: "2026-04-19 09:00 AM" },
  { id: 9, name: "Nurse Sarah Lopez", email: "sarah.lopez@plsp.edu.ph", userId: "NUR-204", role: "nurse", status: "active", department: "Emergency Room", phone: "+63 925 666 7777", lastLogin: "2026-04-27 11:20 AM" }
];

export const UserManagement = () => {
  const [users, setUsers] = useState(initialUsers);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    userId: '',
    role: 'admin',
    status: 'active',
    department: '',
    phone: ''
  });

  const getInitials = (name) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const getRoleLabel = (role) => ({ admin: 'Admin', doctor: 'Doctor', nurse: 'Nurse', staff: 'Staff' }[role] || role);

  const filteredUsers = users.filter(user => {
    if (currentFilter !== 'all' && user.role !== currentFilter) return false;
    if (searchInput) {
      const search = searchInput.toLowerCase();
      return user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search) || user.userId.toLowerCase().includes(search);
    }
    return true;
  });

  const handleFilter = (role) => {
    setCurrentFilter(role);
  };

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      fullName: '',
      email: '',
      userId: '',
      role: 'admin',
      status: 'active',
      department: '',
      phone: ''
    });
    setShowModal(true);
  };

  const editUser = (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    setEditId(user.id);
    setFormData({
      fullName: user.name,
      email: user.email,
      userId: user.userId,
      role: user.role,
      status: user.status,
      department: user.department || '',
      phone: user.phone || ''
    });
    setShowModal(true);
  };

  const saveUser = (e) => {
    e.preventDefault();
    const now = new Date();
    const lastLogin = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userData = {
      name: formData.fullName.trim(),
      email: formData.email.trim(),
      userId: formData.userId.trim(),
      role: formData.role,
      status: formData.status,
      department: formData.department,
      phone: formData.phone,
      lastLogin: lastLogin
    };

    if (editId) {
      setUsers(users.map(u => u.id === editId ? { ...u, ...userData } : u));
      showSnackbar('User updated successfully', 'success');
    } else {
      const newId = Math.max(...users.map(u => u.id), 0) + 1;
      setUsers([...users, { id: newId, ...userData }]);
      showSnackbar('User added successfully', 'success');
    }
    closeModal();
  };

  const openDeleteModal = (id) => {
    const user = users.find(u => u.id === id);
    setDeleteTargetId(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      setUsers(users.filter(u => u.id !== deleteTargetId.id));
      showSnackbar('User deleted successfully', 'success');
    }
    closeDeleteModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  const showSnackbar = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const statTotal = users.length;
  const statAdmin = users.filter(u => u.role === 'admin').length;
  const statDoctor = users.filter(u => u.role === 'doctor').length;
  const statNurse = users.filter(u => u.role === 'nurse').length;
  const statActive = users.filter(u => u.status === 'active').length;

  return (
    <div className="bg-white min-h-[calc(100vh-140px)] p-6 md:p-8">

      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#466460]">User Management</h2>
        <button onClick={openAddModal} className="bg-[#466460] hover:bg-[#3a524f] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm">
          <i className="fa-solid fa-user-plus"></i> Add New User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md transition">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Users</div>
          <div className="text-3xl font-extrabold text-[#466460]">{statTotal}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md transition">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Administrators</div>
          <div className="text-3xl font-extrabold text-[#466460]">{statAdmin}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md transition">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Doctors</div>
          <div className="text-3xl font-extrabold text-[#466460]">{statDoctor}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md transition">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Nurses</div>
          <div className="text-3xl font-extrabold text-[#466460]">{statNurse}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:-translate-y-0.5 hover:shadow-md transition">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Users</div>
          <div className="text-3xl font-extrabold text-[#466460]">{statActive}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 rounded-xl p-4 mb-5 flex justify-between items-center flex-wrap gap-3 border border-slate-200">
        <div className="flex gap-2 flex-wrap">
          {['all', 'admin', 'doctor', 'nurse', 'staff'].map(filter => (
            <button
              key={filter}
              onClick={() => handleFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${currentFilter === filter ? 'bg-[#466460] text-white border border-[#466460]' : 'bg-white border border-slate-300 text-slate-600 hover:bg-[#e0eceb] hover:border-[#466460]'}`}
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
            onChange={handleSearch}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-full text-sm w-64 outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">User</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">User ID</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Role</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Department</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Status</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide">Last Login</th>
              <th className="text-left p-3 text-[11px] font-bold uppercase text-slate-500 tracking-wide w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">No users found</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-[#e0eceb] transition-colors cursor-pointer">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460]">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">{user.name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm font-mono">{user.userId}</td>
                  <td className="p-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${user.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : user.role === 'doctor' ? 'bg-blue-100 text-blue-700' : user.role === 'nurse' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{user.department || '—'}</td>
                  <td className="p-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{user.lastLogin || 'Never'}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => editUser(user.id)} className="p-2 rounded-lg text-[#466460] hover:bg-[#e0eceb] transition">
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button onClick={() => openDeleteModal(user.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition">
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

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-5 text-white rounded-t-2xl">
              <h3 className="text-lg font-bold">
                <i className={`fa-solid ${editId ? 'fa-user-pen' : 'fa-user-plus'} mr-2`}></i>
                {editId ? 'Edit User' : 'Add New User'}
              </h3>
            </div>
            <form onSubmit={saveUser} className="p-6">
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">Full Name *</label>
                <input type="text" required placeholder="e.g., Dr. Maria Santos" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">Email Address *</label>
                <input type="email" required placeholder="name@plsp.edu.ph" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">User ID / Employee ID *</label>
                <input type="text" required placeholder="e.g., ADM-001, DOC-101" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]" value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">Role</label>
                  <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    <option value="admin">Administrator</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">Status</label>
                  <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">Department</label>
                <input type="text" placeholder="e.g., Clinic Department, IT Office" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
              </div>
              <div className="mb-5">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 tracking-wide">Phone Number</label>
                <input type="text" placeholder="+63 XXX XXX XXXX" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition">Save User</button>
                <button type="button" onClick={closeModal} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}>
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="bg-gradient-to-br from-red-600 to-red-700 px-6 py-5 text-white rounded-t-2xl">
              <h3 className="text-lg font-bold"><i className="fa-solid fa-trash-can mr-2"></i>Delete User</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-5">Are you sure you want to delete <strong>{deleteTargetId?.name}</strong>? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition">Delete</button>
                <button onClick={closeDeleteModal} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {message.text}
        </div>
      )}

    </div>
  );
};

export default UserManagement;