// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\Announcements.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker';

// ============================================================
// CONFIG & CONSTANTS
// ============================================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ALL_DEPT_LABEL = 'All Departments';
const CATEGORIES = ['General', 'Vaccination', 'Screening', 'Dental', 'Mental Health', 'Emergency', 'Schedule', 'Event'];

const CATEGORY_COLORS = {
  General:       'bg-slate-100 text-slate-600',
  Vaccination:   'bg-blue-100 text-blue-700',
  Screening:     'bg-purple-100 text-purple-700',
  Dental:        'bg-cyan-100 text-cyan-700',
  'Mental Health':'bg-pink-100 text-pink-700',
  Emergency:     'bg-red-100 text-red-700',
  Schedule:      'bg-amber-100 text-amber-700',
  Event:         'bg-green-100 text-green-700',
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent',  color: 'bg-red-500',    dot: 'bg-red-500'    },
  high:   { label: 'High',    color: 'bg-orange-400', dot: 'bg-orange-400' },
  normal: { label: 'Normal',  color: 'bg-slate-300',  dot: 'bg-slate-400'  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  if (isNaN(Date.parse(dateStr))) return dateStr;
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const todayIso = () => new Date().toISOString().split('T')[0];

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getRoleFromStorage = () => {
  const direct = localStorage.getItem('role');
  if (direct) return direct.toLowerCase();
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const parsed = JSON.parse(userJson);
      if (parsed?.role) return parsed.role.toLowerCase();
    }
  } catch (_) {}
  return null;
};

const formatDeptDisplay = (deptValue, deptOptions) => {
  let deptArray = [];
  if (!deptValue) return [ALL_DEPT_LABEL];
  if (Array.isArray(deptValue)) {
    deptArray = deptValue;
  } else if (typeof deptValue === 'string') {
    try {
      const parsed = JSON.parse(deptValue);
      deptArray = Array.isArray(parsed) ? parsed : [deptValue];
    } catch {
      deptArray = [deptValue];
    }
  }

  if (deptArray.length === deptOptions.length && deptOptions.every(d => deptArray.includes(d))) {
    return [ALL_DEPT_LABEL];
  }

  return deptArray.length > 0 ? deptArray : [ALL_DEPT_LABEL];
};

const EMPTY_FORM = {
  title:    '',
  content:  '',
  dept:     [],
  category: 'General',
  priority: 'normal',
  location: '',
  contactPerson: '',
  contactEmail:  '',
  image_url:     null,
  imageFile:     null,
};

const Snackbar = ({ message, type, visible }) => (
  <div className={`fixed bottom-8 left-1/2 z-[9999] flex w-[90%] sm:w-auto max-w-md items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-[13px] font-semibold shadow-2xl transition-all duration-400
    ${visible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 translate-y-24 opacity-0'}
    ${type === 'success' ? 'bg-gradient-to-r from-[#166534] to-[#15803d]' : 'bg-gradient-to-r from-[#991b1b] to-[#dc2626]'}`}>
    <i className={`fa-solid shrink-0 ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
    <span className="truncate">{message}</span>
  </div>
);

const ImageDropZone = ({ value, onChange, onClear }) => {
  const inputRef   = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select an image file (JPG, PNG, GIF, WEBP).');
    if (file.size > 5 * 1024 * 1024) return alert('Image must be smaller than 5 MB.');
    const b64 = await toBase64(file);
    onChange(b64, file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="mt-2 w-full">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[#e2e8f0] group">
          <img src={value} alt="Preview" className="w-full max-h-40 sm:max-h-52 object-cover" />
          <div className="absolute inset-0 bg-black/0 sm:group-hover:bg-black/30 transition-all flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button type="button" onClick={onClear} className="bg-red-500 text-white text-[11px] font-bold px-4 py-2 rounded-full flex items-center gap-1.5 hover:bg-red-600 transition-colors shadow-lg sm:shadow-none">
              <i className="fa-solid fa-trash-can"></i> Remove Image
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all ${drag ? 'border-[#466460] bg-[#e0eceb]/40' : 'border-[#d1e7e5] hover:border-[#466460] hover:bg-[#f0f7f6]'}`}
        >
          <i className="fa-solid fa-image text-2xl text-slate-300 mb-2 block"></i>
          <p className="text-[11px] sm:text-[12px] text-slate-500 font-medium">Drop an image here, or <span className="text-[#466460] underline">browse</span></p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
};

export const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [configData, setConfigData]       = useState(null);
  const [loading, setLoading]             = useState(true);

  const [activeMenuId, setActiveMenuId]   = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentEditId, setCurrentEditId]     = useState(null);
  const [showAllDepts, setShowAllDepts]       = useState(false); // New state for interactive departments

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [viewData, setViewData] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const snackbarTimer           = useRef(null);

  const [userRole, setUserRole] = useState('');

  // Derived Department Options
  const deptOptions = configData?.departments?.map(d => d.full) || [];

  // Helper function to get the abbreviation from the full name
  const getDeptAbbr = (fullName) => {
    const dept = configData?.departments?.find(d => d.full === fullName);
    return dept ? dept.abbr : fullName;
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const storedRole = getRoleFromStorage();
        if (storedRole) {
          setUserRole(storedRole);
          return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data?.role) {
          setUserRole(result.data.role.toLowerCase());
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        const storedRole = getRoleFromStorage();
        if (storedRole) setUserRole(storedRole);
      }
    };
    fetchUserRole();
  }, []);

  const canManage = ['sysadmin', 'administrator', 'admin'].includes(userRole);

  const useDrawerDrag = (onCloseCallback) => {
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartTime = useRef(0);
    const sheetRef = useRef(null);

    const handleTouchStart = (e) => {
      if (window.innerWidth >= 640) return;
      dragStartY.current = e.touches[0].clientY;
      dragStartTime.current = Date.now();
      setIsDragging(true);
    };

    const handleTouchMove = (e) => {
      if (window.innerWidth >= 640 || !isDragging) return;
      const delta = e.touches[0].clientY - dragStartY.current;
      if (delta > 0) setDragY(delta);
      else setDragY(delta / 4);
    };

    const handleTouchEnd = () => {
      if (window.innerWidth >= 640 || !isDragging) return;
      setIsDragging(false);
      const elapsed = Date.now() - dragStartTime.current;
      const velocity = dragY / elapsed;
      if (dragY > 150 || velocity > 0.5) {
        onCloseCallback();
      } else {
        setDragY(0);
      }
    };

    useEffect(() => { setDragY(0); setIsDragging(false); }, [isFormModalOpen, isViewModalOpen]);

    return { dragY, isDragging, sheetRef, handleTouchStart, handleTouchMove, handleTouchEnd };
  };

  const formDrawer = useDrawerDrag(() => setIsFormModalOpen(false));
  const viewDrawer = useDrawerDrag(() => {
    setIsViewModalOpen(false);
    setShowAllDepts(false);
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch announcements
        const { data: annData, error: annError } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_archived', false)
          .order('created_at', { ascending: false });

        if (annError) throw annError;
        setAnnouncements(annData || []);

        // Fetch System Configuration
        const configRes = await fetch(`${API_URL}/system-config`);
        const configResult = await configRes.json();

        if (configResult.success) {
          setConfigData(configResult.data);
        }
      } catch (err) {
        console.error('[Announcements] Error fetching data:', err.message);
        showSnackbar('Failed to load required data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdown = document.getElementById('dept-dropdown');
      if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.cursor-pointer')) {
        dropdown.classList.add('hidden');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = () => setActiveMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const showSnackbar = (message, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ visible: true, message, type });
    snackbarTimer.current = setTimeout(() => setSnackbar(s => ({ ...s, visible: false })), 3500);
  };

  const handleOpenForm = (editId = null) => {
    if (editId) {
      const target = announcements.find(a => a.id === editId);
      let deptArray = [];
      if (target.dept) {
        if (Array.isArray(target.dept)) {
          deptArray = target.dept;
        } else if (typeof target.dept === 'string') {
          try {
            deptArray = JSON.parse(target.dept);
          } catch {
            deptArray = [target.dept];
          }
        }
      }
      setFormData({
        title:         target.title        || '',
        content:       target.content      || '',
        dept:          deptArray,
        category:      target.category      || 'General',
        priority:      target.priority      || 'normal',
        location:      target.location      || '',
        contactPerson: target.contact_person|| '',
        contactEmail:  target.contact_email || '',
        image_url:     target.image_url     || null,
        imageFile:     null,
      });
      setCurrentEditId(editId);
    } else {
      setFormData(EMPTY_FORM);
      setCurrentEditId(null);
    }
    setActiveMenuId(null);
    setIsFormModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showSnackbar('Title and content are required', 'error');
      return;
    }
    setFormSaving(true);

    try {
      let finalImageUrl = formData.image_url;

      if (formData.imageFile) {
        const fileExt = formData.imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('MediStorage')
          .upload(`announcements/${filePath}`, formData.imageFile);

        if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from('MediStorage')
          .getPublicUrl(`announcements/${filePath}`);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const deptValue = formData.dept && formData.dept.length > 0 ? JSON.stringify(formData.dept) : 'All Departments';
      const payload = {
        title:          formData.title.trim(),
        content:        formData.content.trim(),
        dept:           deptValue,
        category:       formData.category       || 'General',
        priority:       formData.priority       || 'normal',
        location:       formData.location.trim(),
        contact_person: formData.contactPerson.trim(),
        contact_email:  formData.contactEmail.trim(),
        date:           todayIso(),
        image_url:      finalImageUrl || null,
      };

      if (currentEditId) {
        const { data, error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', currentEditId)
          .select();

        if (error) throw error;
        setAnnouncements(prev => prev.map(a => a.id === currentEditId ? data[0] : a));
        showSnackbar('Announcement updated', 'success');
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select();

        if (error) throw error;
        const newAnnouncement = data[0];
        setAnnouncements(prev => [newAnnouncement, ...prev]);

        // ── Broadcast Notification to Target Department Users ──
        try {
          const isAllDepts = formData.dept.length === 0 || formData.dept.length === deptOptions.length;
          let userQuery = supabase.from('users').select('id, department');

          if (!isAllDepts) {
            userQuery = userQuery.in('department', formData.dept);
          }

          const { data: targetUsers } = await userQuery;

          if (targetUsers && targetUsers.length > 0) {
            const notifRows = targetUsers.map((u) => ({
              type: 'announcement',
              title: `📢 ${newAnnouncement.title}`,
              message: newAnnouncement.content?.substring(0, 140) || 'A new announcement has been posted.',
              user_id: u.id,
              reference_id: newAnnouncement.id,
              reference_type: 'announcement',
              is_read: false,
              created_at: new Date().toISOString(),
            }));

            // Chunk inserts by batches of 200
            for (let i = 0; i < notifRows.length; i += 200) {
              await supabase.from('notifications').insert(notifRows.slice(i, i + 200));
            }
          }
        } catch (notifErr) {
          console.error('Failed to dispatch announcement notifications:', notifErr);
        }

        showSnackbar('Announcement posted', 'success');
      }
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Failed to save announcement:", error);
      showSnackbar(error.message || 'Failed to save announcement', 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const openDeleteModal = (item) => {
    setAnnouncementToDelete(item);
    setShowDeleteModal(true);
    setActiveMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return;
    setDeleting(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = localStorage.getItem('name') || '';

      const { error } = await supabase
        .from('announcements')
        .update({
          is_archived: true,
          deleted_by: name || user.email || 'Admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', announcementToDelete.id);

      if (error) throw error;

      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete.id));
      showSnackbar('Announcement archived successfully.');
    } catch (err) {
      console.error("Failed to archive announcement:", err);
      showSnackbar('Failed to archive announcement', 'error');
    } finally {
      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
      setDeleting(false);
    }
  };

  const handleView = (item) => {
    setViewData(item);
    setShowAllDepts(false); // Reset the department view mode
    setIsViewModalOpen(true);
  };

  const setField = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  const filtered = announcements.filter(a => {
    const annCategory = a.category || '';
    const annPriority = a.priority || '';
    const catOk  = filterCategory === 'All' ||
      annCategory.toLowerCase() === filterCategory.toLowerCase() ||
      annCategory === filterCategory;
    const priOk  = filterPriority === 'All' ||
      annPriority.toLowerCase() === filterPriority.toLowerCase() ||
      annPriority === filterPriority;

    let annDepts = [];
    const deptValue = a.dept;
    if (deptValue) {
      if (Array.isArray(deptValue)) {
        annDepts = deptValue;
      } else if (typeof deptValue === 'string') {
        try {
          annDepts = JSON.parse(deptValue);
        } catch {
          annDepts = [deptValue];
        }
      }
    }

    const deptOk = filterDept === 'All' ||
                   annDepts.includes(filterDept) ||
                   annDepts.includes(ALL_DEPT_LABEL) ||
                   (annDepts.length > 0 && annDepts.length === deptOptions.length);

    let dateOk = true;
    if (filterDate) {
      const annDate = (a.created_at || '').split('T')[0];
      if (annDate !== filterDate) dateOk = false;
    }

    const searchLower = searchTerm.toLowerCase();
    const searchOk = !searchTerm ||
      (a.title || '').toLowerCase().includes(searchLower) ||
      (a.content || '').toLowerCase().includes(searchLower) ||
      annCategory.toLowerCase().includes(searchLower);

    return catOk && priOk && deptOk && dateOk && searchOk;
  }).sort((a, b) => {
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return sortOrder === 'desc' ? db - da : da - db;
  });

  const inputCls = 'w-full mt-1.5 px-4 py-3 sm:py-3 border border-[#e2e8f0] rounded-xl text-[13px] sm:text-[14px] outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white box-border';
  const labelCls = 'block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-5 sm:mt-6';

  if (!configData && loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500 font-semibold">
          <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading announcements & configurations...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-[calc(100vh-120px)] flex flex-col animate-[fadeInSlide_0.4s_ease-out_forwards]">

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>

      {/* Header Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-6 pt-6 pb-5 border-b-2 border-[#e0eceb] bg-white z-10">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search announcements..."
              className="w-full h-[34px] xl:h-[42px] text-sm border border-[#e2e8f0] rounded-full pl-11 pr-4 outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white text-slate-600"
            />
          </div>

          <div className="flex gap-2 w-full xl:w-auto flex-wrap xl:flex-nowrap bg-slate-50 border border-[#e2e8f0] rounded-xl sm:rounded-full p-1">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="flex-1 xl:flex-none xl:w-[130px] h-[34px] text-xs font-medium border-none rounded-full px-3 outline-none focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white text-slate-600 cursor-pointer truncate"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="flex-1 xl:flex-none xl:w-[110px] h-[34px] text-xs font-medium border-none rounded-full px-3 outline-none focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white text-slate-600 cursor-pointer truncate"
            >
              <option value="All">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>

            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="flex-1 xl:flex-none xl:w-[130px] h-[34px] text-xs font-medium border-none rounded-full px-3 outline-none focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white text-slate-600 cursor-pointer truncate"
            >
              <option value="All">All Depts</option>
              {deptOptions.map(d => <option key={d} value={d}>{getDeptAbbr(d)}</option>)}
            </select>

            <div className="relative flex-1 xl:flex-none xl:w-[130px] h-[34px]">
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                placeholder="All Dates"
                className="w-full h-full text-xs font-medium border-none rounded-full px-3 pr-8 outline-none focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white text-slate-600 cursor-pointer"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-500 text-white flex items-center justify-center transition-colors"
                  title="Clear date filter"
                >
                  <i className="fa-solid fa-xmark text-[10px]"></i>
                </button>
              )}
            </div>

            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="flex-1 xl:flex-none xl:w-[120px] h-[34px] text-xs font-medium border-none rounded-full px-3 outline-none focus:ring-2 focus:ring-[#e0eceb] transition-all bg-white text-slate-600 cursor-pointer truncate"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenForm()}
            className="w-full sm:w-auto h-[42px] bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white px-6 rounded-full font-bold text-sm cursor-pointer hover:shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <i className="fa-solid fa-plus text-sm"></i> New Post
          </button>
        )}
      </div>

      {/* Announcement List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No announcements found.</div>
        ) : (
          filtered.map(item => {
            const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
            const catCls = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;

            return (
              <div key={item.id} onClick={() => handleView(item)} className="bg-white rounded-xl border border-[#e2e8f0] relative cursor-pointer hover:shadow-md hover:border-[#8aacaa] transition-all overflow-hidden flex flex-row items-stretch">
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${pri.color} pointer-events-none z-10`}></div>

                {item.image_url && (
                  <div className="ml-[3px] shrink-0 w-28 h-28 sm:w-36 sm:h-36 overflow-hidden bg-slate-100 border-r border-[#e2e8f0]">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className={`flex-1 min-w-0 p-3 sm:p-4 relative flex flex-col justify-center ${!item.image_url ? 'ml-[3px] pl-4 sm:pl-5' : 'pl-3 sm:pl-4'}`}>
                  {canManage && (
                    <div className="absolute top-2.5 right-2 sm:right-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-sm"
                      >
                        <span className="text-lg font-bold leading-none mb-1">&#8942;</span>
                      </button>
                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-9 bg-white border border-[#e2e8f0] shadow-xl rounded-lg overflow-hidden z-20 w-28 py-1">
                          <button
                            onClick={() => handleOpenForm(item.id)}
                            className="w-full text-left px-4 py-2 text-[11px] hover:bg-[#e0eceb] text-slate-700 flex items-center gap-2"
                          >
                            <i className="fa-solid fa-pen-to-square text-[10px]"></i> Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="w-full text-left px-4 py-2 text-[11px] hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mb-2 pr-8">
                    {item.priority !== 'normal' && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${pri.color} flex items-center gap-1`}>
                        <i className={`fa-solid ${item.priority === 'urgent' ? 'fa-circle-exclamation' : 'fa-circle-dot'} text-[9px]`}></i> {pri.label}
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${catCls}`}>{item.category || 'General'}</span>

                    {/* Clustered Department Logic - List View (Static) */}
                    {(() => {
                      const displayDepts = formatDeptDisplay(item.dept, deptOptions);
                      const firstDept = displayDepts[0];
                      const extraCount = displayDepts.length - 1;

                      if (!firstDept) return null;

                      return (
                        <>
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#e0eceb] text-[#466460]">
                            {firstDept === ALL_DEPT_LABEL ? firstDept : getDeptAbbr(firstDept)}
                          </span>
                          {extraCount > 0 && (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#466460] text-white">
                              +{extraCount} more
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <h3 className="text-[#466460] font-bold text-[15px] sm:text-base mb-1.5 pr-8 leading-snug truncate sm:whitespace-normal sm:line-clamp-2">{item.title}</h3>

                  <div className="flex flex-wrap text-xs text-slate-500 mb-2 items-center gap-x-3 gap-y-1">
                    <span><i className="fa-regular fa-calendar mr-1"></i>{formatDate(item.created_at)}</span>
                    {item.location && <span className="truncate"><i className="fa-solid fa-location-dot mr-1"></i>{item.location}</span>}
                    {item.contact_person && <span className="truncate"><i className="fa-solid fa-user mr-1"></i>{item.contact_person}</span>}
                    {item.contact_email && <span><i className="fa-solid fa-envelope mr-1"></i>{item.contact_email}</span>}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{item.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {isFormModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-0 sm:pt-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFormModalOpen(false)}></div>
          <div
            ref={formDrawer.sheetRef}
            className="relative bg-white w-full sm:max-w-5xl mx-4 my-4 flex flex-col shadow-2xl overflow-hidden rounded-2xl max-h-[92vh] animate-[fadeInSlide_0.3s_ease-out_forwards]"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="shrink-0 bg-gradient-to-r from-[#e0eceb] to-white border-b border-[#d1e7e5] px-6 py-5 flex items-center justify-between"
              onTouchStart={formDrawer.handleTouchStart}
              onTouchMove={formDrawer.handleTouchMove}
              onTouchEnd={formDrawer.handleTouchEnd}
            >
              <h3 className="text-lg font-bold text-slate-800">
                <i className={`fa-solid ${currentEditId ? 'fa-pen-to-square' : 'fa-bullhorn'} mr-2`}></i>
                {currentEditId ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="w-10 h-10 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-xl shadow-sm">
                <label className={labelCls}>Title <span className="text-red-400">*</span></label>
                <input type="text" placeholder="Announcement title" className={inputCls} value={formData.title} onChange={e => setField('title', e.target.value)} />

                <label className={labelCls}>Details <span className="text-red-400">*</span></label>
                <textarea placeholder="Write the full details..." rows={3} className={`${inputCls} resize-none`} value={formData.content} onChange={e => setField('content', e.target.value)} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className={labelCls}>Category</label>
                    <select className={inputCls} value={formData.category} onChange={e => setField('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                  </div>
                  <div>
                    <label className={labelCls}>Priority</label>
                    <select className={inputCls} value={formData.priority} onChange={e => setField('priority', e.target.value)}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                  </div>
                  <div>
                    <label className={labelCls}>Target Dept</label>
                    <div className="relative">
                      <div
                        className={`${inputCls} cursor-pointer flex items-center gap-2 min-h-[46px] sm:min-h-[42px] pr-3`}
                        onClick={() => document.getElementById('dept-dropdown').classList.toggle('hidden')}
                      >
                        {formData.dept.length === 0 ? (
                          <span className="text-slate-500">Select departments...</span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#e0eceb] text-[#466460] shrink-0">
                              {getDeptAbbr(formData.dept[0])}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setField('dept', formData.dept.filter(x => x !== formData.dept[0])); }}
                                className="hover:text-red-500 ml-0.5"
                              >
                                <i className="fa-solid fa-xmark text-[10px]"></i>
                              </button>
                            </span>
                            {formData.dept.length > 1 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-[#466460] text-white shrink-0">
                                +{formData.dept.length - 1} more
                              </span>
                            )}
                          </>
                        )}
                        <span className="ml-auto text-slate-400 flex-shrink-0 flex items-center">
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                        </span>
                      </div>
                      <div id="dept-dropdown" className="hidden absolute z-20 w-full mt-1 border border-[#e2e8f0] rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto">
                        <label
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 font-semibold bg-slate-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={formData.dept.length === deptOptions.length}
                            ref={(el) => {
                              if (el) el.indeterminate = formData.dept.length > 0 && formData.dept.length < deptOptions.length;
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setField('dept', [...deptOptions]);
                              } else {
                                setField('dept', []);
                              }
                            }}
                            className="w-4 h-4 text-[#466460] rounded border-slate-300 focus:ring-[#466460]"
                          />
                          <span className="text-sm text-slate-700 truncate">Select All</span>
                        </label>
                        {deptOptions.map(d => (
                          <label
                            key={d}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={formData.dept.includes(d)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setField('dept', [...formData.dept, d]);
                                } else {
                                  setField('dept', formData.dept.filter(x => x !== d));
                                }
                              }}
                              className="w-4 h-4 text-[#466460] rounded border-slate-300 focus:ring-[#466460]"
                            />
                            <span className="text-sm text-slate-600 truncate">{getDeptAbbr(d)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className={labelCls}>Location / Venue <span className="text-slate-400 font-normal normal-case">(opt)</span></label>
                    <input type="text" placeholder="e.g. Clinic Room 2" className={inputCls} value={formData.location} onChange={e => setField('location', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Person <span className="text-slate-400 font-normal normal-case">(opt)</span></label>
                    <input type="text" placeholder="Dr. Santos" className={inputCls} value={formData.contactPerson} onChange={e => setField('contactPerson', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Email <span className="text-slate-400 font-normal normal-case">(opt)</span></label>
                    <input type="email" placeholder="clinic@plsp.edu" className={inputCls} value={formData.contactEmail} onChange={e => setField('contactEmail', e.target.value)} />
                  </div>
                </div>

                <label className={labelCls}><i className="fa-solid fa-image mr-1"></i>Infographic / Image <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <ImageDropZone
                  value={formData.image_url}
                  onChange={(b64, file) => {
                    setField('image_url', b64);
                    setField('imageFile', file);
                  }}
                  onClear={() => {
                    setField('image_url', null);
                    setField('imageFile', null);
                  }}
                />
              </div>
            </div>

            <div className="shrink-0 bg-white border-t border-[#d1e7e5] px-6 py-4 flex items-center justify-end gap-3">
              <button onClick={() => setIsFormModalOpen(false)} className="px-6 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={formSaving} className="px-6 py-2.5 bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                {formSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</> : <><i className="fa-solid fa-paper-plane"></i> {currentEditId ? 'Save Changes' : 'Post'}</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Modal */}
      {isViewModalOpen && viewData && createPortal(
        <div className="fixed inset-0 z-[99999] flex justify-center items-end sm:items-center p-0 sm:p-6" onClick={() => { setIsViewModalOpen(false); setShowAllDepts(false); }}>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            style={{ opacity: viewDrawer.isDragging ? Math.max(0, 1 - viewDrawer.dragY / 500) : 1 }}
          />

          <div
            ref={viewDrawer.sheetRef}
            className="relative bg-white w-full sm:max-w-lg flex flex-col shadow-2xl overflow-hidden rounded-t-[28px] sm:rounded-[24px] max-h-[92vh] sm:max-h-[90vh] animate-slideUp sm:animate-[fadeInSlide_0.2s_ease-out_forwards]"
            style={{
              transform: viewDrawer.isDragging && viewDrawer.dragY > 0 ? `translateY(${viewDrawer.dragY}px)` : 'translateY(0)',
              transition: viewDrawer.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {viewData.image_url && (
              <div className="relative h-48 sm:h-56 w-full shrink-0 overflow-hidden bg-slate-100 -mb-2 sm:mb-0">
                <div
                  className="sm:hidden absolute top-0 left-0 right-0 flex justify-center pt-4 pb-4 cursor-grab active:cursor-grabbing z-20"
                  onTouchStart={viewDrawer.handleTouchStart}
                  onTouchMove={viewDrawer.handleTouchMove}
                  onTouchEnd={viewDrawer.handleTouchEnd}
                >
                  <div className="w-12 h-1.5 bg-white/70 shadow-sm rounded-full" />
                </div>
                <img src={viewData.image_url} alt={viewData.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
                <button onClick={() => { setIsViewModalOpen(false); setShowAllDepts(false); }} className="hidden sm:flex w-7 h-7 rounded-full items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            )}

            {!viewData.image_url && (
              <>
                <div
                  className="sm:hidden flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing w-full bg-white shrink-0"
                  onTouchStart={viewDrawer.handleTouchStart}
                  onTouchMove={viewDrawer.handleTouchMove}
                  onTouchEnd={viewDrawer.handleTouchEnd}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full transition-colors" style={{ background: viewDrawer.isDragging ? '#466460' : '#cbd5e1' }} />
                </div>
                <div
                  className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 shrink-0 bg-white"
                  onTouchStart={viewDrawer.handleTouchStart}
                  onTouchMove={viewDrawer.handleTouchMove}
                  onTouchEnd={viewDrawer.handleTouchEnd}
                >
                  <h3 className="text-base font-bold text-[#466460]">View Announcement</h3>
                  <button onClick={() => { setIsViewModalOpen(false); setShowAllDepts(false); }} className="hidden sm:flex w-7 h-7 rounded-full items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
              </>
            )}

            <div className="px-5 sm:px-6 py-5 overflow-y-auto grow scrollbar-none bg-white relative z-10">
              <div className="flex flex-wrap gap-2 mb-3">
                {viewData.priority && viewData.priority !== 'normal' && <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${PRIORITY_CONFIG[viewData.priority]?.color}`}><i className="fa-solid fa-circle-exclamation mr-1"></i>{PRIORITY_CONFIG[viewData.priority]?.label}</span>}
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_COLORS[viewData.category] || CATEGORY_COLORS.General}`}>{viewData.category || 'General'}</span>

                {/* Clustered Department Logic - Modal View (Interactive) */}
                {(() => {
                  const displayDepts = formatDeptDisplay(viewData.dept, deptOptions);
                  const firstDept = displayDepts[0];
                  const extraCount = displayDepts.length - 1;

                  if (displayDepts.length === 0 || !firstDept) return null;

                  return showAllDepts ? (
                    <>
                      {displayDepts.map((d, i) => (
                        <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[#e0eceb] text-[#466460]">
                          {d === ALL_DEPT_LABEL ? d : getDeptAbbr(d)}
                        </span>
                      ))}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAllDepts(false); }}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                      >
                        Less
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#e0eceb] text-[#466460]">
                        {firstDept === ALL_DEPT_LABEL ? firstDept : getDeptAbbr(firstDept)}
                      </span>
                      {extraCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAllDepts(true); }}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-[#466460] text-white hover:bg-[#38534f] transition-colors shadow-sm"
                        >
                          +{extraCount} more
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#466460] mb-2 leading-snug">{viewData.title}</h3>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-y-2 sm:gap-y-1.5 gap-x-4 text-[13px] sm:text-sm text-slate-500 mb-4">
                <span><i className="fa-regular fa-calendar mr-1 w-3 text-center"></i>{formatDate(viewData.created_at)}</span>
                {viewData.location && <span><i className="fa-solid fa-location-dot mr-1 w-3 text-center text-[#e07a5f]"></i>{viewData.location}</span>}
                {viewData.contact_person && <span><i className="fa-solid fa-user mr-1 w-3 text-center text-[#466460]"></i>{viewData.contact_person}</span>}
                {viewData.contact_email && <span><i className="fa-solid fa-envelope mr-1 w-3 text-center text-[#466460]"></i>{viewData.contact_email}</span>}
              </div>
              <div className="border-t border-slate-100 pt-4"><p className="text-[15px] sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{viewData.content}</p></div>
            </div>

            <div className="px-6 sm:px-8 py-5 border-t border-slate-100 shrink-0 bg-white flex flex-col-reverse sm:flex-row gap-3 pb-[max(1rem,env(safe-area-inset-bottom,16px))]">
              <button onClick={() => { setIsViewModalOpen(false); setShowAllDepts(false); }} className="w-full sm:w-auto sm:flex-1 bg-[#e2e8f0] text-slate-600 py-3 sm:py-2.5 rounded-xl font-bold text-[13px] hover:bg-slate-200 transition-colors">Close</button>
              {canManage && (
                <button
                  onClick={() => { setIsViewModalOpen(false); setShowAllDepts(false); handleOpenForm(viewData.id); }}
                  className="w-full sm:w-auto sm:flex-1 bg-[#e0eceb] text-[#466460] py-3 sm:py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#466460] hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal Using Portal */}
      {showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={() => { setShowDeleteModal(false); setAnnouncementToDelete(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Archive Announcement</h3>
                <p className="text-sm text-slate-500">You can restore it later from Archives</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to archive <span className="font-semibold">"{announcementToDelete?.title}"</span>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setAnnouncementToDelete(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Archiving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0a3 3 0 013 3h-2.25a3 3 0 013-3m0 0h.008v.008h-.008V14.25m0 0h2.25a3 3 0 003-3v-2.25a3 3 0 00-3-3H9.75a3 3 0 00-3 3v2.25a3 3 0 003 3h2.25z" />
                    </svg>
                    Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Snackbar message={snackbar.message} type={snackbar.type} visible={snackbar.visible} />
    </div>
  );
};

export default Announcements;