// frontend/src/components/LoadingAnimation.jsx

//
// A full-screen scanning overlay to show while OCR / verification runs.
//
// Props:
//   file      — File | null   — uploaded image shown as preview (optional)
//   steps     — string[]      — list of step labels shown in order
//   stepDelay — number        — ms between each step advancing (default: 800)
//   title     — string        — heading text (default: 'Verifying your University ID')
//   subtitle  — string        — sub-heading text (default: 'This only takes a moment…')
//   accentColor — string      — CSS color used for scanline / progress / active step (default: '#2d5a52')
//
// Usage (basic):
//   {isScanning && <LoadingAnimation file={selectedFile} />}
//
// Usage (custom steps + colors):
//   {isUploading && (
//     <LoadingAnimation
//       file={receiptFile}
//       title="Processing receipt"
//       subtitle="Extracting line items…"
//       steps={['Reading image…', 'Parsing amounts…', 'Categorizing…', 'Saving…']}
//       accentColor="#4a5568"
//     />
//   )}

import React, { useState, useEffect } from 'react';

const DEFAULT_STEPS = [
  '🪪 Reading document…',
  '🔍 Detecting ID fields…',
  '🏫 Verifying university…',
  '✅ Finalizing account…',
];

const LoadingAnimation = ({
  file        = null,
  steps       = DEFAULT_STEPS,
  stepDelay   = 800,
  title       = 'Verifying your University ID',
  subtitle    = 'This only takes a moment…',
  accentColor = '#2d5a52',
}) => {
  const [step, setStep] = useState(0);

  // Advance through steps on a staggered timer
  useEffect(() => {
    setStep(0);
    const timers = steps.slice(0, -1).map((_, i) =>
      setTimeout(() => setStep(i + 1), stepDelay * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, [steps, stepDelay]);

  // Create object URL once, revoke on unmount to avoid ERR_FILE_NOT_FOUND
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const progress = Math.round((step / steps.length) * 100);

  // Inline style helpers derived from accentColor so the component
  // stays self-contained without injecting global CSS variables.
  const scanlineStyle = {
    position: 'absolute', left: 0, right: 0,
    height: 3,
    background: `linear-gradient(90deg, transparent, ${accentColor}, ${accentColor}cc, ${accentColor}, transparent)`,
    boxShadow: `0 0 12px 2px ${accentColor}99`,
    animation: 'ocr-scan 1.6s ease-in-out infinite',
  };

  const cornerStyle = (pos) => {
    const base = {
      position: 'absolute', width: 16, height: 16,
      borderColor: accentColor, borderStyle: 'solid',
    };
    const positions = {
      tl: { top: 6, left: 6,    borderWidth: '2px 0 0 2px', borderRadius: '4px 0 0 0' },
      tr: { top: 6, right: 6,   borderWidth: '2px 2px 0 0', borderRadius: '0 4px 0 0' },
      bl: { bottom: 6, left: 6, borderWidth: '0 0 2px 2px', borderRadius: '0 0 0 4px' },
      br: { bottom: 6, right: 6, borderWidth: '0 2px 2px 0', borderRadius: '0 0 4px 0' },
    };
    return { ...base, ...positions[pos] };
  };

  return (
    <>
      <style>{`
        @keyframes ocr-scan {
          0%   { top: 0%; }
          50%  { top: calc(100% - 3px); }
          100% { top: 0%; }
        }
        @keyframes ocr-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ocr-step-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ocr-progress {
          from { width: 0%; }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10, 30, 26, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '28px 32px 24px',
          width: '100%', maxWidth: 360,
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}>

          {/* ID image frame with scanline */}
          <div style={{
            position: 'relative',
            width: '100%', height: 140,
            borderRadius: 12, overflow: 'hidden',
            background: '#e8f0ee',
            marginBottom: 24,
          }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="ID preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48,
              }}>🪪</div>
            )}

            <div style={scanlineStyle} />
            <div style={cornerStyle('tl')} />
            <div style={cornerStyle('tr')} />
            <div style={cornerStyle('bl')} />
            <div style={cornerStyle('br')} />
          </div>

          {/* Heading */}
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2e2b', margin: '0 0 4px' }}>
            {title}
          </p>
          <p style={{ fontSize: 12, color: '#7a9490', margin: '0 0 20px' }}>
            {subtitle}
          </p>

          {/* Steps */}
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((label, i) => {
              const status = i < step ? 'done' : i === step ? 'active' : 'pending';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: 13,
                    color: status === 'done' ? accentColor : status === 'active' ? '#1a2e2b' : '#ccc',
                    fontWeight: status === 'active' ? 600 : 400,
                    animation: status !== 'pending' ? 'ocr-step-in 0.35s ease both' : undefined,
                  }}
                >
                  {/* Dot / spinner / checkmark */}
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11,
                    background:
                      status === 'done'   ? `${accentColor}22` :
                      status === 'active' ? accentColor :
                      '#f0f0f0',
                  }}>
                    {status === 'done' && (
                      <span style={{ color: accentColor }}>✓</span>
                    )}
                    {status === 'active' && (
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        animation: 'ocr-spin 0.7s linear infinite',
                      }} />
                    )}
                  </div>

                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{
            marginTop: 20, height: 4, borderRadius: 2,
            background: '#eef2f1', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: accentColor,
              width: `${progress}%`,
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default LoadingAnimation;