// frontend/src/features/admin-clinic/User-Management.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [message, setMessage] = useState(null);

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ── Delete modal ───────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Create modal ───────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  const EMPTY_CREATE = {
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    university_id: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    role: 'student',
    department: '',
    program: '',
    job_title: '',
    birthday: '',
    age: '',
    sex: '',
    blood_type: '',
    civil_status: '',
    religion: '',
    nationality: '',
    home_address: '',
    year_level: '',
    section: '',
    student_classification: '',
    classification: '',
    is_verified: true,
    is_profile_setup: false,
  };
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const cf = (key, value) => setCreateForm(f => ({ ...f, [key]: value }));

  // ── Full edit form ─────────────────────────────────────────────────────────
  const EMPTY_FORM = {
    first_name: '', middle_name: '', last_name: '', suffix: '',
    university_id: '', email: '', phone_number: '',
    role: 'student', department: '', program: '', job_title: '',
    birthday: '', age: '', sex: '', blood_type: '', civil_status: '',
    religion: '', nationality: '', home_address: '',
    year_level: '', section: '', student_classification: '', classification: '',
    is_verified: false, is_profile_setup: false,
  };
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getFullName = (user) =>
    [user.first_name, user.middle_name || '', user.last_name, user.suffix || '']
      .filter(Boolean).join(' ') || '—';

  const getInitials = (user) =>
    ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U';

  // ── Role sets ──────────────────────────────────────────────────────────────

  const CLINIC_ROLES = new Set([
    'doctor','nurse','dentist','staff','employee','midwife','pharmacist',
    'medical technologist','radiologist','physical therapist','clinic staff',
  ]);
  const isClinicStaff = (role) => CLINIC_ROLES.has(role?.toLowerCase());

  const FACULTY_ROLES = new Set([
    'instructor','lecturer','teacher','professor','dean',
    'assistant professor','associate professor','department head',
    'program chair','coordinator','faculty','clinical instructor',
    'part-time instructor','part time instructor','visiting professor',
    'adjunct professor','registrar','guidance counselor','counselor','librarian',
  ]);
  const isFaculty = (role) => FACULTY_ROLES.has(role?.toLowerCase());

  // ── Role label / badge ─────────────────────────────────────────────────────

  const getRoleLabel = (role) => {
    const map = {
      admin:'Admin', administrator:'Admin',
      doctor:'Doctor', nurse:'Nurse', staff:'Staff', employee:'Staff',
      dentist:'Dentist', midwife:'Midwife', pharmacist:'Pharmacist',
      'medical technologist':'Med. Technologist', radiologist:'Radiologist',
      'physical therapist':'Physical Therapist', 'clinic staff':'Clinic Staff',
      student:'Student',
      instructor:'Instructor', lecturer:'Lecturer', teacher:'Teacher',
      professor:'Professor', dean:'Dean',
      'assistant professor':'Asst. Professor', 'associate professor':'Assoc. Professor',
      'department head':'Dept. Head', 'program chair':'Program Chair',
      coordinator:'Coordinator', faculty:'Faculty',
      'clinical instructor':'Clinical Instructor',
      'part-time instructor':'Part-time Instructor',
      'visiting professor':'Visiting Professor',
      'adjunct professor':'Adjunct Professor',
      registrar:'Registrar', 'guidance counselor':'Guidance Counselor',
      counselor:'Counselor', librarian:'Librarian',
    };
    return map[role?.toLowerCase()] || (role || '—');
  };

  const getRoleBadgeStyle = (role) => {
    const r = role?.toLowerCase();
    if (r === 'admin' || r === 'administrator') return { background: '#fef9c3', color: '#854d0e' };
    if (isClinicStaff(r)) return { background: '#dbeafe', color: '#1d4ed8' };
    if (r === 'student') return { background: '#f3e8ff', color: '#6b21a8' };
    if (isFaculty(r)) return { background: '#fff7ed', color: '#9a3412' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredUsers = users.filter(user => {
    const role = user.role?.toLowerCase();
    if (currentFilter === 'faculty') { if (!isFaculty(role)) return false; }
    else if (currentFilter === 'clinic_staff') { if (!isClinicStaff(role)) return false; }
    else if (currentFilter !== 'all') { if (role !== currentFilter) return false; }
    if (searchInput) {
      const s = searchInput.toLowerCase();
      return (
        getFullName(user).toLowerCase().includes(s) ||
        user.email?.toLowerCase().includes(s) ||
        user.university_id?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // ── Create User ────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setCreateForm(EMPTY_CREATE);
    setShowCreatePassword(false);
    setShowCreateConfirm(false);
    setShowCreateModal(true);
  };

  const saveCreate = async (e) => {
    e.preventDefault();

    if (createForm.password !== createForm.confirm_password) {
      showSnackbar('Passwords do not match', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'error');
      return;
    }

    setCreateLoading(true);
    try {
      // 1. Check if university ID already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('university_id', createForm.university_id)
        .maybeSingle();
      if (existing) {
        showSnackbar('This University ID is already registered', 'error');
        setCreateLoading(false);
        return;
      }

      // 2. Create Supabase Auth account via admin API call through Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-auth-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: createForm.email,
            password: createForm.password,
            firstName: createForm.first_name,
            lastName: createForm.last_name,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create auth user');

      const newUid = result.uid;

      // 3. Insert into users table
      const newUser = {
        uid:                    newUid,
        first_name:             createForm.first_name,
        middle_name:            createForm.middle_name || '',
        last_name:              createForm.last_name,
        suffix:                 createForm.suffix || '',
        email:                  createForm.email.toLowerCase(),
        university_id:          createForm.university_id,
        phone_number:           createForm.phone_number || '',
        role:                   createForm.role,
        department:             createForm.department || '',
        program:                createForm.program || '',
        job_title:              createForm.job_title || '',
        birthday:               createForm.birthday || '',
        age:                    createForm.age === '' ? null : Number(createForm.age),
        sex:                    createForm.sex || '',
        blood_type:             createForm.blood_type || '',
        civil_status:           createForm.civil_status || '',
        religion:               createForm.religion || '',
        nationality:            createForm.nationality || '',
        home_address:           createForm.home_address || '',
        year_level:             createForm.year_level || '',
        section:                createForm.section || '',
        student_classification: createForm.student_classification || '',
        classification:         createForm.classification || '',
        is_verified:            createForm.is_verified,
        is_profile_setup:       createForm.is_profile_setup,
        created_at:             new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();
      if (insertError) throw insertError;

      setUsers(prev => [inserted, ...prev]);
      showSnackbar('User created successfully', 'success');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating user:', err);
      showSnackbar('Error creating user: ' + (err.message || ''), 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit modal ─────────────────────────────────────────────────────────────

  const openEditModal = (user) => {
    setEditTarget(user);
    setEditForm({
      first_name:             user.first_name             || '',
      middle_name:            user.middle_name            || '',
      last_name:              user.last_name              || '',
      suffix:                 user.suffix                 || '',
      university_id:          user.university_id          || '',
      email:                  user.email                  || '',
      phone_number:           user.phone_number           || '',
      role:                   user.role                   || 'student',
      department:             user.department             || '',
      program:                user.program                || '',
      job_title:              user.job_title              || '',
      birthday:               user.birthday               || '',
      age:                    user.age                    ?? '',
      sex:                    user.sex                    || '',
      blood_type:             user.blood_type             || '',
      civil_status:           user.civil_status           || '',
      religion:               user.religion               || '',
      nationality:            user.nationality            || '',
      home_address:           user.home_address           || '',
      year_level:             user.year_level             || '',
      section:                user.section                || '',
      student_classification: user.student_classification || '',
      classification:         user.classification         || '',
      is_verified:            user.is_verified            ?? false,
      is_profile_setup:       user.is_profile_setup       ?? false,
    });
    setShowEditModal(true);
  };

  const field = (key, value) => setEditForm(f => ({ ...f, [key]: value }));

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editForm,
        age: editForm.age === '' ? null : Number(editForm.age),
        updated_at: new Date().toISOString(),
      };
      const { error: dbError } = await supabase
        .from('users').update(payload).eq('id', editTarget.id);
      if (dbError) throw dbError;

      if (editForm.email !== editTarget.email) {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-auth-user`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ userId: editTarget.uid, email: editForm.email }),
          }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update auth email');
      }

      setUsers(users.map(u => u.id === editTarget.id ? { ...u, ...payload } : u));
      showSnackbar('User updated successfully', 'success');
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating user:', err);
      showSnackbar('Error updating user: ' + (err.message || ''), 'error');
    }
  };

  // ── Delete modal ───────────────────────────────────────────────────────────

  const openDeleteModal = (user) => { setDeleteTarget(user); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', deleteTarget.id);
      if (error) throw error;
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

  const statTotal       = users.length;
  const statAdmin       = users.filter(u => ['admin','administrator'].includes(u.role?.toLowerCase())).length;
  const statClinicStaff = users.filter(u => isClinicStaff(u.role)).length;
  const statStudent     = users.filter(u => u.role?.toLowerCase() === 'student').length;
  const statFaculty     = users.filter(u => isFaculty(u.role)).length;

  // ── Shared styles ──────────────────────────────────────────────────────────

  const inputCls  = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] bg-white";
  const selectCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]";
  const labelCls  = "block text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide";
  const sectionHeadCls = "col-span-full text-[10px] font-black uppercase tracking-widest text-[#466460] border-b border-[#e0eceb] pb-1 mt-2";

  // ── Shared role <optgroup> block used in both create & edit modals ─────────
  const RoleOptions = () => (
    <>
      <optgroup label="Administration">
        <option value="admin">Administrator</option>
      </optgroup>
      <optgroup label="Clinic Staff">
        <option value="doctor">Doctor</option>
        <option value="nurse">Nurse</option>
        <option value="dentist">Dentist</option>
        <option value="staff">Staff</option>
        <option value="midwife">Midwife</option>
        <option value="pharmacist">Pharmacist</option>
        <option value="medical technologist">Medical Technologist</option>
        <option value="radiologist">Radiologist</option>
        <option value="physical therapist">Physical Therapist</option>
        <option value="clinic staff">Clinic Staff (General)</option>
      </optgroup>
      <optgroup label="Faculty">
        <option value="instructor">Instructor</option>
        <option value="lecturer">Lecturer</option>
        <option value="teacher">Teacher</option>
        <option value="professor">Professor</option>
        <option value="assistant professor">Assistant Professor</option>
        <option value="associate professor">Associate Professor</option>
        <option value="dean">Dean</option>
        <option value="department head">Department Head</option>
        <option value="program chair">Program Chair</option>
        <option value="coordinator">Coordinator</option>
        <option value="clinical instructor">Clinical Instructor</option>
        <option value="part-time instructor">Part-time Instructor</option>
        <option value="visiting professor">Visiting Professor</option>
        <option value="adjunct professor">Adjunct Professor</option>
        <option value="registrar">Registrar</option>
        <option value="guidance counselor">Guidance Counselor</option>
        <option value="counselor">Counselor</option>
        <option value="librarian">Librarian</option>
        <option value="faculty">Faculty (General)</option>
      </optgroup>
      <optgroup label="Student">
        <option value="student">Student</option>
      </optgroup>
    </>
  );

  // ── Password eye toggle icon ───────────────────────────────────────────────
  const EyeIcon = ({ open }) => open
    ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06"/></svg>
    : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>;

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* ── Top Section ── */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">User Management</h2>
          <div className="flex items-center gap-2">
            {/* Add User Button */}
            <button
              onClick={openCreateModal}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden sm:inline">Add User</span>
            </button>
            {/* Refresh Button */}
            <button
              onClick={fetchUsers}
              className="bg-white hover:bg-slate-100 text-[#466460] border border-slate-200 px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total Users',    value: statTotal       },
            { label: 'Administrators', value: statAdmin       },
            { label: 'Clinic Staff',   value: statClinicStaff },
            { label: 'Students',       value: statStudent     },
            { label: 'Faculty',        value: statFaculty     },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
              <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1 md:mb-2 truncate">{label}</div>
              <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table Area ── */}
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
            <option value="clinic_staff">Clinic Staff</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
          </select>

          <div className="relative w-full sm:w-64">
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

        {/* Scrollable Table */}
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
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">No users found</td></tr>
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
                    <td className="p-3 text-sm font-mono text-slate-600 whitespace-nowrap">{user.university_id || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold" style={getRoleBadgeStyle(user.role)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{user.department || '—'}</td>
                    <td className="p-3 text-sm text-slate-600 whitespace-nowrap">{user.sex || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {user.is_profile_setup
                        ? <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-green-100 text-green-700">Active</span>
                        : <span className="inline-block px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold bg-amber-100 text-amber-700">Pending Setup</span>
                      }
                    </td>
                    <td className="p-3 pr-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(user)} title="Edit user"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#466460] bg-slate-50 hover:bg-[#e0eceb] transition">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8zM16.862 4.487L19.5 7.125" />
                          </svg>
                        </button>
                        <button onClick={() => openDeleteModal(user)} title="Delete user"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 bg-slate-50 hover:bg-red-50 transition">
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

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE USER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 text-white shrink-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold">Create New User</h3>
                <p className="text-xs text-white/70 mt-0.5">Fill in the details to manually register a user</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={saveCreate} id="create-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">

                  {/* ── Identity ── */}
                  <div className={sectionHeadCls}>Identity</div>

                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input className={inputCls} value={createForm.first_name} onChange={e => cf('first_name', e.target.value)} placeholder="First name" required />
                  </div>
                  <div>
                    <label className={labelCls}>Middle Name</label>
                    <input className={inputCls} value={createForm.middle_name} onChange={e => cf('middle_name', e.target.value)} placeholder="Middle name" />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name *</label>
                    <input className={inputCls} value={createForm.last_name} onChange={e => cf('last_name', e.target.value)} placeholder="Last name" required />
                  </div>
                  <div>
                    <label className={labelCls}>Suffix</label>
                    <input className={inputCls} value={createForm.suffix} onChange={e => cf('suffix', e.target.value)} placeholder="e.g. Jr., III" />
                  </div>
                  <div>
                    <label className={labelCls}>University ID *</label>
                    <input className={inputCls} value={createForm.university_id} onChange={e => cf('university_id', e.target.value)} placeholder="e.g. 2021-00001" required />
                  </div>
                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <input className={inputCls} value={createForm.phone_number} onChange={e => cf('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" />
                  </div>

                  {/* ── Account Credentials ── */}
                  <div className={sectionHeadCls}>Account Credentials</div>

                  <div className="sm:col-span-2">
                    <label className={labelCls}>Email Address *</label>
                    <input className={inputCls} type="email" value={createForm.email} onChange={e => cf('email', e.target.value)} placeholder="user@example.com" required />
                  </div>
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <input
                        className={inputCls + " pr-10"}
                        type={showCreatePassword ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={e => cf('password', e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#466460] transition"
                      >
                        <EyeIcon open={showCreatePassword} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password *</label>
                    <div className="relative">
                      <input
                        className={inputCls + " pr-10"}
                        type={showCreateConfirm ? 'text' : 'password'}
                        value={createForm.confirm_password}
                        onChange={e => cf('confirm_password', e.target.value)}
                        placeholder="Repeat password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreateConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#466460] transition"
                      >
                        <EyeIcon open={showCreateConfirm} />
                      </button>
                    </div>
                  </div>

                  {/* ── Role & Work ── */}
                  <div className={sectionHeadCls}>Role &amp; Work</div>

                  <div>
                    <label className={labelCls}>Role *</label>
                    <select className={selectCls} value={createForm.role} onChange={e => cf('role', e.target.value)} required>
                      <RoleOptions />
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Department / College</label>
                    <input className={inputCls} value={createForm.department} onChange={e => cf('department', e.target.value)} placeholder="e.g. CCSE, Clinic" />
                  </div>
                  <div>
                    <label className={labelCls}>Program</label>
                    <input className={inputCls} value={createForm.program} onChange={e => cf('program', e.target.value)} placeholder="e.g. BSCS, BSIT" />
                  </div>
                  <div>
                    <label className={labelCls}>Job Title</label>
                    <input className={inputCls} value={createForm.job_title} onChange={e => cf('job_title', e.target.value)} placeholder="e.g. Nurse, Associate Professor" />
                  </div>

                  {/* ── Personal Info ── */}
                  <div className={sectionHeadCls}>Personal Information</div>

                  <div>
                    <label className={labelCls}>Birthday</label>
                    <input className={inputCls} type="date" value={createForm.birthday} onChange={e => cf('birthday', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Age</label>
                    <input className={inputCls} type="number" min="1" max="120" value={createForm.age} onChange={e => cf('age', e.target.value)} placeholder="Age" />
                  </div>
                  <div>
                    <label className={labelCls}>Sex</label>
                    <select className={selectCls} value={createForm.sex} onChange={e => cf('sex', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Blood Type</label>
                    <select className={selectCls} value={createForm.blood_type} onChange={e => cf('blood_type', e.target.value)}>
                      <option value="">— Select —</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Civil Status</label>
                    <select className={selectCls} value={createForm.civil_status} onChange={e => cf('civil_status', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Religion</label>
                    <input className={inputCls} value={createForm.religion} onChange={e => cf('religion', e.target.value)} placeholder="e.g. Roman Catholic" />
                  </div>
                  <div>
                    <label className={labelCls}>Nationality</label>
                    <input className={inputCls} value={createForm.nationality} onChange={e => cf('nationality', e.target.value)} placeholder="e.g. Filipino" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Home Address</label>
                    <textarea className={inputCls + " resize-none"} rows={2} value={createForm.home_address} onChange={e => cf('home_address', e.target.value)} placeholder="Full home address" />
                  </div>

                  {/* ── Academic ── */}
                  <div className={sectionHeadCls}>Academic</div>

                  <div>
                    <label className={labelCls}>Year Level</label>
                    <select className={selectCls} value={createForm.year_level} onChange={e => cf('year_level', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Section</label>
                    <input className={inputCls} value={createForm.section} onChange={e => cf('section', e.target.value)} placeholder="e.g. A, B, CS3A" />
                  </div>
                  <div>
                    <label className={labelCls}>Student Classification</label>
                    <select className={selectCls} value={createForm.student_classification} onChange={e => cf('student_classification', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Regular">Regular</option>
                      <option value="Irregular">Irregular</option>
                      <option value="Transferee">Transferee</option>
                      <option value="Freshmen">Freshmen</option>
                      <option value="Returnee">Returnee</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Classification</label>
                    <input className={inputCls} value={createForm.classification} onChange={e => cf('classification', e.target.value)} placeholder="e.g. Undergraduate" />
                  </div>

                  {/* ── Account Flags ── */}
                  <div className={sectionHeadCls}>Account Flags</div>

                  <div className="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => cf('is_verified', !createForm.is_verified)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${createForm.is_verified ? 'bg-[#466460]' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${createForm.is_verified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700 font-medium">Mark as Email Verified</span>
                  </div>

                  <div className="flex items-center gap-3 py-1">
                    <button
                      type="button"
                      onClick={() => cf('is_profile_setup', !createForm.is_profile_setup)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${createForm.is_profile_setup ? 'bg-[#466460]' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${createForm.is_profile_setup ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700 font-medium">Mark Profile as Complete</span>
                  </div>

                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-form"
                disabled={createLoading}
                className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {createLoading && (
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                )}
                {createLoading ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {showEditModal && editTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="bg-gradient-to-br from-[#466460] to-[#3a524f] px-6 py-4 text-white shrink-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                {getInitials(editTarget)}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-base font-bold truncate">Edit User — {getFullName(editTarget)}</h3>
                <p className="text-xs text-white/70 mt-0.5 truncate">{editTarget.email}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="ml-auto w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={saveEdit} id="edit-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">

                  <div className={sectionHeadCls}>Identity</div>
                  <div><label className={labelCls}>First Name</label><input className={inputCls} value={editForm.first_name} onChange={e => field('first_name', e.target.value)} placeholder="First name" required /></div>
                  <div><label className={labelCls}>Middle Name</label><input className={inputCls} value={editForm.middle_name} onChange={e => field('middle_name', e.target.value)} placeholder="Middle name" /></div>
                  <div><label className={labelCls}>Last Name</label><input className={inputCls} value={editForm.last_name} onChange={e => field('last_name', e.target.value)} placeholder="Last name" required /></div>
                  <div><label className={labelCls}>Suffix</label><input className={inputCls} value={editForm.suffix} onChange={e => field('suffix', e.target.value)} placeholder="e.g. Jr., III" /></div>
                  <div><label className={labelCls}>University ID</label><input className={inputCls} value={editForm.university_id} onChange={e => field('university_id', e.target.value)} placeholder="e.g. 2021-00001" /></div>
                  <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={editForm.email} onChange={e => field('email', e.target.value)} placeholder="user@example.com" required /></div>
                  <div><label className={labelCls}>Phone Number</label><input className={inputCls} value={editForm.phone_number} onChange={e => field('phone_number', e.target.value)} placeholder="+63 9XX XXX XXXX" /></div>

                  <div className={sectionHeadCls}>Role &amp; Work</div>
                  <div>
                    <label className={labelCls}>Role</label>
                    <select className={selectCls} value={editForm.role} onChange={e => field('role', e.target.value)}>
                      <RoleOptions />
                    </select>
                  </div>
                  <div><label className={labelCls}>Department / College</label><input className={inputCls} value={editForm.department} onChange={e => field('department', e.target.value)} placeholder="e.g. CCSE, Clinic" /></div>
                  <div><label className={labelCls}>Program</label><input className={inputCls} value={editForm.program} onChange={e => field('program', e.target.value)} placeholder="e.g. BSCS, BSIT" /></div>
                  <div><label className={labelCls}>Job Title</label><input className={inputCls} value={editForm.job_title} onChange={e => field('job_title', e.target.value)} placeholder="e.g. Nurse, Associate Professor" /></div>

                  <div className={sectionHeadCls}>Personal Information</div>
                  <div><label className={labelCls}>Birthday</label><input className={inputCls} type="date" value={editForm.birthday} onChange={e => field('birthday', e.target.value)} /></div>
                  <div><label className={labelCls}>Age</label><input className={inputCls} type="number" min="1" max="120" value={editForm.age} onChange={e => field('age', e.target.value)} placeholder="Age" /></div>
                  <div>
                    <label className={labelCls}>Sex</label>
                    <select className={selectCls} value={editForm.sex} onChange={e => field('sex', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Blood Type</label>
                    <select className={selectCls} value={editForm.blood_type} onChange={e => field('blood_type', e.target.value)}>
                      <option value="">— Select —</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Civil Status</label>
                    <select className={selectCls} value={editForm.civil_status} onChange={e => field('civil_status', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Religion</label><input className={inputCls} value={editForm.religion} onChange={e => field('religion', e.target.value)} placeholder="e.g. Roman Catholic" /></div>
                  <div><label className={labelCls}>Nationality</label><input className={inputCls} value={editForm.nationality} onChange={e => field('nationality', e.target.value)} placeholder="e.g. Filipino" /></div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Home Address</label>
                    <textarea className={inputCls + " resize-none"} rows={2} value={editForm.home_address} onChange={e => field('home_address', e.target.value)} placeholder="Full home address" />
                  </div>

                  <div className={sectionHeadCls}>Academic</div>
                  <div>
                    <label className={labelCls}>Year Level</label>
                    <select className={selectCls} value={editForm.year_level} onChange={e => field('year_level', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Section</label><input className={inputCls} value={editForm.section} onChange={e => field('section', e.target.value)} placeholder="e.g. A, B, CS3A" /></div>
                  <div>
                    <label className={labelCls}>Student Classification</label>
                    <select className={selectCls} value={editForm.student_classification} onChange={e => field('student_classification', e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Regular">Regular</option>
                      <option value="Irregular">Irregular</option>
                      <option value="Transferee">Transferee</option>
                      <option value="Freshmen">Freshmen</option>
                      <option value="Returnee">Returnee</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Classification</label><input className={inputCls} value={editForm.classification} onChange={e => field('classification', e.target.value)} placeholder="e.g. Undergraduate" /></div>

                  <div className={sectionHeadCls}>Account Flags</div>
                  <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => field('is_verified', !editForm.is_verified)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${editForm.is_verified ? 'bg-[#466460]' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.is_verified ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700 font-medium">Email Verified</span>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    <button type="button" onClick={() => field('is_profile_setup', !editForm.is_profile_setup)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${editForm.is_profile_setup ? 'bg-[#466460]' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.is_profile_setup ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm text-slate-700 font-medium">Profile Setup Complete</span>
                  </div>

                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
              <button type="button" onClick={() => setShowEditModal(false)}
                className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">
                Cancel
              </button>
              <button type="submit" form="edit-form"
                className="flex-1 bg-[#466460] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a524f] transition">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
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
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-300 transition">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Snackbar ── */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success'
            ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          }
          {message.text}
        </div>
      )}

    </div>
  );
};

export default UserManagement;