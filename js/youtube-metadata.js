/* Metadatos públicos de YouTube mediante oEmbed (sin API key).
   Recupera título y nombre del canal; no ofrece estadísticas ni fecha de publicación. */
(() => {
  const frames = [...document.querySelectorAll('iframe[src*="youtube.com/embed/"]')];
  const cache = new Map();
  const getVideoId = (frame) => {
    try {
      const url = new URL(frame.src);
      const path = url.pathname.split("/").filter(Boolean);
      if (path[0] === "videoseries") return null;
      return path[1] || null;
    } catch (_) { return null; }
  };
  frames.forEach(async (frame) => {
    const id = getVideoId(frame);
    if (!id) return;
    const card = frame.closest(".familio-series-card, article");
    if (!card) return;
    const heading = card.querySelector("h3");
    const meta = card.querySelector(".catalog-meta");
    if (!heading) return;
    try {
      let request = cache.get(id);
      if (!request) {
        const endpoint = "https://www.youtube.com/oembed?url=" +
          encodeURIComponent("https://www.youtube.com/watch?v=" + id) + "&format=json";
        request = fetch(endpoint).then((response) => {
          if (!response.ok) throw new Error("No se pudo consultar oEmbed");
          return response.json();
        });
        cache.set(id, request);
      }
      const data = await request;
      if (data.title) {
        heading.textContent = data.title;
        frame.title = data.title;
      }
      if (meta && data.author_name) {
        meta.textContent = data.author_name + " / YOUTUBE";
      }
    } catch (_) {
      // Si YouTube bloquea la consulta, se conserva el contenido editorial existente.
    }
  });
})();