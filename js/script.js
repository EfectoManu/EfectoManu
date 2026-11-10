(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const year = document.querySelector('#year');
  const setTheme = (theme) => {
    root.dataset.theme = theme;
    const dark = theme === 'dark';
    themeIcon.textContent = dark ? '☀' : '☾';
    themeButton.setAttribute('aria-label', dark ? 'Activar modo día' : 'Activar modo noche');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#111111' : '#f5f3ea');
  };
  let initialTheme = 'light';
  try { initialTheme = localStorage.getItem('efectomanu-theme') || 'light'; } catch (_) {}
  setTheme(initialTheme);
  themeButton.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try { localStorage.setItem('efectomanu-theme', nextTheme); } catch (_) {}
  });
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menú');
    });
  });

  // Mientras el sitio sea una página única, Inicio permanece como opción activa.
  // Los enlaces del menú siguen desplazándose a sus respectivas secciones.
  nav.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('aria-current') === 'page' || link.getAttribute('href') === '#inicio');
  });

  year.textContent = new Date().getFullYear();

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
      statusBox.textContent = message;
      statusBox.className = 'contact-status is-visible is-' + type;
    };

    const validateContactFiles = (files) => {
      if (files.length > maxFiles) return 'Puedes adjuntar máximo 5 archivos.';
      let total = 0;
      for (const file of files) {
        const dot = file.name.lastIndexOf('.');
        const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
        if (!allowed[ext] || file.type !== allowed[ext]) return 'Formato no permitido: ' + file.name;
        total += file.size;
      }
      if (total > maxBytes) return 'Los archivos superan el límite total de 3 MB.';
      return '';
    };

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      fileList.replaceChildren();
      const error = validateContactFiles(files);
      if (error) {
        fileInput.value = '';
        showContactStatus(error, 'error');
        return;
      }
      statusBox.className = 'contact-status';
      files.forEach((file) => {
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
      const files = Array.from(fileInput.files || []);
      const fileError = validateContactFiles(files);
      if (fileError) {
        showContactStatus(fileError, 'error');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';
      showContactStatus('Estamos enviando tu mensaje. Espera un momento.', 'info');

      try {
        const response = await fetch('/api/enviar', {
          method: 'POST',
          body: new FormData(contactForm)
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No se pudo enviar el mensaje.');
        }
        showContactStatus(result.message || 'Tu mensaje fue enviado correctamente.', 'success');
        contactForm.reset();
        fileList.replaceChildren();
      } catch (error) {
        showContactStatus(error.message || 'Ocurrió un error al enviar el mensaje. Inténtalo nuevamente.', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Enviar mensaje <span aria-hidden="true">↗</span>';
      }
    });
  }

})();