
// frontend/src/components/LoadingAnimation.jsx
//
// A clean full-screen scanning overlay to show while OCR / verification runs.
//
// Props:
//   file         — File | null — uploaded image shown as preview (optional)
//   steps        — string[]    — list of step labels shown in order
//   stepDelay    — number      — ms between each step advancing (default: 800)
//   title        — string      — heading text
//   subtitle     — string      — sub-heading text
//   accentColor  — string      — CSS color for scanline / progress / active step
//
// Usage:
//   {isScanning && <LoadingAnimation file={selectedFile} />}
//
// Custom:
//   <LoadingAnimation
//     file={receiptFile}
//     title="Processing receipt"
//     subtitle="Extracting line items…"
//     steps={[
//       'Reading image…',
//       'Parsing amounts…',
//       'Categorizing…',
//       'Saving…',
//     ]}
//     accentColor="#4a5568"
//   />

import React, { useEffect, useState } from 'react';

const DEFAULT_STEPS = [
  'Reading document…',
  'Detecting ID fields…',
  'Verifying university…',
  'Finalizing account…',
];

const LoadingAnimation = ({
  file = null,
  steps = DEFAULT_STEPS,
  stepDelay = 800,
  title = 'Verifying your University ID',
  subtitle = 'This only takes a moment…',
  accentColor = '#2d5a52',
}) => {
  const [step, setStep] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  /*
   * Advance through the verification steps.
   */
  useEffect(() => {
    setStep(0);

    if (!steps || steps.length <= 1) {
      return undefined;
    }

    const timers = steps.slice(0, -1).map((_, index) =>
      setTimeout(() => {
        setStep(index + 1);
      }, stepDelay * (index + 1))
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [steps, stepDelay]);

  /*
   * Create and clean up the uploaded image preview URL.
   */
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  /*
   * Progress should reach 100% when the final step is active.
   */
  const progress =
    steps.length > 0
      ? Math.round(((step + 1) / steps.length) * 100)
      : 0;

  /*
   * Generate a lighter version of the accent color.
   * Falls back safely if a non-hex CSS color is supplied.
   */
  const accentSoft = accentColor.startsWith('#')
    ? `${accentColor}18`
    : 'rgba(45, 90, 82, 0.10)';

  const accentBorder = accentColor.startsWith('#')
    ? `${accentColor}55`
    : 'rgba(45, 90, 82, 0.35)';

  /*
   * Scanline.
   */
  const scanlineStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    background: `linear-gradient(
      90deg,
      transparent 0%,
      ${accentColor}66 20%,
      ${accentColor} 50%,
      ${accentColor}66 80%,
      transparent 100%
    )`,
    boxShadow: `0 0 14px 2px ${accentColor}55`,
    animation: 'ocr-scan 2.2s ease-in-out infinite',
    zIndex: 4,
  };

  /*
   * Document frame corner.
   */
  const cornerStyle = (position) => {
    const base = {
      position: 'absolute',
      width: 18,
      height: 18,
      borderColor: accentColor,
      borderStyle: 'solid',
      zIndex: 5,
    };

    const positions = {
      tl: {
        top: 10,
        left: 10,
        borderWidth: '2px 0 0 2px',
        borderRadius: '5px 0 0 0',
      },
      tr: {
        top: 10,
        right: 10,
        borderWidth: '2px 2px 0 0',
        borderRadius: '0 5px 0 0',
      },
      bl: {
        bottom: 10,
        left: 10,
        borderWidth: '0 0 2px 2px',
        borderRadius: '0 0 0 5px',
      },
      br: {
        bottom: 10,
        right: 10,
        borderWidth: '0 2px 2px 0',
        borderRadius: '0 0 5px 0',
      },
    };

    return {
      ...base,
      ...positions[position],
    };
  };

  return (
    <>
      <style>
        {`
          @keyframes ocr-scan {
            0% {
              top: 0%;
              opacity: 0.7;
            }

            50% {
              top: calc(100% - 2px);
              opacity: 1;
            }

            100% {
              top: 0%;
              opacity: 0.7;
            }
          }

          @keyframes ocr-spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes ocr-fade-up {
            from {
              opacity: 0;
              transform: translateY(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes ocr-card-in {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.98);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes ocr-pulse {
            0%,
            100% {
              box-shadow: 0 0 0 0 ${accentColor}22;
            }

            50% {
              box-shadow: 0 0 0 5px ${accentColor}08;
            }
          }

          @media (max-width: 480px) {
            .ocr-loading-card {
              padding: 22px 20px 20px !important;
              border-radius: 16px !important;
            }

            .ocr-document-frame {
              height: 125px !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .ocr-loading-card *,
            .ocr-loading-card {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}
      </style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(12, 27, 24, 0.78)',
          backdropFilter: 'blur(7px)',
          WebkitBackdropFilter: 'blur(7px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        {/* Card */}
        <div
          className="ocr-loading-card"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            width: '100%',
            maxWidth: 390,
            background: '#ffffff',
            borderRadius: 20,
            padding: '26px 30px 24px',
            boxShadow:
              '0 28px 70px rgba(0, 0, 0, 0.30)',
            animation:
              'ocr-card-in 0.35s ease-out both',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              {/* Small status indicator */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accentColor,
                  animation: 'ocr-pulse 1.8s ease-in-out infinite',
                }}
              />

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: accentColor,
                }}
              >
                Verification in progress
              </span>
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#9aa9a6',
              }}
            >
              {progress}%
            </span>
          </div>

          {/* Document preview */}
          <div
            className="ocr-document-frame"
            style={{
              position: 'relative',
              width: '100%',
              height: 155,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#f1f5f4',
              border: `1px solid ${accentBorder}`,
              marginBottom: 22,
            }}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="Uploaded document preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.72,
                    filter: 'saturate(0.85)',
                  }}
                />

                {/* Subtle overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.12))',
                    zIndex: 2,
                  }}
                />
              </>
            ) : (
              /* CSS document placeholder */
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 70,
                    height: 92,
                    background: '#ffffff',
                    border: '1px solid #d6e1de',
                    borderRadius: 7,
                    boxShadow: '0 5px 15px rgba(35, 65, 60, 0.08)',
                  }}
                >
                  {/* Document fold */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -1,
                      right: -1,
                      width: 22,
                      height: 22,
                      background: '#f1f5f4',
                      borderLeft: '1px solid #d6e1de',
                      borderBottom: '1px solid #d6e1de',
                      borderRadius: '0 6px 0 6px',
                    }}
                  />

                  {/* Photo placeholder */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 18,
                      left: 10,
                      width: 22,
                      height: 27,
                      borderRadius: 3,
                      background: accentSoft,
                      border: `1px solid ${accentBorder}`,
                    }}
                  />

                  {/* Text lines */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 19,
                      left: 39,
                      right: 8,
                      height: 4,
                      borderRadius: 2,
                      background: '#d9e2df',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      top: 28,
                      left: 39,
                      right: 13,
                      height: 4,
                      borderRadius: 2,
                      background: '#e3e9e7',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      top: 37,
                      left: 39,
                      right: 17,
                      height: 4,
                      borderRadius: 2,
                      background: '#e3e9e7',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      left: 10,
                      right: 10,
                      bottom: 18,
                      height: 4,
                      borderRadius: 2,
                      background: '#d9e2df',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      left: 10,
                      right: 22,
                      bottom: 9,
                      height: 4,
                      borderRadius: 2,
                      background: '#e3e9e7',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Scanning line */}
            <div style={scanlineStyle} />

            {/* Scanning corners */}
            <div style={cornerStyle('tl')} />
            <div style={cornerStyle('tr')} />
            <div style={cornerStyle('bl')} />
            <div style={cornerStyle('br')} />

            {/* "Scanning" label */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 6,
                background: 'rgba(20, 38, 34, 0.72)',
                color: '#ffffff',
                borderRadius: 20,
                padding: '5px 10px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(4px)',
              }}
            >
              Scanning document
            </div>
          </div>

          {/* Heading */}
          <div
            style={{
              textAlign: 'left',
              marginBottom: 22,
            }}
          >
            <h2
              style={{
                margin: '0 0 5px',
                fontSize: 17,
                lineHeight: 1.35,
                fontWeight: 700,
                color: '#182c28',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                lineHeight: 1.5,
                color: '#7b8d89',
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* Steps */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 11,
            }}
          >
            {steps.map((label, index) => {
              const status =
                index < step
                  ? 'done'
                  : index === step
                    ? 'active'
                    : 'pending';

              return (
                <div
                  key={`${label}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    minHeight: 25,
                    animation:
                      status !== 'pending'
                        ? 'ocr-fade-up 0.3s ease both'
                        : undefined,
                  }}
                >
                  {/* Status indicator */}
                  <div
                    style={{
                      width: 23,
                      height: 23,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      background:
                        status === 'done'
                          ? accentSoft
                          : status === 'active'
                            ? accentColor
                            : '#f3f5f4',
                      border:
                        status === 'pending'
                          ? '1px solid #e2e8e6'
                          : 'none',
                    }}
                  >
                    {status === 'done' && (
                      <span
                        style={{
                          color: accentColor,
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        ✓
                      </span>
                    )}

                    {status === 'active' && (
                      <div
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          border: '1.5px solid rgba(255,255,255,0.35)',
                          borderTopColor: '#ffffff',
                          animation:
                            'ocr-spin 0.75s linear infinite',
                        }}
                      />
                    )}

                    {status === 'pending' && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#b5c0bd',
                        }}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.4,
                      color:
                        status === 'done'
                          ? accentColor
                          : status === 'active'
                            ? '#263b37'
                            : '#b1bcba',
                      fontWeight:
                        status === 'active'
                          ? 600
                          : status === 'done'
                            ? 500
                            : 400,
                      transition:
                        'color 0.25s ease',
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress */}
          <div
            style={{
              marginTop: 22,
            }}
          >
            <div
              style={{
                width: '100%',
                height: 4,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#edf2f0',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: 10,
                  background: accentColor,
                  transition:
                    'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>

          {/* Footer status */}
          <div
            style={{
              marginTop: 13,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 10.5,
              color: '#9aa8a5',
            }}
          >
            <span>
              Please keep this window open
            </span>

            <span
              style={{
                fontWeight: 600,
                color: accentColor,
              }}
            >
              Secure verification
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoadingAnimation;

