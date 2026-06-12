// frontend/src/features/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to send reset email');
      } else {
        setMessage(data.message || 'Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fp-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fp-container {
          animation: fp-fadeUp 0.5s ease-out forwards;
        }
        .fp-input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 15px;
          transition: all 0.2s;
          background: #f9fafb;
        }
        .fp-input:focus {
          outline: none;
          border-color: #466460;
          box-shadow: 0 0 0 3px rgba(70, 100, 96, 0.15);
          background: #fff;
        }
        .fp-btn {
          width: 100%;
          padding: 14px;
          background: #466460;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fp-btn:hover:not(:disabled) {
          background: #3D5550;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(70,100,96,0.25);
        }
        .fp-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .fp-back {
          display: block;
          text-align: center;
          margin-top: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        .fp-back a {
          color: #466460;
          text-decoration: none;
          font-weight: 600;
        }
        .fp-back a:hover {
          text-decoration: underline;
        }
        .fp-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: #f0f4f3;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fp-icon svg {
          width: 32px;
          height: 32px;
          color: #466460;
        }
        @media (max-width: 480px) {
          .fp-container { padding: 30px 24px; }
        }
      `}</style>

      <AuthLayout>
        <div className={`fp-container ${!isLoaded ? 'opacity-0' : ''}`} style={{ maxWidth: 420, margin: '0 auto', padding: '40px' }}>
          <div className="fp-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#1f2937' }}>
            Forgot Password?
          </h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="fp-input"
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                marginBottom: 20,
                color: '#dc2626',
                fontSize: 14
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                padding: '12px 16px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                marginBottom: 20,
                color: '#16a34a',
                fontSize: 14
              }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="fp-btn">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="fp-back">
            Remember your password? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
};

export default ForgotPassword;