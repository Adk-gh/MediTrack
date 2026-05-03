// C:\Users\HP\MediTrack\frontend\src\features\SignupForm.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';
import { registerSchema, getFieldErrors } from '../validation/schemas.js';
import LoadingAnimation from '../components/LoadingAnimation.jsx';

// Clean SVG to replace the ID card emoji
const IdCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ marginBottom: 8 }}>
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
    firstName: '',
    middleInitial: '',
    lastName: '',
    suffix: '',
    email: '',
    universityId: '',
    password: '',
    confirmPassword: '',
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

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };
  const triggerFileInput = () => fileInputRef.current.click();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      const errors = getFieldErrors(registerSchema, formData);
      setFieldErrors(errors);
      setTouched({ firstName: true, lastName: true, email: true, universityId: true, password: true, confirmPassword: true });
      const firstError = Object.values(errors).find(err => err !== undefined && err !== '');
      setError(firstError || "Please check your inputs. Some fields are invalid.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match!');
    }
    if (!selectedFile) {
      return setError('Please upload a photo of your University ID.');
    }

    setLoading(true);
    setIsScanning(true);

    try {
     // In handleSubmit — make sure ALL required fields are appended
const data = new FormData();
data.append('firstName', formData.firstName);
data.append('lastName', formData.lastName);
data.append('email', formData.email);
data.append('password', formData.password);
data.append('universityId', formData.universityId);
data.append('image', selectedFile);
if (formData.middleInitial) data.append('middleInitial', formData.middleInitial);
if (formData.suffix) data.append('suffix', formData.suffix);

      await authService.register(data);
      await new Promise(r => setTimeout(r, 1500));

      setIsScanning(false);
      setSuccess('Registration Successful! Your University ID has been verified. Redirecting...');

      setTimeout(() => {
        navigate('/login');
      }, 2000);

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
        .lf-spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lf-spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        .lf-mobile-only  { display: none !important; }
        .lf-desktop-only { display: block !important; }
        @media (max-width: 640px) {
          .lf-mobile-only  { display: flex !important; }
          .lf-desktop-only { display: none  !important; }
          .lf-desktop-wrapper { display: none  !important; }
          .lf-mobile-wrapper  { display: flex  !important; }
        }
        @media (min-width: 641px) {
          .lf-desktop-wrapper { display: block !important; }
          .lf-mobile-wrapper  { display: none  !important; }
        }
        .lf-error {
          margin-bottom: 15px; padding: 8px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #dc2626; font-size: 14px;
          border-radius: 8px; text-align: center;
        }
        .lf-success {
          margin-bottom: 15px; padding: 10px;
          background: #ecfdf5; border: 1px solid #a7f3d0;
          color: #047857; font-size: 14px; font-weight: 500;
          border-radius: 8px; text-align: center;
        }
        .lf-desktop-wrapper .lf-field { text-align: left; margin-bottom: 15px; }
        .lf-desktop-label {
          display: block; font-size: 12px; font-weight: 600;
          color: #4a635d; margin-bottom: 5px; margin-left: 10px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .lf-desktop-input {
          width: 100%; padding: 10px 15px;
          border: 1.5px solid #cbd5d1; border-radius: 50px;
          font-size: 13px; outline: none;
          transition: border-color 0.2s; font-family: inherit;
        }
        .lf-desktop-input:focus { border-color: #4a635d; }
        .lf-desktop-select {
          width: 100%; padding: 10px 15px;
          border: 1.5px solid #cbd5d1; border-radius: 50px;
          font-size: 13px; outline: none; background: white;
          transition: border-color 0.2s; font-family: inherit; cursor: pointer;
        }
        .lf-desktop-select:focus { border-color: #4a635d; }
        .lf-desktop-row { display: flex; gap: 12px; margin-bottom: 10px; }
        .lf-desktop-row .lf-field { flex: 1; margin-bottom: 0; }
        .lf-desktop-actions {
          display: flex; flex-direction: column;
          align-items: center; gap: 10px; margin-top: 20px;
        }
        .lf-btn-primary-desktop {
          width: 200px; padding: 10px; border-radius: 50px;
          font-size: 14px; font-weight: 700;
          background: #4a635d; color: white; border: none;
          cursor: pointer; font-family: inherit;
          transition: opacity 0.2s, transform 0.15s;
        }
        .lf-btn-primary-desktop:hover:not(:disabled) { opacity: 0.8; transform: scale(1.02); }
        .lf-btn-primary-desktop:disabled { opacity: 0.7; cursor: not-allowed; }
        .lf-desktop-link { text-align: center; font-size: 12px; margin-top: 5px; }
        .lf-desktop-link a { color: #3b5e43; font-weight: bold; text-decoration: none; }
        .lf-desktop-dropzone {
          width: 100%; padding: 15px; border: 1.5px dashed #cbd5d1;
          border-radius: 20px; text-align: center; cursor: pointer;
          background: #f8fafc; transition: all 0.2s; box-sizing: border-box;
        }
        .lf-desktop-dropzone.dragging { border-color: #557a5b; background: #f0fdf4; transform: scale(1.02); }
        .lf-desktop-dropzone span { font-size: 13px; font-weight: 500; color: #557a5b; }
        @media (max-width: 640px) {
          .lf-mobile-wrapper {
            position: fixed; inset: 0; flex-direction: column;
            background: #f0f2f1; overflow-y: auto;
            -webkit-overflow-scrolling: touch; z-index: 0;
          }
          .lf-hero {
            position: relative; background: #2d5a52;
            padding: 56px 28px 40px; overflow: hidden; flex-shrink: 0;
          }
          .lf-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; position: relative; z-index: 1; }
          .lf-brand-icon {
            width: 34px; height: 34px; background: rgba(255,255,255,0.15);
            border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff;
          }
          .lf-brand-name { font-size: 17px; font-weight: 700; color: #fff; }
          .lf-hero-title { font-size: 28px; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 8px; position: relative; z-index: 1; }
          .lf-hero-sub { font-size: 13px; color: rgba(255,255,255,0.7); position: relative; z-index: 1; }
          .lf-card {
            background: #fff; border-radius: 28px 28px 0 0;
            padding: 32px 24px 48px; flex: 1; margin-top: -8px;
            box-shadow: 0 -4px 24px rgba(0,0,0,0.06);
          }
          .lf-label-mobile {
            display: block; font-size: 11px; font-weight: 700;
            letter-spacing: 0.8px; text-transform: uppercase; color: #888; margin-bottom: 8px;
          }
          .lf-input-wrap {
            align-items: center; background: #f4f6f5; border-radius: 14px;
            border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s; overflow: hidden;
            margin-bottom: 16px; display: flex;
          }
          .lf-input-wrap:focus-within { border-color: #2d5a52; background: #fff; }
          .lf-input-mobile {
            flex: 1; border: none; background: transparent; outline: none;
            font-size: 14px; font-family: inherit; color: #1a1a1a; padding: 14px 16px;
          }
          .lf-input-mobile::placeholder { color: #b0b8b5; }
          .lf-select-mobile {
            flex: 1; border: none; background: transparent; outline: none;
            font-size: 14px; font-family: inherit; color: #1a1a1a; padding: 14px 16px;
            cursor: pointer;
          }
          .lf-eye-btn { background: none; border: none; cursor: pointer; padding: 0 14px; display: flex; align-items: center; color: #aaa; }
          .lf-dropzone-mobile {
            background: #f4f6f5; border-radius: 14px; border: 1.5px dashed #cbd5d1;
            padding: 20px 12px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
          .lf-dropzone-mobile.dragging { border-color: #2d5a52; background: #ecfdf5; transform: scale(1.01); }
          .lf-file-preview { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600; color: #2d5a52; }
          .lf-btn-primary-mobile {
            width: 100%; padding: 16px; border-radius: 50px; border: none;
            background: #2d5a52; color: #fff; font-size: 15px; font-weight: 700; font-family: inherit;
            cursor: pointer; transition: opacity 0.2s, transform 0.15s; margin-top: 8px; margin-bottom: 24px;
          }
          .lf-btn-primary-mobile:active:not(:disabled) { transform: scale(0.98); }
          .lf-btn-primary-mobile:disabled { opacity: 0.6; cursor: not-allowed; }
          .lf-footer-text { text-align: center; font-size: 13px; color: #888; }
          .lf-footer-link { color: #2d5a52; font-weight: 700; text-decoration: none; }
        }
      `}</style>

      {/* ══════════════════════ DESKTOP ══════════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout title="Create your account" widthClass="max-w-[500px]">
          <form onSubmit={handleSubmit}>
            {error && <div className="lf-error">{error}</div>}
            {success && <div className="lf-success">{success}</div>}

            {/* Row 1: First Name | M.I. | Last Name */}
            <div className="lf-desktop-row" style={{ gap: '10px' }}>
              <div className="lf-field" style={{ flex: 4 }}>
                <label htmlFor="firstName" className="lf-desktop-label">First Name</label>
                <input id="firstName" type="text" required disabled={loading} className="lf-desktop-input" placeholder="First Name" value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 2 }}>
                <label htmlFor="middleInitial" className="lf-desktop-label text-center">M.I. <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opt.)</span></label>
                <input id="middleInitial" type="text" maxLength="1" disabled={loading} className="lf-desktop-input text-center" placeholder="A" value={formData.middleInitial} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 4 }}>
                <label htmlFor="lastName" className="lf-desktop-label">Last Name</label>
                <input id="lastName" type="text" required disabled={loading} className="lf-desktop-input" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
              </div>
            </div>

            {/* Row 2: Suffix + University ID side by side */}
            <div className="lf-desktop-row" style={{ gap: '10px' }}>
              <div className="lf-field" style={{ flex: 1 }}>
                <label htmlFor="suffix" className="lf-desktop-label">Suffix <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input id="suffix" type="text" disabled={loading} className="lf-desktop-input" placeholder="e.g. Jr." value={formData.suffix} onChange={handleChange} />
              </div>
              <div className="lf-field" style={{ flex: 2 }}>
                <label htmlFor="universityId" className="lf-desktop-label">University ID Number</label>
                <input id="universityId" type="text" required disabled={loading} className="lf-desktop-input" placeholder="University ID" value={formData.universityId} onChange={handleChange} />
              </div>
            </div>

            <div className="lf-field">
              <label htmlFor="email" className="lf-desktop-label">Email</label>
              <input id="email" type="email" required disabled={loading} className="lf-desktop-input" placeholder="you@gmail.com" value={formData.email} onChange={handleChange} />
            </div>

            <div className="lf-field">
              <label className="lf-desktop-label">Upload University ID (Photo)</label>
              <div onClick={triggerFileInput} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`lf-desktop-dropzone ${isDragging ? 'dragging' : ''}`}>
                <input type="file" accept="image/*" required={!selectedFile} onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                {selectedFile ? (
                  <span>✓ {selectedFile.name}</span>
                ) : (
                  <span><span className="text-[#557a5b] font-bold">Click to upload</span> or drag & drop your University ID photo</span>
                )}
              </div>
            </div>

            <div className="lf-desktop-row">
              <div className="lf-field">
                <input id="password" type="password" placeholder="Password" required disabled={loading} className="lf-desktop-input" value={formData.password} onChange={handleChange} />
              </div>
              <div className="lf-field">
                <input id="confirmPassword" type="password" placeholder="Confirm Password" required disabled={loading} className="lf-desktop-input" value={formData.confirmPassword} onChange={handleChange} />
              </div>
            </div>

            <div className="lf-desktop-actions">
              <button type="submit" disabled={loading} className="lf-btn-primary-desktop">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Processing...' : 'Register'}
              </button>
              <div className="lf-desktop-link">
                <span className="text-slate-500">Already have an account? </span>
                <Link to="/login">Sign in</Link>
              </div>
            </div>
          </form>
        </AuthLayout>
      </div>

      {/* ══════════════════════ MOBILE ══════════════════════ */}
      <div className="lf-mobile-wrapper">
        <div className="lf-hero">
          <div className="lf-brand">
            <div className="lf-brand lf-hero-brand">
            <img 
              src="/logo1.jpg" 
              alt="MediTrack Logo" 
              className="lf-brand-name" 
              style={{ height: "40px" }} 
            />
          </div>

          </div>
          <h1 className="lf-hero-title">Create account</h1>
          <p className="lf-hero-sub">Register with your university credentials</p>
        </div>
        <div className="lf-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="lf-error">{error}</div>}
            {success && <div className="lf-success">{success}</div>}

            {/* First Name + M.I. */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="lf-field" style={{ flex: 3 }}>
                <label className="lf-label-mobile">First Name</label>
                <div className="lf-input-wrap">
                  <input id="firstName" type="text" className="lf-input-mobile" placeholder="First Name" value={formData.firstName} onChange={handleChange} required autoComplete="given-name" />
                </div>
              </div>
              <div className="lf-field" style={{ flex: 1 }}>
                <label className="lf-label-mobile" style={{ whiteSpace: 'nowrap' }}>M.I.</label>
                <div className="lf-input-wrap">
                  <input id="middleInitial" type="text" maxLength="1" className="lf-input-mobile text-center px-2" placeholder="A" value={formData.middleInitial} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Last Name */}
            <div className="lf-field">
              <label className="lf-label-mobile">Last Name</label>
              <div className="lf-input-wrap">
                <input id="lastName" type="text" className="lf-input-mobile" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required autoComplete="family-name" />
              </div>
            </div>

            {/* Suffix + University ID side by side */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="lf-field" style={{ flex: 1 }}>
                <label className="lf-label-mobile">Suffix <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opt.)</span></label>
                <div className="lf-input-wrap">
                  <input id="suffix" type="text" className="lf-input-mobile" placeholder="e.g. Jr." value={formData.suffix} onChange={handleChange} autoComplete="honorific-suffix" />
                </div>
              </div>
              <div className="lf-field" style={{ flex: 2 }}>
                <label className="lf-label-mobile">University ID</label>
                <div className="lf-input-wrap">
                  <input id="universityId" type="text" className="lf-input-mobile" placeholder="e.g. 2021-XXXXX" value={formData.universityId} onChange={handleChange} required autoComplete="off" />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="lf-field">
              <label className="lf-label-mobile">Email</label>
              <div className="lf-input-wrap">
                <input id="email" type="email" className="lf-input-mobile" placeholder="you@plsp.edu.ph" value={formData.email} onChange={handleChange} required autoComplete="email" inputMode="email" />
              </div>
            </div>

            {/* University ID Photo */}
            <div className="lf-field">
              <label className="lf-label-mobile">University ID photo</label>
              <div onClick={triggerFileInput} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`lf-dropzone-mobile ${isDragging ? 'dragging' : ''}`}>
                <input type="file" accept="image/*" required={!selectedFile} onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                {selectedFile ? (
                  <div className="lf-file-preview">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 6L9 17l-5-5" strokeLinecap="round" /></svg>
                    <span>{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <IdCardIcon />
                    <span><span className="font-bold">Tap to upload</span> or drag & drop</span>
                    <span style={{ fontSize: 11, color: '#888', marginTop: 4, fontWeight: 400 }}>Your university-issued ID card</span>
                  </>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="lf-field">
              <label className="lf-label-mobile">Password</label>
              <div className="lf-input-wrap">
                <input id="password" type={showPassword ? 'text' : 'password'} className="lf-input-mobile" placeholder="Create a password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
                <button type="button" className="lf-eye-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="lf-field">
              <label className="lf-label-mobile">Confirm password</label>
              <div className="lf-input-wrap">
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} className="lf-input-mobile" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
                <button type="button" className="lf-eye-btn" onClick={() => setShowConfirmPassword(v => !v)}>
                  {showConfirmPassword
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="lf-btn-primary-mobile">
              {loading && <span className="lf-spinner" />}
              {loading ? 'Creating account...' : 'Sign up'}
            </button>

            <p className="lf-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="lf-footer-link">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignupForm;