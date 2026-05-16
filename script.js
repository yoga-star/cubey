/* Cubey — Landing page interactions
   Vanilla JS, no dependencies. Ports cleanly to Wix Studio custom code.
*/

(function () {
  'use strict';

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky header state + floating CTA visibility ---------- */
  const header = document.querySelector('[data-header]');
  const floatCTA = document.querySelector('.float-cta');
  const formSection = document.getElementById('form');

  const onScroll = () => {
    const y = window.scrollY;

    if (header) {
      header.classList.toggle('scrolled', y > 8);
    }

    if (floatCTA && formSection) {
      const viewportH = window.innerHeight;
      const formTop = formSection.getBoundingClientRect().top + y;
      const showThreshold = viewportH * 0.55;
      const hideThreshold = formTop - viewportH * 0.6;
      const inRange = y > showThreshold && y < hideThreshold;
      floatCTA.classList.toggle('visible', inRange);
    }
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ---------- Fade-up reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll(
      'h2, .what-panel, .what-closing, .why-content, .why-image, .persona-card, .feedback-header, .cubey-form .field, .submit-btn'
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    revealTargets.forEach((el) => {
      el.classList.add('fade-up');
      observer.observe(el);
    });
  } else {
    // No IO: just show everything
    document.querySelectorAll('.fade-up').forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Form submission ----------
     In production (Wix Studio): replace this handler with Wix Forms
     integration. The data shape below is what gets emailed to the founder.
  ----------------------------------------- */
  const form = document.getElementById('cubey-form');
  const thankYou = document.querySelector('.thank-you');

  if (form && thankYou) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      // Validate required field(s)
      const city = form.elements.namedItem('city');
      if (city && !city.value.trim()) {
        city.focus();
        city.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashField(city);
        return;
      }

      // Optional email format check (only if user entered something)
      const emailInput = form.elements.namedItem('email');
      if (emailInput && emailInput.value && !isValidEmail(emailInput.value)) {
        emailInput.focus();
        flashField(emailInput);
        return;
      }

      // Collect data
      const data = Object.fromEntries(new FormData(form).entries());
      data.submitted_at = new Date().toISOString();
      data.user_agent = navigator.userAgent;

      // For development / demo: log + persist locally so nothing is lost
      console.log('[Cubey] feedback submission:', data);
      try {
        const key = 'cubey_submissions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(data);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (_e) { /* ignore quota */ }

      // GA4 + Meta Pixel event hooks (no-op if not loaded)
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'feedback_submitted', {
          city: data.city,
          name_reaction: data.name_reaction,
          would_try: data.try,
        });
      }
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_name: 'Cubey feedback form' });
      }

      // Show thank you
      form.style.display = 'none';
      thankYou.hidden = false;
      thankYou.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function flashField(el) {
    el.style.borderColor = 'var(--terracotta)';
    el.style.boxShadow = '0 0 0 4px rgba(201, 123, 92, 0.18)';
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow = '';
    }, 1600);
  }

  /* ---------- "What it is" slideshow ---------- */
  const slideshow = document.querySelector('[data-slideshow]');
  if (slideshow) {
    const slides = Array.from(slideshow.querySelectorAll('.what-slide'));
    const dots = Array.from(slideshow.querySelectorAll('[data-slide-go]'));
    const nextBtn = slideshow.querySelector('[data-slide-next]');
    const progressBar = slideshow.querySelector('[data-slide-progress] > *');
    const autoplayMs = parseInt(slideshow.dataset.autoplay, 10) || 3800;

    let current = 0;
    let autoTimer = null;
    let progressTimer = null;
    let progressStart = 0;

    function setActive(index) {
      const next = ((index % slides.length) + slides.length) % slides.length;
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      if (dots[current]) {
        dots[current].classList.remove('is-active');
        dots[current].setAttribute('aria-selected', 'false');
      }
      current = next;
      slides[current].classList.add('is-active');
      slides[current].setAttribute('aria-hidden', 'false');
      if (dots[current]) {
        dots[current].classList.add('is-active');
        dots[current].setAttribute('aria-selected', 'true');
      }
    }

    function resetProgress() {
      if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        // force reflow then re-enable transition
        // eslint-disable-next-line no-unused-expressions
        progressBar.offsetWidth;
        progressBar.style.transition = `width ${autoplayMs}ms linear`;
        progressBar.style.width = '100%';
      }
    }

    function startAuto() {
      stopAuto();
      progressStart = Date.now();
      resetProgress();
      autoTimer = window.setTimeout(function tick() {
        setActive(current + 1);
        resetProgress();
        autoTimer = window.setTimeout(tick, autoplayMs);
      }, autoplayMs);
    }

    function stopAuto() {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
      if (progressBar) {
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
      }
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        setActive(current + 1);
        startAuto();
      });
    }

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        setActive(i);
        startAuto();
      });
    });

    // Pause briefly while a control is focused, resume on blur
    slideshow.addEventListener('focusin', stopAuto);
    slideshow.addEventListener('focusout', startAuto);

    // Only start auto-advance when slideshow scrolls into view
    if ('IntersectionObserver' in window) {
      const visObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAuto();
            } else {
              stopAuto();
            }
          });
        },
        { threshold: 0.25 }
      );
      visObserver.observe(slideshow);
    } else {
      startAuto();
    }

    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopAuto();
    }
  }

  /* ---------- Smooth scroll polish for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

})();
