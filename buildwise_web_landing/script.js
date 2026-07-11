// ─── BuildWise AI — Landing Page Scripts ───

// ── Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ── Mobile hamburger menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  hamburger.textContent = mobileMenu.classList.contains('open') ? '✕' : '☰';
});
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    hamburger.textContent = '☰';
  });
});

// ── Dark/Light theme toggle
const themeBtn = document.getElementById('themeToggle');
const body = document.body;

// Restore saved theme
const savedTheme = localStorage.getItem('bw-theme') || 'dark';
body.className = savedTheme;
themeBtn.textContent = savedTheme === 'dark' ? '☀' : '☽';

themeBtn.addEventListener('click', () => {
  const isDark = body.classList.contains('dark');
  body.className = isDark ? 'light' : 'dark';
  themeBtn.textContent = isDark ? '☽' : '☀';
  localStorage.setItem('bw-theme', isDark ? 'light' : 'dark');
});

// ── Pricing billing toggle
const billingToggle = document.getElementById('billingToggle');
const billingMonthly = document.getElementById('billingMonthly');
const billingAnnual = document.getElementById('billingAnnual');
const priceAmounts = document.querySelectorAll('.price-amount');

billingToggle.addEventListener('change', () => {
  const isAnnual = billingToggle.checked;
  billingMonthly.classList.toggle('active', !isAnnual);
  billingAnnual.classList.toggle('active', isAnnual);
  priceAmounts.forEach(el => {
    const value = isAnnual ? el.dataset.annual : el.dataset.monthly;
    // Animate counter
    animateCounter(el, parseInt(value.replace(',', '')));
  });
});

function animateCounter(el, target) {
  const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
  const duration = 500;
  const step = (timestamp) => {
    if (!start) {
      el.textContent = target === 0 ? '0' : target.toLocaleString('en-IN');
      return;
    }
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = current.toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(step);
  };
  let startTime;
  requestAnimationFrame((ts) => { startTime = ts; step(ts); });
}

// ── Scroll animations (IntersectionObserver)
const observerOptions = {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
};
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      // Stagger delay for grid children
      const siblings = entry.target.parentElement.querySelectorAll('[data-aos]');
      let delay = 0;
      siblings.forEach((sib, i) => {
        if (sib === entry.target) delay = i * 80;
      });
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));

// ── Smooth active nav link highlighting
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${entry.target.id}`) {
          link.style.color = 'var(--violet-400)';
        }
      });
    }
  });
}, { threshold: 0.5 });
sections.forEach(section => sectionObserver.observe(section));

// ── Mock dashboard sidebar interactive
document.querySelectorAll('.mock-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.mock-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// ── Number count-up on stats when hero is visible
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-number').forEach(stat => {
        const text = stat.textContent;
        const numMatch = text.match(/[\d,]+/);
        if (numMatch) {
          const target = parseInt(numMatch[0].replace(',', ''));
          const suffix = text.replace(/[\d,]+/, '');
          let start = 0;
          const duration = 1200;
          const startTime = performance.now();
          const step = (timestamp) => {
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (target - start) * eased);
            stat.textContent = current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);
