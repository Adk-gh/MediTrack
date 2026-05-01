import React, { useEffect, useRef } from "react";

const styles = `
  @keyframes dot-blink {
    0%,80%,100% { opacity:0.2; transform:scale(0.8); }
    40%          { opacity:1;   transform:scale(1); }
  }
  .mt-overlay {
    position:fixed; inset:0;
    background:rgba(255,255,255,0.92);
    backdrop-filter:blur(4px);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    z-index:9999;
  }
  .mt-overlay.dark { background:rgba(74,103,98,0.95); }
  .mt-inline {
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    padding:48px;
  }
  .mt-label {
    font-family:'Georgia',serif; font-size:13px;
    letter-spacing:0.13em; text-transform:uppercase;
    color:#4a6762; display:flex; align-items:center;
    gap:4px; margin-top:18px;
    opacity:0; transition:opacity 0.6s ease;
  }
  .mt-label.on { opacity:1; }
  .dark .mt-label { color:rgba(255,255,255,0.8); }
  .size-sm .mt-label { font-size:11px; }
  .size-lg .mt-label { font-size:15px; }
  .mt-dot {
    width:4px; height:4px; border-radius:50%;
    background:currentColor; display:inline-block;
    animation:dot-blink 1.4s ease-in-out infinite both;
  }
  .mt-dot:nth-child(2){animation-delay:.22s}
  .mt-dot:nth-child(3){animation-delay:.44s}
`;

const TEA = '#4a6762';
const LID_DARK = '#2e4440';
const WHITE = '#ffffff';

function easeInOut(x) { return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2; }
function easeOut(x)   { return 1 - Math.pow(1-x, 3); }
function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }

function drawJar(ctx, cx, cy, lidAngle, lidOff, alpha = 1) {
  const jw=92, jh=104, jx=cx-jw/2, jy=cy-24;
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.roundRect(jx, jy+10, jw, jh, [0,0,18,18]);
  ctx.fillStyle = 'rgba(74,103,98,0.12)';
  ctx.fill();
  ctx.strokeStyle = TEA; ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(jx+3, jy+13, 16, jh-6, [0,0,8,8]);
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.fill();

  ctx.fillStyle = TEA;
  ctx.beginPath();
  ctx.roundRect(jx, jy, jw, 10, [3,3,0,0]);
  ctx.fill();

  ctx.translate(cx, jy+1);
  ctx.rotate(lidAngle);
  ctx.translate(0, lidOff);
  ctx.fillStyle = LID_DARK;
  ctx.beginPath();
  ctx.roundRect(-38, -20, 76, 20, [5,5,0,0]);
  ctx.fill();
  ctx.fillStyle = '#1f332f';
  ctx.beginPath();
  ctx.roundRect(-41, -3, 82, 5, 2);
  ctx.fill();

  ctx.restore();
}

function drawCapsule(ctx, x, y, w, h, angle, topColor, botColor, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  const r = w/2;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, r);
  ctx.strokeStyle = TEA; ctx.lineWidth = 2; ctx.stroke();
  ctx.clip();
  ctx.fillStyle = topColor; ctx.fillRect(-w/2, -h/2, w, h/2);
  ctx.fillStyle = botColor; ctx.fillRect(-w/2, 0,    w, h/2);
  ctx.restore();
  ctx.restore();
}

function drawHalfPill(ctx, x, y, w, h, angle, color, isTop, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  const r = w/2;
  ctx.save();
  ctx.beginPath();
  if (isTop) {
    ctx.moveTo(-w/2, 1);
    ctx.lineTo(-w/2, -h/2+r);
    ctx.quadraticCurveTo(-w/2, -h/2, -w/2+r, -h/2);
    ctx.lineTo(w/2-r, -h/2);
    ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2+r);
    ctx.lineTo(w/2, 1);
    ctx.closePath();
  } else {
    ctx.moveTo(-w/2, -1);
    ctx.lineTo(-w/2, h/2-r);
    ctx.quadraticCurveTo(-w/2, h/2, -w/2+r, h/2);
    ctx.lineTo(w/2-r, h/2);
    ctx.quadraticCurveTo(w/2, h/2, w/2, h/2-r);
    ctx.lineTo(w/2, -1);
    ctx.closePath();
  }
  ctx.strokeStyle = TEA; ctx.lineWidth = 2; ctx.stroke();
  ctx.clip();
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
  ctx.restore();
}

/**
 * MediTrack Loading Component
 *
 * Animation sequence:
 *  1. Jar with two whole capsules inside
 *  2. Lid swings open
 *  3. Capsules pour up and out
 *  4. Jar fades away
 *  5. Each capsule splits into its two halves — they drift apart
 *  6. Halves reform into an elliptical orbit, spinning forever
 *
 * Props:
 *   variant   "overlay" | "inline"    default: "overlay"
 *   theme     "light"   | "dark"      default: "light"
 *   size      "sm" | "md" | "lg"      default: "md"
 *   label     string                  default: "Loading"
 *   showLabel boolean                 default: true
 *
 * Usage:
 *   <Loading />
 *   <Loading variant="inline" size="sm" showLabel={false} />
 *   <Loading theme="dark" label="Saving" />
 */
const Loading = ({
  variant   = "overlay",
  theme     = "light",
  size      = "md",
  label     = "Loading",
  showLabel = true,
}) => {
  const canvasRef = useRef(null);
  const labelRef  = useRef(null);
  const rafRef    = useRef(null);

  const canvasSize = size === 'sm' ? 180 : size === 'lg' ? 340 : 260;

  useEffect(() => {
    const cv  = canvasRef.current;
    const ctx = cv.getContext('2d');
    const S   = canvasSize;
    const CX  = S / 2, CY = S / 2;
    const scale = S / 260;

    const W = 22 * scale, H = 46 * scale;

    let phase   = 'jar';
    let t       = 0;
    let lidAngle = 0, lidOff = 0, jarAlpha = 1;
    let c1 = { x: CX-13*scale, y: CY+44*scale, a: 0.18 };
    let c2 = { x: CX+15*scale, y: CY+46*scale, a: -0.48 };
    let pour1 = { ...c1 }, pour2 = { ...c2 };
    let sep1  = { x:0,y:0,a:0 }, sep2 = { x:0,y:0,a:0 };
    let orbitA = 0;

    const DUR = { jar:60, lidOpen:40, pour:55, fade:28, separate:60, reform:75 };

    function next() {
      t = 0;
      const order = ['jar','lidOpen','pour','fade','separate','reform','orbit'];
      phase = order[order.indexOf(phase) + 1] || 'orbit';
    }

    function frame() {
      ctx.clearRect(0, 0, S, S);
      t++;
      const p = (dur) => clamp(t / dur, 0, 1);

      if (phase === 'jar') {
        drawJar(ctx, CX, CY, 0, 0, 1);
        drawCapsule(ctx, c1.x, c1.y, W, H, c1.a, TEA, WHITE);
        drawCapsule(ctx, c2.x, c2.y, W, H, c2.a, WHITE, TEA);
        if (t > DUR.jar) next();
      }

      else if (phase === 'lidOpen') {
        const v = easeOut(p(DUR.lidOpen));
        lidAngle = -0.72 * v;
        lidOff   = -10   * v * scale;
        drawJar(ctx, CX, CY, lidAngle, lidOff, 1);
        drawCapsule(ctx, c1.x, c1.y, W, H, c1.a, TEA, WHITE);
        drawCapsule(ctx, c2.x, c2.y, W, H, c2.a, WHITE, TEA);
        if (t > DUR.lidOpen) next();
      }

      else if (phase === 'pour') {
        const v = easeInOut(p(DUR.pour));
        drawJar(ctx, CX, CY, lidAngle, lidOff, 1);
        const ny1 = c1.y - 95*scale*v, na1 = c1.a - 1.5*v;
        const nx2 = c2.x + 75*scale*v, ny2 = c2.y - 80*scale*v, na2 = c2.a + 2.2*v;
        pour1 = { x: c1.x, y: ny1, a: na1 };
        pour2 = { x: nx2,  y: ny2, a: na2 };
        drawCapsule(ctx, pour1.x, pour1.y, W, H, pour1.a, TEA, WHITE);
        drawCapsule(ctx, pour2.x, pour2.y, W, H, pour2.a, WHITE, TEA);
        if (t > DUR.pour) next();
      }

      else if (phase === 'fade') {
        const v = easeOut(p(DUR.fade));
        drawJar(ctx, CX, CY, lidAngle, lidOff, 1 - v);
        drawCapsule(ctx, pour1.x, pour1.y, W, H, pour1.a, TEA, WHITE);
        drawCapsule(ctx, pour2.x, pour2.y, W, H, pour2.a, WHITE, TEA);
        if (t > DUR.fade) next();
      }

      else if (phase === 'separate') {
        const v = easeInOut(p(DUR.separate));
        const tx1 = CX - 28*scale, ty1 = CY - 8*scale;
        const tx2 = CX + 28*scale, ty2 = CY + 8*scale;
        const x1 = pour1.x + (tx1-pour1.x)*v, y1 = pour1.y + (ty1-pour1.y)*v;
        const a1 = pour1.a + (Math.PI/2 - pour1.a)*v;
        const x2 = pour2.x + (tx2-pour2.x)*v, y2 = pour2.y + (ty2-pour2.y)*v;
        const a2 = pour2.a + (-Math.PI/4 - pour2.a)*v;
        const gap = 9 * scale * v;
        sep1 = { x:x1, y:y1, a:a1 };
        sep2 = { x:x2, y:y2, a:a2 };
        drawHalfPill(ctx, x1, y1 - gap, W, H, a1, TEA,  true);
        drawHalfPill(ctx, x1, y1 + gap, W, H, a1, WHITE, false);
        drawHalfPill(ctx, x2, y2 - gap, W, H, a2, WHITE, true);
        drawHalfPill(ctx, x2, y2 + gap, W, H, a2, TEA,  false);
        if (t > DUR.separate) {
          if (labelRef.current) labelRef.current.classList.add('on');
          next();
        }
      }

      else if (phase === 'reform') {
        const v = easeInOut(p(DUR.reform));
        const orR = 30 * scale;
        const tx1 = CX + orR*Math.cos(Math.PI),   ty1 = CY + orR*Math.sin(Math.PI)*0.5;
        const tx2 = CX + orR*Math.cos(0),          ty2 = CY + orR*Math.sin(0)*0.5;
        const x1 = sep1.x + (tx1-sep1.x)*v, y1 = sep1.y + (ty1-sep1.y)*v;
        const x2 = sep2.x + (tx2-sep2.x)*v, y2 = sep2.y + (ty2-sep2.y)*v;
        const a1 = sep1.a + (Math.PI/2  - sep1.a)*v;
        const a2 = sep2.a + (-Math.PI/4 - sep2.a)*v;
        const sc = 1 + Math.sin(v * Math.PI) * 0.16;
        ctx.save(); ctx.translate(CX,CY); ctx.scale(sc,sc); ctx.translate(-CX,-CY);
        drawHalfPill(ctx, x1, y1, W, H, a1, TEA,  true);
        drawHalfPill(ctx, x1, y1, W, H, a1, WHITE, false);
        drawHalfPill(ctx, x2, y2, W, H, a2, WHITE, true);
        drawHalfPill(ctx, x2, y2, W, H, a2, TEA,  false);
        ctx.restore();
        orbitA = Math.atan2(ty1-CY, tx1-CX);
        if (t > DUR.reform) next();
      }

      else if (phase === 'orbit') {
        orbitA += 0.019;
        const orR   = 30 * scale;
        const pulse = 1 + Math.sin(orbitA * 1.6) * 0.032;
        ctx.save(); ctx.translate(CX,CY); ctx.scale(pulse,pulse); ctx.translate(-CX,-CY);
        const x1 = CX + orR*Math.cos(orbitA),           y1 = CY + orR*Math.sin(orbitA)*0.52;
        const x2 = CX + orR*Math.cos(orbitA + Math.PI), y2 = CY + orR*Math.sin(orbitA + Math.PI)*0.52;
        const a1 = Math.PI/2  + orbitA*0.35;
        const a2 = -Math.PI/4 + orbitA*0.35;
        drawHalfPill(ctx, x1, y1, W, H, a1, TEA,  true);
        drawHalfPill(ctx, x1, y1, W, H, a1, WHITE, false);
        drawHalfPill(ctx, x2, y2, W, H, a2, WHITE, true);
        drawHalfPill(ctx, x2, y2, W, H, a2, TEA,  false);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasSize]);

  const containerClass = [
    variant === 'overlay' ? 'mt-overlay' : 'mt-inline',
    theme === 'dark'  ? 'dark'    : '',
    size   === 'sm'   ? 'size-sm' : size === 'lg' ? 'size-lg' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <style>{styles}</style>
      <div className={containerClass} role="status" aria-label={label}>
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          style={{ display: 'block' }}
        />
        {showLabel && (
          <span className="mt-label" ref={labelRef}>
            {label}
            <span className="mt-dot" />
            <span className="mt-dot" />
            <span className="mt-dot" />
          </span>
        )}
      </div>
    </>
  );
};

export default Loading;