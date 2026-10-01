    const header = document.getElementById('siteHeader');
    const year = document.getElementById('year');

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    // Header scroll effect
    window.addEventListener(
      'scroll',
      () => {
        header?.classList.toggle('scrolled', window.scrollY > 24);
      },
      { passive: true }
    );

    // Reveal animation
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
      }
    );

    document
      .querySelectorAll('.reveal')
      .forEach((el) => observer.observe(el));

    // ─────────────────────────────────────────────
    // Role Tabs
    // ─────────────────────────────────────────────

    const roleData = {
      student: {
        label: 'PATIENT EXPERIENCE',
        title: 'Your health services in one familiar place.',
        text:
          'Manage your profile, request appointments, open consultations, receive notifications, and access approved health records from any device.',
        link: 'Explore the patient portal',
      },

      clinic: {
        label: 'CLINIC WORKSPACE',
        title: 'A focused view of every request and patient.',
        text:
          'Review appointments, manage consultations, document medical and dental findings, publish updates, and coordinate care without switching systems.',
        link: 'Explore clinic workflows',
      },

      admin: {
        label: 'ADMINISTRATION & INSIGHT',
        title: 'Oversight that supports care instead of slowing it down.',
        text:
          'Manage users, system configuration, announcements, reports, archives, audit activity, and secure storage from one administrative workspace.',
        link: 'Explore administration',
      },
    };

    const rolePanel = document.getElementById('rolePanel');

    document.querySelectorAll('.role-tab').forEach((button) => {
      button.addEventListener('click', () => {
        const data = roleData[button.dataset.role];

        document.querySelectorAll('.role-tab').forEach((tab) => {
          tab.classList.toggle('active', tab === button);
        });

        rolePanel?.animate(
          [
            {
              opacity: 0.45,
              transform: 'translateY(8px)',
            },
            {
              opacity: 1,
              transform: 'translateY(0)',
            },
          ],
          {
            duration: 280,
            easing: 'ease-out',
          }
        );

        document.getElementById('roleLabel').textContent = data.label;
        document.getElementById('roleTitle').textContent = data.title;
        document.getElementById('roleText').textContent = data.text;

        const link = rolePanel.querySelector('.role-panel-copy a');
        if (link) {
          link.childNodes[0].nodeValue = `${data.link} `;
        }
      });
    });

    // ─────────────────────────────────────────────
    // Dynamic appointment calendar
    // ─────────────────────────────────────────────

    (() => {
      const calendar = document.querySelector('.calendar-mini');
      if (!calendar) return;

      const monthLabel = calendar.querySelector('.calendar-head b');
      const calendarGrid = calendar.querySelector('.calendar-grid');

      if (!monthLabel || !calendarGrid) return;

      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      // Keep the original two-row calendar design.
      // Start on Monday of the current week so today's
      // date is always visible and can be highlighted.
      const mondayOffset = (today.getDay() + 6) % 7;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - mondayOffset);

      monthLabel.textContent = today.toLocaleDateString(undefined, {
        month: 'long',
      });

      // Keep dates from another month visually subtle.
      const outsideStyle = document.createElement('style');
      outsideStyle.textContent = `
        .calendar-grid .calendar-day--outside {
          color: #b4c2bd;
          opacity: .55;
        }
      `;
      document.head.appendChild(outsideStyle);

      calendarGrid.innerHTML = '';

      for (let i = 0; i < 14; i += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const cell = document.createElement('i');
        cell.textContent = date.getDate();

        if (date.getMonth() !== today.getMonth()) {
          cell.classList.add('calendar-day--outside');
        }

        if (date.getTime() === today.getTime()) {
          cell.classList.add('selected');
          cell.setAttribute('aria-current', 'date');
        }

        calendarGrid.appendChild(cell);
      }
    })();

    // ─────────────────────────────────────────────
    // Smooth scrolling for anchor links
    // ─────────────────────────────────────────────

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));

        if (!target) return;

        e.preventDefault();

        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });

    // ─────────────────────────────────────────────
    // Download section hover animation
    // ─────────────────────────────────────────────

    document.querySelectorAll('.download-buttons a').forEach((button) => {
      button.addEventListener('mouseenter', () => {
        button.animate(
          [
            {
              transform: 'translateY(0)',
            },
            {
              transform: 'translateY(-2px)',
            },
          ],
          {
            duration: 180,
            fill: 'forwards',
          }
        );
      });

      button.addEventListener('mouseleave', () => {
        button.animate(
          [
            {
              transform: 'translateY(-2px)',
            },
            {
              transform: 'translateY(0)',
            },
          ],
          {
            duration: 180,
            fill: 'forwards',
          }
        );
      });
    });


    /* ═══════════════════════════════════════════════════════════════════════
       MediTrack — logo swap
       Click a logo → it animates and turns into the other logo (logo1 ⇄ logo2).

         • Header logo (nav bar)       → spin + shrink, then settle
         • Hero preview window logo    → 3D flip
         • Security section big logo   → full 360° spin with a bounce
       ═══════════════════════════════════════════════════════════════════════ */
    (() => {
      'use strict';

      const LOGO_A = './logo1.png';
      const LOGO_B = './logo2.png';

      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const EASE_IN = 'cubic-bezier(.55,0,1,.45)';
      const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

      // Preload both logos so the swap never flashes
      [LOGO_A, LOGO_B].forEach((src) => {
        const img = new Image();
        img.src = src;
      });

      // Pointer cursor on the clickable logos
      const style = document.createElement('style');
      style.textContent = `
        .logo-swap-target{cursor:pointer;-webkit-tap-highlight-color:transparent;will-change:transform}
        .logo-swap-target:hover{filter:brightness(1.06)}
        /* The security ring's decorative ::before/::after circles sit on top of the logo
           and swallow the click, so let clicks pass through them and lift the logo above */
        .lock-ring::before,.lock-ring::after{pointer-events:none}
        .lock-ring img{position:relative;z-index:2}
      `;
      document.head.appendChild(style);

      /*
        Each effect describes the two halves of the animation:
          out: [from, to]  – logo leaves (before the image swaps)
          in:  [from, to]  – new logo arrives (after the image swaps)
      */
      const EFFECTS = {
        // Header: spin away while shrinking, come back spinning into place
        spin: {
          duration: 640,
          out: ['rotate(0deg) scale(1)', 'rotate(180deg) scale(.4)'],
          in: ['rotate(-180deg) scale(.4)', 'rotate(0deg) scale(1)'],
        },
        // Hero: classic card flip around the Y axis
        flip: {
          duration: 700,
          out: ['perspective(500px) rotateY(0deg)', 'perspective(500px) rotateY(90deg)'],
          in: ['perspective(500px) rotateY(-90deg)', 'perspective(500px) rotateY(0deg)'],
        },
        // Security: big spin with a pop
        spinBig: {
          duration: 900,
          out: ['rotate(0deg) scale(1)', 'rotate(180deg) scale(.55)'],
          in: ['rotate(180deg) scale(.55)', 'rotate(360deg) scale(1)'],
        },
      };

      const setupLogo = (img, effectName) => {
        if (!img) return;
        const fx = EFFECTS[effectName];
        let busy = false;

        img.classList.add('logo-swap-target');
        img.dataset.logo = 'a';

        const swapSrc = () => {
          const next = img.dataset.logo === 'a' ? 'b' : 'a';
          img.src = next === 'a' ? LOGO_A : LOGO_B;
          img.dataset.logo = next;
        };

        img.addEventListener('click', (e) => {
          // The header logo sits inside <a href="#home">; keep the click for the logo only
          e.preventDefault();
          e.stopPropagation();

          if (busy) return;

          if (reduceMotion) {
            swapSrc();
            return;
          }

          busy = true;
          const half = fx.duration / 2;

          const outAnim = img.animate(
            [{ transform: fx.out[0] }, { transform: fx.out[1] }],
            { duration: half, easing: EASE_IN, fill: 'forwards' }
          );

          outAnim.onfinish = () => {
            swapSrc();

            const inAnim = img.animate(
              [{ transform: fx.in[0] }, { transform: fx.in[1] }],
              { duration: half, easing: EASE_OUT }
            );

            inAnim.onfinish = () => {
              outAnim.cancel();
              busy = false;
            };
            inAnim.oncancel = () => {
              outAnim.cancel();
              busy = false;
            };
          };
        });
      };

      // 1. Header logo (nav bar)
      setupLogo(document.querySelector('.site-header .brand img'), 'spin');

      // 2. Hero section logo (inside the preview window) — flip
      setupLogo(document.querySelector('.hero .app-brand img'), 'flip');

      // 3. Big logo in the security section
      setupLogo(document.querySelector('.security .lock-ring img'), 'spinBig');
    })();


    /* ═══════════════════════════════════════════════════════════════════════
       MediTrack — motion layer
       Does nothing unless <html> has the `anim` class
       (added in <head> only when the visitor hasn't requested reduced motion).
       ═══════════════════════════════════════════════════════════════════════ */
    (() => {
      'use strict';

      const root = document.documentElement;
      if (!root.classList.contains('anim')) return;
      window.__animReady = true; // tells the <head> failsafe that this file loaded

      const $ = (s, c = document) => c.querySelector(s);
      const $$ = (s, c = document) => [...c.querySelectorAll(s)];
      const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
      const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
      const EASE = 'cubic-bezier(.16,1,.3,1)';

      // Each feature is isolated so one failure never blocks the rest.
      const run = (fn) => {
        try { fn(); } catch (err) { console.warn('[motion]', err); }
      };

      const index = (list) => list.forEach((el, i) => el.style.setProperty('--i', i));

      const watch = (els, fn, opts = {}) => {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                fn(e.target);
                io.unobserve(e.target);
              }
            });
          },
          { threshold: 0.15, rootMargin: '0px 0px -6% 0px', ...opts }
        );
        els.forEach((el) => io.observe(el));
      };

      /* ── 1. Headlines: split into words for the masked reveal ─────────── */
      const splitWords = (el) => {
        el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
        let n = 0;
        const walk = (node) => {
          [...node.childNodes].forEach((child) => {
            if (child.nodeType === 3) {
              const frag = document.createDocumentFragment();
              child.textContent.split(/(\s+)/).forEach((part) => {
                if (!part) return;
                if (/^\s+$/.test(part)) {
                  frag.appendChild(document.createTextNode(' '));
                  return;
                }
                const w = document.createElement('span');
                w.className = 'w';
                w.setAttribute('aria-hidden', 'true');
                const wi = document.createElement('span');
                wi.className = 'wi';
                wi.style.setProperty('--wi', n++);
                wi.textContent = part;
                w.appendChild(wi);
                frag.appendChild(w);
              });
              child.replaceWith(frag);
            } else if (child.nodeType === 1) {
              walk(child);
            }
          });
        };
        walk(el);
        el.classList.add('split');
      };

      run(() => {
        const hero = $('.hero h1');
        if (hero) {
          splitWords(hero);
          requestAnimationFrame(() => setTimeout(() => hero.classList.add('in'), 260));
        }

        const others = $$('.section-intro h2, .journey h2, .security h2, .final-cta h2, .download-content h2');
        others.forEach(splitWords);
        watch(others, (el) => el.classList.add('in'), { threshold: 0.3 });
      });

      /* ── 2. Scroll-in helpers (.rise = single element, .stagger = children) */
      run(() => {
        const rise = [
          ['.section-kicker', 0],
          ['.section-intro > p', 320],
          ['.journey-copy p', 260],
          ['.role-tabs', 180],
          ['.security-copy > p', 320],
          ['.download-content > p', 260],
          ['.download-note', 300],
          ['.download-preview', 180],
          ['.cta-card > div > span', 0],
        ];
        const els = [];
        rise.forEach(([sel, delay]) => {
          $$(sel).forEach((el) => {
            el.classList.add('rise');
            el.style.setProperty('--d', `${delay}ms`);
            els.push(el);
          });
        });
        watch(els, (el) => el.classList.add('in'));

        const groups = $$('.campus-strip, .security-pills, .cta-actions, .download-buttons');
        groups.forEach((g) => {
          g.classList.add('stagger');
          index([...g.children]);
        });
        watch(groups, (el) => el.classList.add('in'), { threshold: 0.25 });
      });

      /* ── 3. Choreography indices for card internals ───────────────────── */
      run(() => {
        $$('.card-copy').forEach((c) => index([...c.children]));
        $$('.record-stack').forEach((c) => index([...c.children]));
        $$('.calendar-grid').forEach((c) => index([...c.children]));
        $$('.chat-preview').forEach((c) => index([...c.children]));
        $$('.spark-chart').forEach((c) => index([...c.children]));
        index($$('.actual-sidebar .actual-nav'));
        index($$('.avatar-stack span'));
        $$('.journey-steps').forEach((c) => index([...c.children]));
      });

      /* ── 4. Scroll progress bar + journey steps tied to scroll ────────── */
      run(() => {
        const bar = document.createElement('div');
        bar.className = 'scroll-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.prepend(bar);

        const wrap = $('.journey-steps');
        const steps = wrap ? $$('.journey-step', wrap) : [];
        if (wrap) watch([wrap], (el) => el.classList.add('in'), { threshold: 0.2 });

        let current = -1;
        const update = () => {
          const max = document.documentElement.scrollHeight - innerHeight;
          bar.style.setProperty('--sp', max > 0 ? clamp(scrollY / max, 0, 1).toFixed(4) : 0);

          if (steps.length) {
            const r = wrap.getBoundingClientRect();
            const p = clamp((innerHeight * 0.7 - r.top) / (r.height * 0.9), 0, 1);
            const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
            if (idx !== current) {
              current = idx;
              steps.forEach((s, i) => s.classList.toggle('active', i === idx));
            }
          }
        };

        let ticking = false;
        const onScroll = () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            update();
            ticking = false;
          });
        };
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('resize', onScroll);
        update();
      });

      /* ── 5. Highlight the nav link of the section in view ─────────────── */
      run(() => {
        const links = $$('.site-nav a[href^="#"]');
        const map = new Map();
        links.forEach((a) => {
          const sec = $(a.getAttribute('href'));
          if (sec) map.set(sec, a);
        });
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              links.forEach((a) => a.classList.toggle('is-active', a === map.get(e.target)));
            });
          },
          { rootMargin: '-45% 0px -50% 0px' }
        );
        map.forEach((_, sec) => io.observe(sec));

        // clear the highlight once we're back at the top
        addEventListener(
          'scroll',
          () => {
            if (scrollY < 200) links.forEach((a) => a.classList.remove('is-active'));
          },
          { passive: true }
        );
      });

      /* ── 6. Role tabs: sliding indicator + content swap ───────────────── */
      run(() => {
        const tabs = $('.role-tabs');
        if (!tabs) return;

        const ind = document.createElement('span');
        ind.className = 'tab-indicator';
        ind.setAttribute('aria-hidden', 'true');
        tabs.prepend(ind);
        tabs.classList.add('has-indicator');

        const place = (animate) => {
          const active = $('.role-tab.active', tabs);
          if (!active) return;
          if (!animate) ind.style.transition = 'none';
          ind.style.width = `${active.offsetWidth}px`;
          ind.style.height = `${active.offsetHeight}px`;
          ind.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
          if (!animate) {
            void ind.offsetWidth; // flush so the next change animates
            ind.style.transition = '';
          }
        };

        place(false);
        addEventListener('resize', () => place(false));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(false));

        const panel = $('#rolePanel');
        $$('.role-tab', tabs).forEach((tab) => {
          tab.addEventListener('click', () => {
            requestAnimationFrame(() => {
              place(true);
              if (!panel) return;

              const copy = $$('.role-panel-copy > *', panel);
              const rows = $$('.portal-card > *', panel);

              copy.forEach((el, i) =>
                el.animate(
                  [
                    { opacity: 0, transform: 'translateY(16px)', filter: 'blur(5px)' },
                    { opacity: 1, transform: 'none', filter: 'blur(0)' },
                  ],
                  { duration: 720, delay: i * 70, easing: EASE, fill: 'backwards' }
                )
              );
              rows.forEach((el, i) =>
                el.animate(
                  [
                    { opacity: 0, transform: 'translateX(22px)' },
                    { opacity: 1, transform: 'none' },
                  ],
                  { duration: 700, delay: 120 + i * 80, easing: EASE, fill: 'backwards' }
                )
              );
            });
          });
        });
      });

      /* ── 7. Pointer effects (fine pointers only) ──────────────────────── */
      run(() => {
        if (!fine) return;

        // Hero: gentle parallax between window and orbits
        const hero = $('.hero');
        const art = $('.hero-art');
        if (hero && art) {
          let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
          const loop = () => {
            x += (tx - x) * 0.08;
            y += (ty - y) * 0.08;
            art.style.setProperty('--px', x.toFixed(3));
            art.style.setProperty('--py', y.toFixed(3));
            raf = Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002 ? requestAnimationFrame(loop) : 0;
          };
          const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

          hero.addEventListener('pointermove', (e) => {
            const r = art.getBoundingClientRect();
            tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
            ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
            kick();
          });
          hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
        }

        // Bento cards: soft spotlight that follows the cursor
        $$('.bento-card').forEach((card) => {
          card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
          });
        });

        // Main buttons: slight magnetic pull
        $$('.primary-button, .cta-primary, .pill-button').forEach((btn) => {
          btn.addEventListener('pointermove', (e) => {
            const r = btn.getBoundingClientRect();
            const dx = (e.clientX - r.left - r.width / 2) * 0.18;
            const dy = (e.clientY - r.top - r.height / 2) * 0.28;
            btn.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
          });
          btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
        });
      });
    })();
