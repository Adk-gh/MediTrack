// C:\Users\HP\MediTrack\frontend\src\components\admin\securitySettings.jsx

import React, { useEffect, useState } from 'react';

const API_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '');

// ─── Default Password Rules ─────────────────────────────────────────────────

const DEFAULT_PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialCharacter: true,
};

// ─── Local UI Helpers ────────────────────────────────────────────────────────

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

const Row = ({ label, sub, right, last }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid #eef3f1',
      gap: 12,
    }}
  >
    <div
      style={{
        flex: 1,
        paddingRight: 12,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1a2e22',
          margin: 0,
        }}
      >
        {label}
      </p>

      {sub && (
        <p
          style={{
            fontSize: 12,
            color: '#7a9e8e',
            margin: '3px 0 0',
            lineHeight: 1.4,
          }}
        >
          {sub}
        </p>
      )}
    </div>

    {right}
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

// ─── Toggle ──────────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      width: 44,
      height: 24,
      padding: 2,
      border: 'none',
      borderRadius: 20,
      background: checked ? '#466460' : '#cbd8d3',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'background 0.2s ease',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        display: 'block',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#fff',
        transform: checked
          ? 'translateX(20px)'
          : 'translateX(0)',
        transition: 'transform 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
      }}
    />
  </button>
);

// ─── Password Rule Item ─────────────────────────────────────────────────────

const PasswordRuleItem = ({
  label,
  description,
  checked,
  onChange,
  last = false,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 15,
      padding: '13px 14px',
      borderBottom: last
        ? 'none'
        : '1px solid #eef3f1',
    }}
  >
    <div style={{ flex: 1 }}>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 600,
          color: '#1a2e22',
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: '3px 0 0',
          fontSize: 11,
          color: '#7a9e8e',
          lineHeight: 1.4,
        }}
      >
        {description}
      </p>
    </div>

    <Toggle
      checked={checked}
      onChange={onChange}
    />
  </div>
);

// ─── Password Rules Modal ────────────────────────────────────────────────────

const PasswordRulesModal = ({
  isMobile,
  rules,
  setRules,
  onClose,
  onSave,
  saving,
}) => {
  const updateRule = (key, value) => {
    setRules((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          if (!saving) {
            onClose();
          }
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 30, 24, 0.48)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: isMobile ? '92dvh' : '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: isMobile
            ? '22px 22px 0 0'
            : 22,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 22px',
            borderBottom: '1px solid #eef3f1',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#1a2e22',
                }}
              >
                Password Rules
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: 12,
                  color: '#7a9e8e',
                  lineHeight: 1.5,
                }}
              >
                Configure the password requirements
                for MediTrack users.
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                borderRadius: '50%',
                background: '#f4f8f6',
                color: '#466460',
                fontSize: 20,
                lineHeight: 1,
                cursor: saving
                  ? 'not-allowed'
                  : 'pointer',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Minimum Length */}
          <div>
            <label
              htmlFor="password-min-length"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: '#1a2e22',
                marginBottom: 7,
              }}
            >
              Minimum Password Length
            </label>

            <input
              id="password-min-length"
              type="number"
              min="4"
              max="128"
              value={rules.minLength}
              onChange={(event) =>
                updateRule(
                  'minLength',
                  event.target.value
                )
              }
              disabled={saving}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 13px',
                borderRadius: 10,
                border: '1px solid #dce8e3',
                outline: 'none',
                fontSize: 14,
                color: '#1a2e22',
                background: '#fff',
              }}
            />

            <p
              style={{
                fontSize: 11,
                color: '#7a9e8e',
                margin: '5px 0 0',
              }}
            >
              Choose a value between 4 and 128
              characters.
            </p>
          </div>

          {/* Character Requirements */}
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#1a2e22',
                margin: '0 0 8px',
              }}
            >
              Character Requirements
            </p>

            <div
              style={{
                border: '1px solid #e2ebe8',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <PasswordRuleItem
                label="Uppercase Letter"
                description="Require at least one uppercase letter (A-Z)"
                checked={rules.requireUppercase}
                onChange={(value) =>
                  updateRule(
                    'requireUppercase',
                    value
                  )
                }
              />

              <PasswordRuleItem
                label="Lowercase Letter"
                description="Require at least one lowercase letter (a-z)"
                checked={rules.requireLowercase}
                onChange={(value) =>
                  updateRule(
                    'requireLowercase',
                    value
                  )
                }
              />

              <PasswordRuleItem
                label="Number"
                description="Require at least one number (0-9)"
                checked={rules.requireNumber}
                onChange={(value) =>
                  updateRule(
                    'requireNumber',
                    value
                  )
                }
              />

              <PasswordRuleItem
                label="Special Character"
                description="Require at least one special character"
                checked={
                  rules.requireSpecialCharacter
                }
                onChange={(value) =>
                  updateRule(
                    'requireSpecialCharacter',
                    value
                  )
                }
                last
              />
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: '#f4f8f6',
              border: '1px solid #e2ebe8',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 800,
                color: '#466460',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              Current Policy
            </p>

            <p
              style={{
                margin: '5px 0 0',
                fontSize: 12,
                color: '#526e64',
                lineHeight: 1.5,
              }}
            >
              Passwords must contain at least{' '}
              <strong>
                {rules.minLength || 0}
              </strong>{' '}
              characters
              {rules.requireUppercase
                ? ', one uppercase letter'
                : ''}
              {rules.requireLowercase
                ? ', one lowercase letter'
                : ''}
              {rules.requireNumber
                ? ', one number'
                : ''}
              {rules.requireSpecialCharacter
                ? ', and one special character'
                : ''}
              .
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '15px 22px',
            borderTop: '1px solid #eef3f1',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            position: 'sticky',
            bottom: 0,
            background: '#fff',
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            style={{
              background: '#f4f8f6',
              color: '#466460',
              border: '1px solid #e2ebe8',
              padding: '9px 17px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: saving
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            style={{
              background: saving
                ? '#91aaa1'
                : '#466460',
              color: '#fff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: saving
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SecuritySettings({ isMobile }) {
  const [passwordRules, setPasswordRules] = useState(
    DEFAULT_PASSWORD_RULES
  );

  const [editingRules, setEditingRules] = useState(
    DEFAULT_PASSWORD_RULES
  );

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Load System Configuration ─────────────────────────────────────────

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/system-config`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Failed to load system configuration.'
        );
      }

      const databaseRules =
        result.data?.password_rules;

      const rules = {
        ...DEFAULT_PASSWORD_RULES,
        ...(databaseRules || {}),
      };

      setPasswordRules(rules);
      setEditingRules(rules);
    } catch (err) {
      console.error(
        '[SecuritySettings] Failed to load configuration:',
        err
      );

      setError(
        err.message ||
          'Failed to load password configuration.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Open Configure Modal ──────────────────────────────────────────────

  const openPasswordRules = () => {
    setEditingRules({
      ...passwordRules,
    });

    setError('');
    setSuccess('');
    setShowPasswordModal(true);
  };

  // ─── Close Modal ───────────────────────────────────────────────────────

  const closePasswordRules = () => {
    if (saving) return;

    setEditingRules({
      ...passwordRules,
    });

    setShowPasswordModal(false);
  };

  // ─── Save Password Rules ───────────────────────────────────────────────

  const savePasswordRules = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const minLength = Number(
        editingRules.minLength
      );

      // Frontend validation
      if (
        !Number.isInteger(minLength) ||
        minLength < 4 ||
        minLength > 128
      ) {
        setError(
          'Minimum password length must be between 4 and 128.'
        );

        setSaving(false);
        return;
      }

      const password_rules = {
        minLength,
        requireUppercase:
          Boolean(editingRules.requireUppercase),
        requireLowercase:
          Boolean(editingRules.requireLowercase),
        requireNumber:
          Boolean(editingRules.requireNumber),
        requireSpecialCharacter:
          Boolean(
            editingRules.requireSpecialCharacter
          ),
      };

      console.log(
        '[SecuritySettings] Saving password rules:',
        password_rules
      );

      const response = await fetch(
        `${API_URL}/system-config`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            password_rules,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            'Failed to save password rules.'
        );
      }

      /*
       * Use the returned database value if available.
       * This makes the UI reflect exactly what the
       * backend saved.
       */
      const savedRules = {
        ...DEFAULT_PASSWORD_RULES,
        ...(result.data?.password_rules ||
          password_rules),
      };

      setPasswordRules(savedRules);
      setEditingRules(savedRules);

      setShowPasswordModal(false);

      setSuccess(
        'Password rules updated successfully.'
      );
    } catch (err) {
      console.error(
        '[SecuritySettings] Failed to save password rules:',
        err
      );

      setError(
        err.message ||
          'Failed to save password rules.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Generate Summary ──────────────────────────────────────────────────

  const getPasswordRuleSummary = () => {
    if (loading) {
      return 'Loading password configuration...';
    }

    const requirements = [];

    if (passwordRules.requireUppercase) {
      requirements.push('uppercase');
    }

    if (passwordRules.requireLowercase) {
      requirements.push('lowercase');
    }

    if (passwordRules.requireNumber) {
      requirements.push('number');
    }

    if (passwordRules.requireSpecialCharacter) {
      requirements.push('special character');
    }

    if (requirements.length === 0) {
      return `Minimum ${passwordRules.minLength} characters`;
    }

    return `Minimum ${passwordRules.minLength} characters • ${requirements.join(
      ', '
    )}`;
  };

  return (
    <>
      <div
        style={{
          padding: isMobile
            ? '16px 12px'
            : '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <SectionLabel>
          Admin Security
        </SectionLabel>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              background: '#fff4f3',
              border: '1px solid #f2d2cf',
              color: '#a23d35',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              background: '#f0f8f4',
              border: '1px solid #d5e9df',
              color: '#356b55',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {success}
          </div>
        )}

        <SectionCard>
          {/* Role-Based Access */}
          <Row
            label="Role-Based Access Policies"
            sub="Manage user permissions and roles"
            right={
              <button
                type="button"
                style={{
                  background: '#466460',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Manage
              </button>
            }
          />

          {/* Password Rules */}
          <Row
            label="Password Rules"
            sub={getPasswordRuleSummary()}
            right={
              <button
                type="button"
                onClick={openPasswordRules}
                disabled={loading}
                style={{
                  background: '#466460',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: loading
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                Configure
              </button>
            }
          />

          {/* Data Retention */}
          <Row
            label="Data Retention & Compliance"
            sub="View compliance logs and retention"
            last
            right={
              <button
                type="button"
                style={{
                  background: '#f4f8f6',
                  color: '#466460',
                  border: '1px solid #e2ebe8',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                View
              </button>
            }
          />
        </SectionCard>
      </div>

      {/* Password Rules Modal */}
      {showPasswordModal && (
        <PasswordRulesModal
          isMobile={isMobile}
          rules={editingRules}
          setRules={setEditingRules}
          onClose={closePasswordRules}
          onSave={savePasswordRules}
          saving={saving}
        />
      )}
    </>
  );
}