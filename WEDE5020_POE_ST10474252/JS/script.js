/* AACL website interactions: accessible navigation, image lightbox, filtering, FAQ, back-to-top and safe form handling. */
document.addEventListener('DOMContentLoaded', () => {
  // Highlight the current page in the main navigation.
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('header nav a').forEach(link => {
    if (link.getAttribute('href') === currentFile) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Image lightbox: skip tiny decorative images and images already inside links.
  const images = [...document.querySelectorAll('main img')].filter(img => !img.closest('a'));
  if (images.length) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Expanded image');
    overlay.hidden = true;
    overlay.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close expanded image">&times;</button><img alt=""><p class="lightbox-caption"></p>';
    document.body.appendChild(overlay);
    const largeImage = overlay.querySelector('img');
    const caption = overlay.querySelector('.lightbox-caption');
    const closeButton = overlay.querySelector('.lightbox-close');
    let lastImage = null;
    images.forEach(img => {
      img.classList.add('zoomable-image');
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `Enlarge image: ${img.alt || 'website image'}`);
      const open = () => {
        lastImage = img;
        largeImage.src = img.currentSrc || img.src;
        largeImage.alt = img.alt || '';
        caption.textContent = img.alt || '';
        overlay.hidden = false;
        document.body.classList.add('lightbox-open');
        closeButton.focus();
      };
      img.addEventListener('click', open);
      img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    const close = () => { overlay.hidden = true; document.body.classList.remove('lightbox-open'); if (lastImage) lastImage.focus(); };
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });
  }

  // Back-to-top button appears after scrolling.
  const topButton = document.createElement('button');
  topButton.type = 'button';
  topButton.className = 'back-to-top';
  topButton.textContent = '↑ Top';
  topButton.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(topButton);
  const updateTopButton = () => topButton.classList.toggle('visible', window.scrollY > 350);
  window.addEventListener('scroll', updateTopButton, { passive: true });
  updateTopButton();
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Filter service cards live as the user types.
  const search = document.querySelector('#service-search');
  if (search) {
    const cards = [...document.querySelectorAll('.service-card')];
    const status = document.querySelector('#service-results');
    const filter = () => {
      const term = search.value.trim().toLocaleLowerCase();
      let count = 0;
      cards.forEach(card => {
        const matches = card.textContent.toLocaleLowerCase().includes(term);
        card.hidden = !matches;
        if (matches) count++;
      });
      status.textContent = `Showing ${count} of ${cards.length} services.`;
    };
    search.addEventListener('input', filter);
  }

  // Accessible FAQ accordion.
  document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      const answer = button.closest('.faq-item').querySelector('.faq-answer');
      answer.hidden = expanded;
    });
  });

  // Validate and submit forms only after an endpoint has been configured.
  // A blank action is intentional: this prevents falsely claiming that a message was sent.
  document.querySelectorAll('form[data-ajax-form]').forEach(form => {
    const status = form.querySelector('[data-form-status]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.className = 'form-status';
      status.textContent = '';
      if (!form.reportValidity()) return;
      const honeypot = form.querySelector('input[name="_gotcha"]');
      if (honeypot && honeypot.value.trim()) {
        status.textContent = 'Your message could not be submitted.';
        status.classList.add('error');
        return;
      }
      const endpoint = form.getAttribute('action')?.trim();
      if (!endpoint || endpoint === '#' || !/^https:\/\//i.test(endpoint)) {
        status.textContent = 'The form is ready for testing, but online delivery is not configured yet. Add your verified form-service endpoint to this form’s action attribute before publishing.';
        status.classList.add('error');
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      const originalText = submit ? submit.textContent : '';
      if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }
      status.textContent = 'Sending your message…';
      try {
        const response = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('The form service returned an error.');
        form.reset();
        status.textContent = 'Thank you. Your message was submitted successfully.';
        status.classList.add('success');
      } catch (error) {
        status.textContent = 'Sorry, your message could not be sent. Check your connection or try again later.';
        status.classList.add('error');
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = originalText; }
      }
    });
    form.addEventListener('reset', () => { if (status) { status.textContent = ''; status.className = 'form-status'; } });
  });
});
