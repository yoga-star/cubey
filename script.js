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

  /* ---------- Form submission (Web3Forms) ----------
     Form POSTs to https://api.web3forms.com/submit with the access_key
     hidden field. Submissions arrive in yogamn45@gmail.com inbox.
  ----------------------------------------- */
  const form = document.getElementById('cubey-form');
  const thankYou = document.querySelector('.thank-you');

  if (form && thankYou) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Optional email format check (only if user entered something)
      const emailInput = form.elements.namedItem('email');
      if (emailInput && emailInput.value && !isValidEmail(emailInput.value)) {
        emailInput.focus();
        flashField(emailInput);
        return;
      }

      const submitBtn = form.querySelector('.submit-btn');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      // Build FormData (picks up access_key, subject, from_name, botcheck)
      const formData = new FormData(form);
      formData.append('submitted_at', new Date().toISOString());
      formData.append('user_agent', navigator.userAgent);

      // Local backup in case the network call fails
      try {
        const data = Object.fromEntries(formData.entries());
        const key = 'cubey_submissions';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(data);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (_e) { /* quota — ignore */ }

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(result.message || `HTTP ${response.status}`);
        }

        // GA4 + Meta Pixel event hooks (no-op if not loaded)
        const data = Object.fromEntries(formData.entries());
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'feedback_submitted', {
            existence_reaction: data.existence_reaction,
            name_reaction: data.name_reaction,
            would_try: data.try,
          });
        }
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', { content_name: 'Cubey feedback form' });
        }

        form.style.display = 'none';
        thankYou.hidden = false;
        thankYou.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        console.error('[Cubey] submission failed:', err);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        let errorEl = form.querySelector('.form-error');
        if (!errorEl) {
          errorEl = document.createElement('p');
          errorEl.className = 'form-error';
          form.appendChild(errorEl);
        }
        errorEl.textContent = "Couldn't send right now. Please try again, or email yogamn45@gmail.com.";
      }
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

  /* ---------- Slideshows (auto-advancing carousels) ---------- */
  document.querySelectorAll('[data-slideshow]').forEach(initSlideshow);

  function initSlideshow(slideshow) {
    const slides = Array.from(slideshow.querySelectorAll('[data-slide-index]'));
    const dots = Array.from(slideshow.querySelectorAll('[data-slide-go]'));
    const nextBtn = slideshow.querySelector('[data-slide-next]');
    const progressBar = slideshow.querySelector('[data-slide-progress] > *');
    const autoplayMs = parseInt(slideshow.dataset.autoplay, 10) || 3800;

    if (!slides.length) return;

    let current = 0;
    let autoTimer = null;

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
