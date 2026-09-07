// ============================================
// Paribartan Foundation — homepage interactions
// Mobile nav toggle + scroll-reveal for cards/stats/stitch spine
// ============================================

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const primaryNav = document.getElementById('primaryNav');

navToggle.addEventListener('click', () => {
  const isOpen = primaryNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile nav when a link is tapped
primaryNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    primaryNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Respect reduced-motion preference for all scroll animations below
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll-reveal for cards and stats
const revealTargets = document.querySelectorAll('.reveal');

if (prefersReducedMotion) {
  revealTargets.forEach((el) => el.classList.add('in-view'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  revealTargets.forEach((el) => revealObserver.observe(el));
}

// Stitch spine: fill height based on how far the visitor has scrolled the hero
const stitchFill = document.getElementById('stitchFill');
const hero = document.querySelector('.hero');

if (stitchFill && hero) {
  if (prefersReducedMotion) {
    stitchFill.style.height = '100%';
  } else {
    const updateStitch = () => {
      const rect = hero.getBoundingClientRect();
      const heroHeight = hero.offsetHeight;
      // progress: 0 when hero top is at viewport top, 1 when hero has scrolled fully past
      const progress = Math.min(1, Math.max(0, (0 - rect.top) / heroHeight + 0.15));
      stitchFill.style.height = `${progress * 100}%`;
    };
    updateStitch();
    window.addEventListener('scroll', updateStitch, { passive: true });
    window.addEventListener('resize', updateStitch);
  }
}

// Newsletter signup — posts to the newsletter-signup Lambda once it's deployed.
// API_BASE_URL (js/config.js) is '' until then, so we detect that and show a
// friendly status instead of letting the fetch fail with a confusing error.
const newsletterForm = document.getElementById('newsletterForm');

if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('newsletterStatus');
    const email = document.getElementById('newsletterEmail').value.trim();

    if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) {
      status.textContent = 'Signup isn’t connected yet — our backend hasn’t been deployed to AWS. Check back soon!';
      status.className = 'form-status error';
      return;
    }

    const submitButton = newsletterForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    status.textContent = 'Signing you up…';
    status.className = 'form-status';

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Request failed');
      status.textContent = 'You’re on the list — thank you!';
      status.className = 'form-status success';
      newsletterForm.reset();
    } catch (err) {
      status.textContent = 'Something went wrong. Please try again in a moment.';
      status.className = 'form-status error';
    } finally {
      submitButton.disabled = false;
    }
  });
}
