// frontend/src/features/SignupForm.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';
import { registerSchema, getFieldErrors } from '../validation/schemas.js';
import LoadingAnimation from '../components/LoadingAnimation.jsx';

const IdCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <rect x="3" y="4" width="18" height="16" rx="3" ry="3" />
    <line x1="16" y1="2" x2="16" y2="4" />
    <line x1="8" y1="2" x2="8" y2="4" />
    <circle cx="9" cy="11" r="2" />
    <line x1="14" y1="10" x2="18" y2="10" />
    <line x1="14" y1="14" x2="18" y2="14" />
    <line x1="6" y1="16" x2="12" y2="16" />
  </svg>
);

const SignupForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '',
    email: '', universityId: '', password: '', confirmPassword: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.id]: e.target.value });

  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const errors = getFieldErrors(registerSchema, formData);
      setFieldErrors(errors);
    }
  }, [formData, touched]);

  const handleBlur = (field) => setTouched(prev => ({ ...prev, [field]: true }));
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };
  const triggerFileInput = () => fileInputRef.current.click();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      const errors = getFieldErrors(registerSchema, formData);
      setFieldErrors(errors);
      setTouched({ firstName: true, lastName: true, email: true, universityId: true, password: true, confirmPassword: true });
      const firstError = Object.values(errors).find(err => err !== undefined && err !== '');
      setError(firstError || "Please check your inputs. Some fields are invalid.");
      return;
    }
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match!');
    if (!selectedFile) return setError('Please upload a photo of your University ID.');
    setLoading(true);
    try {
      const isIdUsed = await authService.checkIdExists(formData.universityId);
      if (isIdUsed) { setLoading(false); return setError('This University ID is already registered.'); }
      setIsScanning(true);
      const data = new FormData();
      data.append('firstName', formData.firstName);
      data.append('lastName', formData.lastName);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('universityId', formData.universityId);
      data.append('image', selectedFile);
      if (formData.middleName) data.append('middleName', formData.middleName);
      if (formData.suffix) data.append('suffix', formData.suffix);
      await authService.register(data);
      await new Promise(r => setTimeout(r, 1500));
      setIsScanning(false);
      setSuccess('Account created! Check your email and click the confirmation link before signing in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setIsScanning(false);
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isScanning && <LoadingAnimation file={selectedFile} />}

      <style>{`
        @keyframes lf-spin { to { transform: rotate(360deg); } }
        @keyframes m-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes m-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes m-slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lf-spinner {
          display: inline-block; width: 15px; height: 15px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff; border-radius: 50%;
          animation: lf-spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }

        /* ── Visibility ── */
        .lf-desktop-wrapper { display: block; }
        .lf-mobile-wrapper  { display: none; }
        @media (max-width: 640px) {
          .lf-desktop-wrapper { display: none !important; }
          .lf-mobile-wrapper  { display: flex !important; }
        }

        /* ── Desktop ── */
        .lf-error {
          margin-bottom: 16px; padding: 10px 14px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #dc2626; font-size: 13px;
          border-radius: 10px; text-align: center;
        }
        .lf-success {
          margin-bottom: 16px; padding: 10px 14px;
          background: #ecfdf5; border: 1px solid #a7f3d0;
          color: #047857; font-size: 13px; font-weight: 500;
          border-radius: 10px; text-align: center;
        }
        .lf-desktop-wrapper .lf-field { text-align: left; margin-bottom: 14px; }
        .lf-desktop-label {
          display: block; font-size: 11px; font-weight: 700;
          color: #4a635d; margin-bottom: 6px; margin-left: 4px;
          text-transform: uppercase; letter-spacing: 0.6px;
          white-space: nowrap;
        }
        .lf-desktop-input {
          width: 100%; padding: 10px 14px; box-sizing: border-box;
          border: 1.5px solid #d1dbd8; border-radius: 10px;
          font-size: 13.5px; outline: none; color: #1a2e2b;
          transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit;
          background: #f9fbfa;
        }
        .lf-desktop-input:focus {
          border-color: #4a635d; background: #fff;
          box-shadow: 0 0 0 3px rgba(74,99,93,0.1);
        }
        .lf-desktop-input::placeholder { color: #aabdb8; }
        .lf-desktop-row { display: flex; gap: 10px; margin-bottom: 0; }
        .lf-desktop-row .lf-field { flex: 1; margin-bottom: 14px; }
        .lf-desktop-actions {
          display: flex; flex-direction: column;
          align-items: center; gap: 12px; margin-top: 22px;
        }
        .lf-btn-primary-desktop {
          width: 100%; padding: 12px; border-radius: 10px;
          font-size: 14px; font-weight: 700;
          background: #3a524f; color: white; border: none;
          cursor: pointer; font-family: inherit;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.3px;
        }
        .lf-btn-primary-desktop:hover:not(:disabled) {
          opacity: 0.88; transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(58,82,79,0.3);
        }
        .lf-btn-primary-desktop:disabled { opacity: 0.6; cursor: not-allowed; }
        .lf-desktop-link { text-align: center; font-size: 12.5px; color: #6b8577; margin-top: 2px; }
        .lf-desktop-link a { color: #3a524f; font-weight: 700; text-decoration: none; }
        .lf-desktop-link a:hover { text-decoration: underline; }
        .lf-desktop-dropzone {
          width: 100%; padding: 18px 15px; border: 1.5px dashed #c5d5d2;
          border-radius: 12px; text-align: center; cursor: pointer;
          background: #f6faf9; transition: all 0.2s; box-sizing: border-box;
        }
        .lf-desktop-dropzone:hover { border-color: #4a635d; background: #eef6f4; }
        .lf-desktop-dropzone.dragging { border-color: #4a635d; background: #eef6f4; transform: scale(1.01); }
        .lf-desktop-dropzone span { font-size: 13px; font-weight: 500; color: #4a635d; }
        .lf-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 4px 0 14px; color: #aabdb8; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.8px;
        }
        .lf-divider::before, .lf-divider::after {
          content: ''; flex: 1; height: 1px; background: #e2ecea;
        }

        /* ════════════════════════════════════
           MOBILE — redesigned native shell
        ════════════════════════════════════ */
        @media (max-width: 640px) {
          .lf-mobile-wrapper {
            position: fixed; inset: 0;
            flex-direction: column;
            background: #F2F4F3;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          /* ── Top bar ── */
          .m-topbar {
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px 24px 0; flex-shrink: 0;
            animation: m-fadeIn 0.4s ease both;
          }
          .m-logo-wrap { display: flex; align-items: center; gap: 10px; }
          .m-logo-img { height: 32px; border-radius: 8px; }
          .m-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
          .m-step-badge {
            background: #E4EFED; border-radius: 20px;
            padding: 5px 12px; font-size: 12px;
            font-weight: 600; color: #3D7A6F;
          }

          /* ── Hero ── */
          .m-hero {
            padding: 32px 28px 24px; flex-shrink: 0;
            animation: m-fadeUp 0.5s ease 0.1s both;
          }
          .m-eyebrow {
            font-size: 12px; font-weight: 600; color: #4A8C82;
            letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px;
          }
          .m-title {
            font-size: 30px; font-weight: 800; color: #1A2E2B;
            line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 8px;
          }
          .m-subtitle { font-size: 14px; color: #6B8580; line-height: 1.5; }

          /* ── Card ── */
          .m-card {
            background: #fff; border-radius: 28px 28px 0 0;
            padding: 32px 24px 56px; flex: 1;
            box-shadow: 0 -2px 24px rgba(42,72,68,0.08);
            animation: m-fadeUp 0.5s ease 0.2s both;
          }

          /* ── Section header inside card ── */
          .m-section-title {
            font-size: 11.5px; font-weight: 700; letter-spacing: 1px;
            text-transform: uppercase; color: #A0B8B4;
            margin: 0 0 14px; padding-bottom: 10px;
            border-bottom: 1px solid #F0F4F3;
          }
          .m-section-title:not(:first-of-type) { margin-top: 24px; }

          /* ── Alerts ── */
          .m-error {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 14px; margin-bottom: 20px;
            background: #FFF0F0; border-radius: 14px;
            border: 1px solid #FFCCCC;
            animation: m-slideDown 0.3s ease;
          }
          .m-error-icon {
            width: 20px; height: 20px; border-radius: 50%;
            background: #FF4444; display: flex; align-items: center;
            justify-content: center; flex-shrink: 0;
          }
          .m-error-text { font-size: 13.5px; color: #C0392B; font-weight: 500; line-height: 1.4; }
          .m-success {
            display: flex; align-items: center; gap: 10px;
            padding: 12px 14px; margin-bottom: 20px;
            background: #EDFAF4; border-radius: 14px;
            border: 1px solid #A7EED0;
            animation: m-slideDown 0.3s ease;
          }
          .m-success-icon {
            width: 20px; height: 20px; border-radius: 50%;
            background: #22C77A; display: flex; align-items: center;
            justify-content: center; flex-shrink: 0;
          }
          .m-success-text { font-size: 13.5px; color: #0A7850; font-weight: 500; line-height: 1.4; }

          /* ── Field ── */
          .m-field { margin-bottom: 12px; }
          .m-field-label {
            font-size: 11.5px; font-weight: 700; letter-spacing: 0.7px;
            text-transform: uppercase; color: #8AA09C; margin-bottom: 7px; display: block;
          }

          /* ── Input pill ── */
          .m-input-pill {
            display: flex; align-items: center;
            background: #F4F7F6; border-radius: 14px;
            border: 1.5px solid transparent;
            transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
            overflow: hidden;
          }
          .m-input-pill:focus-within {
            border-color: #3D7A6F; background: #fff;
            box-shadow: 0 0 0 4px rgba(61,122,111,0.1);
          }
          .m-pill-input {
            flex: 1; border: none; background: transparent; outline: none;
            font-size: 15px; font-family: inherit; color: #1A2E2B;
            padding: 13px 14px;
          }
          .m-pill-input::placeholder { color: #B5C8C5; }
          .m-pill-btn {
            background: none; border: none; cursor: pointer;
            padding: 0 14px; display: flex; align-items: center;
            color: #A0B8B4; transition: color 0.2s; flex-shrink: 0;
          }
          .m-pill-btn:hover { color: #3D7A6F; }

          /* ── Row layout ── */
          .m-row { display: flex; gap: 10px; }
          .m-row .m-field { flex: 1; }

          /* ── Dropzone ── */
          .m-dropzone {
            background: #F4F7F6; border-radius: 16px;
            border: 1.5px dashed #C5D5D2;
            padding: 22px 16px; text-align: center;
            cursor: pointer; transition: all 0.2s;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 6px;
          }
          .m-dropzone.dragging { border-color: #3D7A6F; background: #EAF5F1; transform: scale(1.01); }
          .m-dropzone-icon { color: #8AA09C; margin-bottom: 4px; }
          .m-dropzone-title { font-size: 14px; font-weight: 600; color: #2D5C52; }
          .m-dropzone-hint { font-size: 12px; color: #A0B8B4; }
          .m-file-preview {
            display: flex; align-items: center; gap: 8px;
            font-size: 13.5px; font-weight: 600; color: #2D5C52;
          }

          /* ── Primary CTA ── */
          .m-btn-primary {
            width: 100%; padding: 17px; border-radius: 18px; border: none;
            background: #2D5C52; color: #fff;
            font-size: 16px; font-weight: 700; font-family: inherit;
            cursor: pointer; letter-spacing: 0.1px;
            transition: transform 0.15s, background 0.2s;
            margin-top: 8px; margin-bottom: 24px;
            -webkit-tap-highlight-color: transparent;
          }
          .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
          .m-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

          /* ── Footer ── */
          .m-footer { text-align: center; font-size: 13.5px; color: #8AA09C; }
          .m-footer a { color: #2D5C52; font-weight: 700; text-decoration: none; }
        }
      `}</style>

      {/* ══════════════════════ DESKTOP ══════════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout title="Create your account" widthClass="max-w-[480px]">
          <form onSubmit={handleSubmit}>
            {error   && <div className="lf-error">{error}</div>}
            {success && <div className="lf-success">{success}</div>}

            {/* Row 1: First · Middle · Last */}
            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="firstName" className="lf-desktop-label">First Name</label>
                <input id="firstName" type="text" required disabled={loading}
                  className="lf-desktop-input" placeholder="First name"
                  value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 4 }}>
                <label htmlFor="middleName" className="lf-desktop-label">
                  Middle Name{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span>
                </label>
                <input id="middleName" type="text" disabled={loading}
                  className="lf-desktop-input" placeholder="Middle name"
                  value={formData.middleName} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="lastName" className="lf-desktop-label">Last Name</label>
                <input id="lastName" type="text" required disabled={loading}
                  className="lf-desktop-input" placeholder="Last name"
                  value={formData.lastName} onChange={handleChange} />
              </div>
            </div>

            {/* Row 2: Suffix · University ID */}
            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 2 }}>
                <label htmlFor="suffix" className="lf-desktop-label">
                  Suffix{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span>
                </label>
                <input id="suffix" type="text" disabled={loading}
                  className="lf-desktop-input" placeholder="Jr., Sr., III…"
                  value={formData.suffix} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 5 }}>
                <label htmlFor="universityId" className="lf-desktop-label">University ID</label>
                <input id="universityId" type="text" required disabled={loading}
                  className="lf-desktop-input" placeholder="e.g. 2021-00123"
                  value={formData.universityId} onChange={handleChange} />
              </div>
            </div>

            {/* Email */}
            <div className="lf-field">
              <label htmlFor="email" className="lf-desktop-label">Email Address</label>
              <input id="email" type="email" required disabled={loading}
                className="lf-desktop-input" placeholder="you@plsp.edu.ph"
                value={formData.email} onChange={handleChange} />
            </div>

            {/* ID Upload */}
            <div className="lf-field">
              <label className="lf-desktop-label">University ID Photo</label>
              <div
                onClick={triggerFileInput}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`lf-desktop-dropzone ${isDragging ? 'dragging' : ''}`}
              >
                <input type="file" accept="image/*" required={!selectedFile}
                  onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                {selectedFile
                  ? <span>✓ {selectedFile.name}</span>
                  : <span><span style={{ fontWeight: 700 }}>Click to upload</span> or drag &amp; drop your ID photo</span>
                }
              </div>
            </div>

            <div className="lf-divider">Password</div>

            {/* Row 3: Password · Confirm */}
            <div className="lf-desktop-row">
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="password" className="lf-desktop-label">Password</label>
                <input id="password" type="password" placeholder="Create a password"
                  required disabled={loading} className="lf-desktop-input"
                  value={formData.password} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="confirmPassword" className="lf-desktop-label">Confirm Password</label>
                <input id="confirmPassword" type="password" placeholder="Repeat password"
                  required disabled={loading} className="lf-desktop-input"
                  value={formData.confirmPassword} onChange={handleChange} />
              </div>
            </div>

            <div className="lf-desktop-actions">
              <button type="submit" disabled={loading} className="lf-btn-primary-desktop">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Processing…' : 'Create Account'}
              </button>
              <div className="lf-desktop-link">
                Already have an account? <Link to="/login">Sign in</Link>
              </div>
            </div>
          </form>
        </AuthLayout>
      </div>

      {/* ══════════════════════ MOBILE ══════════════════════ */}
      <div className="lf-mobile-wrapper">

        {/* Top bar */}
        <div className="m-topbar">
          <div className="m-logo-wrap">
            <span className="m-logo-name">MediTrack</span>
          </div>
          <span className="m-step-badge">New account</span>
        </div>

        {/* Hero */}
        <div className="m-hero">
          <p className="m-eyebrow">Health Portal</p>
          <h1 className="m-title">Create your<br />account.</h1>
          <p className="m-subtitle">Register with your university credentials to get started.</p>
        </div>

        {/* Card */}
        <div className="m-card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="m-error">
                <div className="m-error-icon">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                    <path d="M6 3v3M6 8.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="m-error-text">{error}</p>
              </div>
            )}
            {success && (
              <div className="m-success">
                <div className="m-success-icon">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                    <path d="M2.5 6l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="m-success-text">{success}</p>
              </div>
            )}

            {/* Personal info section */}
            <p className="m-section-title">Personal info</p>

            {/* First name + Middle Name */}
            <div className="m-row">
              <div className="m-field" style={{ flex: 3 }}>
                <label className="m-field-label">First name</label>
                <div className="m-input-pill">
                  <input id="firstName" type="text" className="m-pill-input" placeholder="First name"
                    value={formData.firstName} onChange={handleChange} required autoComplete="given-name" />
                </div>
              </div>
              <div className="m-field" style={{ flex: 2 }}>
                <label className="m-field-label">
                  Middle{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span>
                </label>
                <div className="m-input-pill">
                  <input id="middleName" type="text" className="m-pill-input"
                    placeholder="Middle" value={formData.middleName} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Last name */}
            <div className="m-field">
              <label className="m-field-label">Last name</label>
              <div className="m-input-pill">
                <input id="lastName" type="text" className="m-pill-input" placeholder="Last name"
                  value={formData.lastName} onChange={handleChange} required autoComplete="family-name" />
              </div>
            </div>

            {/* Suffix + University ID */}
            <div className="m-row">
              <div className="m-field" style={{ flex: 1 }}>
                <label className="m-field-label">
                  Suffix{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>(opt.)</span>
                </label>
                <div className="m-input-pill">
                  <input id="suffix" type="text" className="m-pill-input" placeholder="Jr."
                    value={formData.suffix} onChange={handleChange} />
                </div>
              </div>
              <div className="m-field" style={{ flex: 2 }}>
                <label className="m-field-label">University ID</label>
                <div className="m-input-pill">
                  <input id="universityId" type="text" className="m-pill-input" placeholder="2021-XXXXX"
                    value={formData.universityId} onChange={handleChange} required autoComplete="off" />
                </div>
              </div>
            </div>

            {/* Account section */}
            <p className="m-section-title">Account details</p>

            {/* Email */}
            <div className="m-field">
              <label className="m-field-label">Email</label>
              <div className="m-input-pill">
                <input id="email" type="email" className="m-pill-input" placeholder="you@plsp.edu.ph"
                  value={formData.email} onChange={handleChange} required
                  autoComplete="email" inputMode="email" />
              </div>
            </div>

            {/* Password */}
            <div className="m-field">
              <label className="m-field-label">Password</label>
              <div className="m-input-pill">
                <input id="password" type={showPassword ? 'text' : 'password'}
                  className="m-pill-input" placeholder="Create a password"
                  value={formData.password} onChange={handleChange} required autoComplete="new-password" />
                <button type="button" className="m-pill-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword
                    ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06"/></svg>
                    : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="m-field">
              <label className="m-field-label">Confirm password</label>
              <div className="m-input-pill">
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                  className="m-pill-input" placeholder="Repeat your password"
                  value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
                <button type="button" className="m-pill-btn" onClick={() => setShowConfirmPassword(v => !v)}>
                  {showConfirmPassword
                    ? <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06"/></svg>
                    : <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Verification section */}
            <p className="m-section-title">ID verification</p>

            {/* Dropzone */}
            <div className="m-field">
              <div onClick={triggerFileInput} onDragOver={handleDragOver}
                onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={`m-dropzone ${isDragging ? 'dragging' : ''}`}>
                <input type="file" accept="image/*" required={!selectedFile}
                  onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
                {selectedFile ? (
                  <div className="m-file-preview">
                    <svg viewBox="0 0 20 20" fill="none" stroke="#22C77A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M4 10.5l4 4 8-8"/>
                    </svg>
                    <span>{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="m-dropzone-icon"><IdCardIcon /></div>
                    <p className="m-dropzone-title">Tap to upload ID photo</p>
                    <p className="m-dropzone-hint">Your university-issued ID card</p>
                  </>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading} className="m-btn-primary">
              {loading && <span className="lf-spinner" />}
              {loading ? 'Creating account…' : 'Sign up'}
            </button>

            <p className="m-footer">
              Already have an account?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignupForm;