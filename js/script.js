(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const year = document.querySelector('#year');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setTheme = (theme) => {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    if (themeIcon) themeIcon.textContent = dark ? '☀' : '☾';
    if (themeButton) {
      themeButton.setAttribute('aria-label', dark ? 'Activar modo día' : 'Activar modo noche');
      themeButton.setAttribute('aria-pressed', String(dark));
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111111' : '#f5f3ea');
  };

  let initialTheme = 'light';
  try {
    initialTheme = localStorage.getItem('efectomanu-theme') || 'light';
  } catch (_) {}
  setTheme(initialTheme);

  themeButton?.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try { localStorage.setItem('efectomanu-theme', nextTheme); } catch (_) {}
  });

  const closeMenu = () => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menú');
    nav.classList.remove('is-open');
  };

  menuButton?.addEventListener('click', () => {
    if (!nav) return;
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('is-open', open);
  });

  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!nav || !menuButton || !nav.classList.contains('is-open')) return;
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  // Resalta la página actual, incluidas las páginas de detalle y las rutas servidas desde /.
  if (nav) {
    const currentPath = window.location.pathname.replace(/\\/+$/, '') || '/';
    const isHome = currentPath === '/' || currentPath.endsWith('/index.html');
    const parentRoutes = [
      ['/proyectos/', 'proyectos.html'],
      ['/producciones/', 'producciones.html']
    ];
    let activeHref = null;

    for (const [prefix, href] of parentRoutes) {
      if (currentPath.includes(prefix)) activeHref = href;
    }
    if (!activeHref && !isHome) {
      const page = currentPath.split('/').pop();
      if (page && page.endsWith('.html')) activeHref = page;
    }

    nav.querySelectorAll('.nav-link').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const isActive = isHome
        ? href === '#inicio' || href.endsWith('/index.html')
        : activeHref
          ? href === activeHref || href.endsWith('/' + activeHref)
          : link.getAttribute('aria-current') === 'page';
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  if (year) year.textContent = new Date().getFullYear();

  // Formulario de contacto: validación y envío a la función serverless de Vercel.
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    const fileInput = contactForm.querySelector('#contact-archivos');
    const fileList = contactForm.querySelector('#contact-file-list');
    const submitButton = contactForm.querySelector('#contact-submit');
    const statusBox = contactForm.querySelector('#contact-status');
    const maxFiles = 5;
    const maxBytes = 3 * 1024 * 1024;
    const allowed = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };

    const showContactStatus = (message, type) => {
      if (!statusBox) return;
      statusBox.textContent = message;
      statusBox.className = 'contact-status is-visible is-' + type;
      statusBox.setAttribute('role', type === 'error' ? 'alert' : 'status');
      statusBox.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };

    const validateContactFiles = (files) => {
      if (files.length > maxFiles) return 'Puedes adjuntar máximo 5 archivos.';
      let total = 0;
      for (const file of files) {
        const dot = file.name.lastIndexOf('.');
        const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
        if (!allowed[ext] || (file.type && file.type !== allowed[ext])) {
          return 'Formato no permitido: ' + file.name;
        }
        total += file.size;
      }
      if (total > maxBytes) return 'Los archivos superan el límite total de 3 MB.';
      return '';
    };

    fileInput?.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      fileList?.replaceChildren();
      const error = validateContactFiles(files);
      if (error) {
        fileInput.value = '';
        showContactStatus(error, 'error');
        return;
      }
      if (statusBox) statusBox.className = 'contact-status';
      files.forEach((file) => {
        if (!fileList) return;
        const item = document.createElement('div');
        item.className = 'contact-file-item';
        const name = document.createElement('span');
        name.textContent = file.name;
        const size = document.createElement('strong');
        size.textContent = (file.size / 1024).toFixed(1) + ' KB';
        item.append(name, size);
        fileList.append(item);
      });
    });

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;
      const files = Array.from(fileInput?.files || []);
      const fileError = validateContactFiles(files);
      if (fileError) {
        showContactStatus(fileError, 'error');
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
      }
      showContactStatus('Estamos enviando tu mensaje. Espera un momento.', 'info');

      try {
        const response = await fetch('/api/enviar', {
          method: 'POST',
          body: new FormData(contactForm)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No se pudo enviar el mensaje. Inténtalo nuevamente.');
        }
        showContactStatus(result.message || 'Tu mensaje fue enviado correctamente.', 'success');
        contactForm.reset();
        fileList?.replaceChildren();
      } catch (error) {
        showContactStatus(error.message || 'Ocurrió un error al enviar el mensaje. Inténtalo nuevamente.', 'error');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = 'Enviar mensaje <span aria-hidden="true">↗</span>';
        }
      }
    });
  }

  // Controles de carrusel; respetan la preferencia de movimiento reducido del sistema.
  document.querySelectorAll('[data-carousel-prev], [data-carousel-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.carouselPrev || button.dataset.carouselNext;
      const carousel = document.getElementById(id);
      if (!carousel) return;
      const direction = button.hasAttribute('data-carousel-next') ? 1 : -1;
      const slide = carousel.querySelector('.home-slide');
      const gap = parseFloat(getComputedStyle(carousel).columnGap) || 0;
      const distance = slide ? slide.getBoundingClientRect().width + gap : carousel.clientWidth * 0.8;
      carousel.scrollBy({ left: direction * distance, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  });
})();
