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
})();