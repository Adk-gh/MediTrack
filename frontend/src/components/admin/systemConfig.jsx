// C:\Users\HP\MediTrack\frontend\src\components\admin\SystemConfig.jsx

import React, { useState, useEffect, useRef } from 'react';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

// ─── Local UI Helpers ────────────────────────────────────────────────────────

const Snackbar = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#ef4444' : '#10b981',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontFamily: 'helvetica, sans-serif',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <span>{message}</span>

      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
};

const SectionCard = ({ children }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #e2ebe8',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 800,
      color: '#466460',
      textTransform: 'uppercase',
      letterSpacing: 1,
      margin: '0 0 8px 4px',
    }}
  >
    {children}
  </p>
);

const pillButtonStyle = (bg, color, disabled) => ({
  background: bg,
  color,
  border: 'none',
  padding: '8px 20px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});

const inputStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

// ─── Config Array Editor ─────────────────────────────────────────────────────

const ConfigArrayEditor = ({
  title,
  description,
  items = [],
  onChange,
  placeholder = 'Add new item...',
}) => {
  const [newVal, setNewVal] = useState('');

  const safeItems = Array.isArray(items) ? items : [];

  const handleAdd = () => {
    const value = newVal.trim();

    if (!value) return;

    // Prevent duplicate values.
    if (
      safeItems.some(
        item => String(item).toLowerCase() === value.toLowerCase()
      )
    ) {
      return;
    }

    onChange([...safeItems, value]);
    setNewVal('');
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = idx => {
    onChange(safeItems.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#1a2e22',
          margin: '0 0 4px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 12,
          color: '#7a9e8e',
          margin: '0 0 12px',
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {safeItems.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {item}

            <button
              type="button"
              onClick={() => handleRemove(idx)}
              style={{
                background: 'none',
                border: 'none',
                color: '#064e3b',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          maxWidth: 300,
        }}
      >
        <input
          type="text"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={handleAdd}
          style={pillButtonStyle('#f4f8f6', '#466460', false)}
        >
          Add
        </button>
      </div>
    </div>
  );
};

// ─── Sections Editor ─────────────────────────────────────────────────────────
//
// Sections are intentionally restricted to letters only.
// Examples:
// A
// B
// C
// D
// M
//
// No numbers, spaces, hyphens, or symbols.
//

const SectionsEditor = ({ sections = [], onChange }) => {
  const [newSection, setNewSection] = useState('');

  const safeSections = Array.isArray(sections) ? sections : [];

  const handleSectionChange = e => {
    // Letters only.
    const value = e.target.value
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase();

    setNewSection(value);
  };

  const handleAdd = () => {
    const value = newSection.trim().toUpperCase();

    if (!value) return;

    if (!/^[A-Z]+$/.test(value)) {
      return;
    }

    if (
      safeSections.some(
        section => String(section).toUpperCase() === value
      )
    ) {
      return;
    }

    onChange([...safeSections, value]);
    setNewSection('');
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = idx => {
    onChange(safeSections.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#1a2e22',
          margin: '0 0 4px',
        }}
      >
        Sections
      </h3>

      <p
        style={{
          fontSize: 12,
          color: '#7a9e8e',
          margin: '0 0 12px',
        }}
      >
        List of available student sections. Letters only are allowed,
        such as A, B, C, D, up to M or beyond.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {safeSections.map((section, idx) => (
          <span
            key={`${section}-${idx}`}
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {section}

            <button
              type="button"
              onClick={() => handleRemove(idx)}
              style={{
                background: 'none',
                border: 'none',
                color: '#064e3b',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          maxWidth: 300,
        }}
      >
        <input
          type="text"
          value={newSection}
          onChange={handleSectionChange}
          onKeyDown={handleKeyDown}
          placeholder="Section letter..."
          maxLength={10}
          style={{
            ...inputStyle,
            flex: 1,
            textTransform: 'uppercase',
          }}
        />

        <button
          type="button"
          onClick={handleAdd}
          style={pillButtonStyle('#f4f8f6', '#466460', false)}
        >
          Add
        </button>
      </div>
    </div>
  );
};

// ─── Config Object Editor ────────────────────────────────────────────────────

const ConfigObjectEditor = ({
  title,
  description,
  obj = {},
  onChange,
  keyPlaceholder,
  valPlaceholder,
}) => {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const safeObject =
    obj && typeof obj === 'object' && !Array.isArray(obj)
      ? obj
      : {};

  const handleAdd = () => {
    const key = newKey.trim().toLowerCase();
    const value = newVal.trim();

    if (!key || !value) return;

    onChange({
      ...safeObject,
      [key]: value,
    });

    setNewKey('');
    setNewVal('');
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#1a2e22',
          margin: '0 0 4px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: 12,
          color: '#7a9e8e',
          margin: '0 0 16px',
        }}
      >
        {description}
      </p>

      <div
        style={{
          display: 'grid',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {Object.entries(safeObject).map(([key, val]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#f4f8f6',
              border: '1px solid #e2ebe8',
              padding: '8px 12px',
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: '#466460',
                fontSize: 13,
                width: 120,
              }}
            >
              {key}
            </span>

            <span
              style={{
                color: '#1a2e22',
                fontSize: 13,
                flex: 1,
              }}
            >
              {val}
            </span>

            <button
              type="button"
              onClick={() => {
                const copy = { ...safeObject };
                delete copy[key];
                onChange(copy);
              }}
              style={{
                background: '#fef2f2',
                color: '#ef4444',
                border: '1px solid #fecaca',
                padding: '4px 10px',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          maxWidth: 500,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder={keyPlaceholder}
          style={{
            ...inputStyle,
            width: 130,
          }}
        />

        <input
          type="text"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={valPlaceholder}
          style={{
            ...inputStyle,
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={handleAdd}
          style={pillButtonStyle('#f4f8f6', '#466460', false)}
        >
          Add
        </button>
      </div>
    </div>
  );
};

// ─── Department Editor ──────────────────────────────────────────────────────

const ConfigDeptEditor = ({ departments = [], onChange }) => {
  const handleAddDept = () => {
    const newDepartment = {
      abbr: '',
      full: '',
      programs: [],
    };

    // Add the new department at the TOP
    onChange([newDepartment, ...departments]);
  };

  const updateDept = (idx, field, val) => {
    const copy = [...departments];
    copy[idx] = {
      ...copy[idx],
      [field]: val,
    };

    onChange(copy);
  };

  const removeDept = (idx) => {
    const copy = [...departments];
    copy.splice(idx, 1);

    onChange(copy);
  };

  return (
    <div style={{ marginBottom: 32 }}>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1a2e22',
              margin: '0 0 4px',
            }}
          >
            Academic Departments
          </h3>

          <p
            style={{
              fontSize: 12,
              color: '#7a9e8e',
              margin: 0,
            }}
          >
            Configure the colleges and their associated programs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddDept}
          style={{
            background: '#fff',
            color: '#475569',
            border: '1px solid #cbd5e1',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Add Dept
        </button>
      </div>

      {/* Department list */}
      <div
        style={{
          display: 'grid',
          gap: 16,
        }}
      >
        {departments.map((dept, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid #e2ebe8',
              borderRadius: 12,
              padding: 16,
              background: '#f4f8f6',
            }}
          >
            {/* Department Information */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 16,
                alignItems: 'flex-start',
              }}
            >
              {/* Abbreviation */}
              <div style={{ width: 100 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7a9e8e',
                    marginBottom: 4,
                  }}
                >
                  Abbreviation
                </label>

                <input
                  type="text"
                  value={dept.abbr || ''}
                  onChange={(e) =>
                    updateDept(idx, 'abbr', e.target.value)
                  }
                  placeholder="e.g. CCSE"
                  style={{
                    ...inputStyle,
                    width: '100%',
                  }}
                />
              </div>

              {/* Full Name */}
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7a9e8e',
                    marginBottom: 4,
                  }}
                >
                  Full Name
                </label>

                <input
                  type="text"
                  value={dept.full || ''}
                  onChange={(e) =>
                    updateDept(idx, 'full', e.target.value)
                  }
                  placeholder="e.g. College of Computing Science and Engineering"
                  style={{
                    ...inputStyle,
                    width: '100%',
                  }}
                />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeDept(idx)}
                style={{
                  marginTop: 20,
                  background: '#fef2f2',
                  color: '#ef4444',
                  border: '1px solid #fecaca',
                  padding: '7px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>

            {/* Programs */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2ebe8',
                padding: 16,
                borderRadius: 12,
              }}
            >
              <ConfigArrayEditor
                title={`Programs for ${dept.abbr || 'Department'}`}
                description="List of programs available under this department."
                items={dept.programs || []}
                onChange={(newPrograms) =>
                  updateDept(idx, 'programs', newPrograms)
                }
              />
            </div>
          </div>
        ))}

        {/* No departments */}
        {departments.length === 0 && (
          <div
            style={{
              border: '1px dashed #cbd5e1',
              borderRadius: 12,
              padding: '24px 16px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 13,
            }}
          >
            No departments configured yet.
            <br />
            Click <strong>+ Add Dept</strong> to create one.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SystemConfigSettings({
  isMobile,
}) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    text: '',
    type: 'success',
  });

  const [activeTab, setActiveTab] =
    useState('departments');

  const hasFetched = useRef(false);

  const showToast = (
    text,
    type = 'success'
  ) => {
    setToast({
      show: true,
      text,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        text: '',
        type: 'success',
      });
    }, 3500);
  };

  const containerStyle = {
    padding: isMobile
      ? '16px 12px'
      : '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  };

  // ─── Fetch Configuration ──────────────────────────────────────────────────

  useEffect(() => {
    if (hasFetched.current) return;

    hasFetched.current = true;
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/system-config`,
        {
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          `Server responded ${res.status}`
        );
      }

      const result = await res.json();

      if (!result.success) {
        throw new Error(
          result.message ||
            result.error ||
            'Failed to load configuration.'
        );
      }

      const data = result.data || {};

      // Normalize the configuration so all editors
      // always receive the correct data types.
      setConfig({
        departments: Array.isArray(data.departments)
          ? data.departments
          : [],

        non_academic_offices:
          Array.isArray(data.non_academic_offices)
            ? data.non_academic_offices
            : [],

        sections: Array.isArray(data.sections)
          ? data.sections
          : [],

        admin_roles: Array.isArray(data.admin_roles)
          ? data.admin_roles
          : [],

        clinic_roles: Array.isArray(data.clinic_roles)
          ? data.clinic_roles
          : [],

        faculty_roles: Array.isArray(data.faculty_roles)
          ? data.faculty_roles
          : [],

        classifications:
          data.classifications &&
          typeof data.classifications === 'object' &&
          !Array.isArray(data.classifications)
            ? data.classifications
            : {},

        job_titles:
          data.job_titles &&
          typeof data.job_titles === 'object' &&
          !Array.isArray(data.job_titles)
            ? data.job_titles
            : {},
      });
    } catch (error) {
      console.error(
        'Failed to fetch system config:',
        error
      );

      setConfig(null);

      showToast(
        'Failed to load system configuration.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Save Configuration ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!config || saving) return;

    setSaving(true);

    try {
      const res = await fetch(
        `${API_URL}/system-config`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        }
      );

      let result = null;

      try {
        result = await res.json();
      } catch {
        // Response may not contain JSON.
      }

      if (!res.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Server responded ${res.status}`
        );
      }

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.message ||
            result.error ||
            'Failed to save configuration.'
        );
      }

      showToast(
        'System Configuration saved successfully!',
        'success'
      );

      // Re-fetch after saving so the UI reflects
      // what was actually persisted.
      await fetchConfig();
    } catch (error) {
      console.error(
        'Failed to save system config:',
        error
      );

      showToast(
        error.message ||
          'Failed to save configuration. Make sure the server is running.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={containerStyle}>
        <SectionLabel>
          System Config
        </SectionLabel>

        <p
          style={{
            fontSize: 13,
            color: '#7a9e8e',
          }}
        >
          Loading system configuration...
        </p>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (!config) {
    return (
      <div style={containerStyle}>
        <SectionLabel>
          System Config
        </SectionLabel>

        <SectionCard>
          <div
            style={{
              padding: '24px 18px',
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: '#ef4444',
                margin: 0,
                fontWeight: 600,
              }}
            >
              Failed to connect to the backend API.
            </p>

            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#7a9e8e',
              }}
            >
              Make sure the server is running and
              the system configuration endpoint is
              available.
            </p>

            <button
              type="button"
              onClick={fetchConfig}
              style={{
                ...pillButtonStyle(
                  '#466460',
                  '#fff',
                  false
                ),
                marginTop: 12,
              }}
            >
              Retry
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────

  const tabs = [
    {
      id: 'departments',
      label: 'Departments & Programs',
    },
    {
      id: 'offices',
      label: 'Offices & Sections',
    },
    {
      id: 'roles',
      label: 'Roles & Classifications',
    },
  ];

  return (
    <div
      style={{
        ...containerStyle,
        position: 'relative',
      }}
    >
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() =>
            setToast({
              show: false,
              text: '',
              type: 'success',
            })
          }
        />
      )}

      {/* Header */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <SectionLabel>
            System Config
          </SectionLabel>

          <p
            style={{
              fontSize: 12,
              color: '#7a9e8e',
              margin: '0 0 0 4px',
            }}
          >
            Manage core system dropdowns and
            categorical data globally.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={pillButtonStyle(
            '#466460',
            '#fff',
            saving
          )}
        >
          {saving
            ? 'Saving...'
            : 'Save Changes'}
        </button>
      </div>

      <SectionCard>
        {/* Tabs */}

        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '0 18px',
            borderBottom:
              '1px solid #eef3f1',
            overflowX: 'auto',
          }}
        >
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() =>
                setActiveTab(tab.id)
              }
              style={{
                background: 'none',
                border: 'none',
                padding: '14px 14px',
                fontSize: 13,
                fontWeight:
                  activeTab === tab.id
                    ? 800
                    : 600,
                color:
                  activeTab === tab.id
                    ? '#466460'
                    : '#7a9e8e',
                borderBottom:
                  activeTab === tab.id
                    ? '2px solid #466460'
                    : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}

        <div
          style={{
            padding: '20px 18px',
          }}
        >
          {/* ─────────────────────────────────────
              DEPARTMENTS
          ───────────────────────────────────── */}

          {activeTab === 'departments' && (
            <ConfigDeptEditor
              departments={
                Array.isArray(
                  config.departments
                )
                  ? config.departments
                  : []
              }
              onChange={newDepts =>
                setConfig(prev => ({
                  ...prev,
                  departments: newDepts,
                }))
              }
            />
          )}

          {/* ─────────────────────────────────────
              OFFICES / SECTIONS
          ───────────────────────────────────── */}

          {activeTab === 'offices' && (
            <>
              <ConfigArrayEditor
                title="Non-Academic Offices"
                description="List of available offices for staff assignments."
                items={
                  Array.isArray(
                    config.non_academic_offices
                  )
                    ? config.non_academic_offices
                    : []
                }
                onChange={newOffices =>
                  setConfig(prev => ({
                    ...prev,
                    non_academic_offices:
                      newOffices,
                  }))
                }
                placeholder="Add office..."
              />

              <hr
                style={{
                  border: 'none',
                  borderTop:
                    '1px solid #eef3f1',
                  margin: '24px 0',
                }}
              />

              <SectionsEditor
                sections={
                  Array.isArray(
                    config.sections
                  )
                    ? config.sections
                    : []
                }
                onChange={newSections =>
                  setConfig(prev => ({
                    ...prev,
                    sections: newSections,
                  }))
                }
              />
            </>
          )}

          {/* ─────────────────────────────────────
              ROLES
          ───────────────────────────────────── */}

          {activeTab === 'roles' && (
            <>
              <ConfigArrayEditor
                title="Admin Roles"
                description="Internal system roles that grant admin privileges."
                items={
                  Array.isArray(
                    config.admin_roles
                  )
                    ? config.admin_roles
                    : []
                }
                onChange={newRoles =>
                  setConfig(prev => ({
                    ...prev,
                    admin_roles: newRoles,
                  }))
                }
                placeholder="Add admin role..."
              />

              <ConfigArrayEditor
                title="Clinic Roles"
                description="Internal system roles that grant clinic staff privileges."
                items={
                  Array.isArray(
                    config.clinic_roles
                  )
                    ? config.clinic_roles
                    : []
                }
                onChange={newRoles =>
                  setConfig(prev => ({
                    ...prev,
                    clinic_roles: newRoles,
                  }))
                }
                placeholder="Add clinic role..."
              />

              <ConfigArrayEditor
                title="Faculty Roles"
                description="Roles recognized as academic faculty."
                items={
                  Array.isArray(
                    config.faculty_roles
                  )
                    ? config.faculty_roles
                    : []
                }
                onChange={newRoles =>
                  setConfig(prev => ({
                    ...prev,
                    faculty_roles: newRoles,
                  }))
                }
                placeholder="Add faculty role..."
              />

              <hr
                style={{
                  border: 'none',
                  borderTop:
                    '1px solid #eef3f1',
                  margin: '24px 0',
                }}
              />

              <ConfigObjectEditor
                title="Classifications Mapping"
                description="Maps a specific role to its broader personnel classification."
                obj={config.classifications}
                keyPlaceholder="Role (e.g. nurse)"
                valPlaceholder="Classification (e.g. Nurse Personnel)"
                onChange={newMapping =>
                  setConfig(prev => ({
                    ...prev,
                    classifications:
                      newMapping,
                  }))
                }
              />

              <hr
                style={{
                  border: 'none',
                  borderTop:
                    '1px solid #eef3f1',
                  margin: '24px 0',
                }}
              />

              <ConfigObjectEditor
                title="Job Titles Mapping"
                description="Maps a specific role to its formal Job Title display name."
                obj={config.job_titles}
                keyPlaceholder="Role (e.g. sysadmin)"
                valPlaceholder="Title (e.g. System Administrator)"
                onChange={newMapping =>
                  setConfig(prev => ({
                    ...prev,
                    job_titles: newMapping,
                  }))
                }
              />
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}