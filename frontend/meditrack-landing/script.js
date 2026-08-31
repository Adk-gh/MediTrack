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