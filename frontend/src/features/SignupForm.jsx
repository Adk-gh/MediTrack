// frontend/src/components/SignupForm.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';
import { registerSchema, getFieldErrors } from '../validation/schemas.js';
import LoadingAnimation from '../components/LoadingAnimation.jsx';

const SignupForm = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    universityId: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Added success state
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
    setSuccess(''); // Clear previous success messages

    const validation = registerSchema.safeParse(formData);
    if (!validation.success) {
      const errors = getFieldErrors(registerSchema, formData);
      setFieldErrors(errors);
      setTouched({ name: true, email: true, password: true, confirmPassword: true });
      return;
    }

    if (formData.password !== formData.confirmPassword)
      return setError('Passwords do not match!');
    if (!selectedFile)
      return setError('Please upload a photo of your University ID.');

    setLoading(true);
    setIsScanning(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      data.append('universityId', formData.universityId); 
      data.append('image', selectedFile);

      // auth.service.js handles token + user storage internally
      await authService.register(data);

      await new Promise(r => setTimeout(r, 1500)); // Shortened wait time to show the banner faster

      setIsScanning(false);
      
      // Set the success message and trigger the redirect delay
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
        }
        .lf-desktop-input {
          width: 100%; padding: 10px 15px;
          border: 1.5px solid #cbd5d1; border-radius: 50px;
          font-size: 13px; outline: none;
          transition: border-color 0.2s; font-family: inherit;
        }
        .lf-desktop-input:focus { border-color: #4a635d; }
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
            padding: 56px 28px 52px; overflow: hidden; flex-shrink: 0;
          }
          .lf-hero::before {
            content: ''; position: absolute; top: -60px; right: -60px;
            width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,0.06);
          }
          .lf-hero::after {
            content: ''; position: absolute; bottom: -80px; left: -40px;
            width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.04);
          }
          .lf-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; position: relative; z-index: 1; }
          .lf-brand-icon {
            width: 38px; height: 38px; background: rgba(255,255,255,0.15);
            border-radius: 10px; display: flex; align-items: center; justify-content: center;
            font-size: 18px; color: #fff;
          }
          .lf-brand-name { font-size: 17px; font-weight: 700; color: #fff; }
          .lf-hero-title { font-size: 30px; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 8px; position: relative; z-index: 1; }
          .lf-hero-sub { font-size: 14px; color: rgba(255,255,255,0.65); position: relative; z-index: 1; }
          .lf-card {
            background: #fff; border-radius: 28px 28px 0 0;
            padding: 36px 24px 48px; flex: 1; margin-top: -8px;
            box-shadow: 0 -4px 24px rgba(0,0,0,0.06);
          }
          .lf-label-mobile {
            display: block; font-size: 12px; font-weight: 600;
            letter-spacing: 0.6px; text-transform: uppercase; color: #888; margin-bottom: 8px;
          }
          .lf-input-wrap {
            align-items: center; background: #f4f6f5; border-radius: 14px;
            border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s; overflow: hidden;
          }
          .lf-input-wrap:focus-within { border-color: #2d5a52; background: #fff; }
          .lf-input-icon { width: 46px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
          .lf-input-icon-box {
            width: 30px; height: 30px; background: #2d5a52; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
          }
          .lf-input-mobile {
            flex: 1; border: none; background: transparent; outline: none;
            font-size: 15px; font-family: inherit; color: #1a1a1a; padding: 14px 8px 14px 0;
          }
          .lf-input-mobile::placeholder { color: #b0b8b5; }
          .lf-eye-btn { background: none; border: none; cursor: pointer; padding: 0 14px; display: flex; align-items: center; color: #aaa; }
          .lf-dropzone-mobile {
            background: #f4f6f5; border-radius: 14px; border: 1.5px dashed #cbd5d1;
            padding: 18px 12px; text-align: center; cursor: pointer; transition: all 0.2s; margin-top: 4px;
          }
          .lf-dropzone-mobile.dragging { border-color: #2d5a52; background: #ecfdf5; transform: scale(1.01); }
          .lf-dropzone-mobile span { font-size: 13px; font-weight: 500; color: #2d5a52; }
          .lf-file-preview { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600; color: #2d5a52; }
          .lf-btn-primary-mobile {
            width: 100%; padding: 16px; border-radius: 50px; border: none;
            background: #2d5a52; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit;
            cursor: pointer; transition: opacity 0.2s, transform 0.15s; margin-top: 12px; margin-bottom: 16px;
          }
          .lf-btn-primary-mobile:active:not(:disabled) { transform: scale(0.98); }
          .lf-btn-primary-mobile:disabled { opacity: 0.6; cursor: not-allowed; }
          .lf-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
          .lf-divider-line { flex: 1; height: 1px; background: #e8eceb; }
          .lf-divider-text { font-size: 13px; color: #aaa; font-weight: 500; }
          .lf-footer-text { text-align: center; font-size: 13.5px; color: #999; margin-top: 24px; }
          .lf-footer-link { color: #2d5a52; font-weight: 700; text-decoration: none; }
        }
      `}</style>

      {/* ══════════════════════ DESKTOP ══════════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout title="Create your account" widthClass="max-w-[480px]">
          <form onSubmit={handleSubmit}>
            {error && <div className="lf-error">{error}</div>}
            {success && <div className="lf-success">{success}</div>}
            
            <div className="lf-desktop-row">
              <div className="lf-field">
                <label htmlFor="name" className="lf-desktop-label">Full Name</label>
                <input id="name" type="text" required disabled={loading} className="lf-desktop-input" placeholder="Lastname, Firstname M." value={formData.name} onChange={handleChange} />
              </div>
              <div className="lf-field">
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
            <div className="lf-brand-icon">＋</div>
            <span className="lf-brand-name">MediTrack</span>
          </div>
          <h1 className="lf-hero-title">Create account</h1>
          <p className="lf-hero-sub">Register with your university credentials</p>
        </div>
        <div className="lf-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="lf-error">{error}</div>}
            {success && <div className="lf-success">{success}</div>}

            <div className="lf-field">
              <label className="lf-label-mobile">Full name</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon"><div className="lf-input-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div></div>
                <input id="name" type="text" className="lf-input-mobile" placeholder="Juan Dela Cruz" value={formData.name} onChange={handleChange} required autoComplete="name" />
              </div>
            </div>

            <div className="lf-field">
              <label className="lf-label-mobile">University ID number</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon"><div className="lf-input-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M14 9h4M14 12h4M14 15h2" />
                  </svg>
                </div></div>
                <input id="universityId" type="text" className="lf-input-mobile" placeholder="e.g. 2021-XXXXX" value={formData.universityId} onChange={handleChange} required autoComplete="off" />
              </div>
            </div>

            <div className="lf-field">
              <label className="lf-label-mobile">Email</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon"><div className="lf-input-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                  </svg>
                </div></div>
                <input id="email" type="email" className="lf-input-mobile" placeholder="you@plsp.edu.ph" value={formData.email} onChange={handleChange} required autoComplete="email" inputMode="email" />
              </div>
            </div>

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
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🪪</div>
                    <span><span className="font-bold">Tap to upload</span> or drag & drop<br /><span style={{ fontSize: 11, color: '#999' }}>Your university-issued ID card</span></span>
                  </div>
                )}
              </div>
            </div>

            <div className="lf-field">
              <label className="lf-label-mobile">Password</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon"><div className="lf-input-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div></div>
                <input id="password" type={showPassword ? 'text' : 'password'} className="lf-input-mobile" placeholder="Create a password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
                <button type="button" className="lf-eye-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            <div className="lf-field">
              <label className="lf-label-mobile">Confirm password</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon"><div className="lf-input-icon-box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4" />
                  </svg>
                </div></div>
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

            <div className="lf-divider">
              <div className="lf-divider-line" />
              <span className="lf-divider-text">or</span>
              <div className="lf-divider-line" />
            </div>

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