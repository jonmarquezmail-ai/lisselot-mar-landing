const WHATSAPP_NUMBER = "18496507110";
const SUBMISSION_ENDPOINT = "/api/solicitudes";

const form = document.querySelector("#quoteForm");
const statusEl = document.querySelector("#formStatus");
const previewEl = document.querySelector("#requestPreview");
const whatsappFallback = document.querySelector("#whatsappFallback");

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const setText = (selector, value) => {
  const element = document.querySelector(selector);

  if (element && value) {
    element.textContent = value;
  }
};

const setImage = (selector, src, alt) => {
  const image = document.querySelector(selector);

  if (!image || !src) return;

  image.src = src;
  if (alt) image.alt = alt;
};

const renderBenefits = (benefits = []) => {
  const cards = document.querySelectorAll(".benefit-strip article");

  benefits.slice(0, cards.length).forEach((benefit, index) => {
    const card = cards[index];
    const title = card.querySelector("h2");
    const text = card.querySelector("p");

    if (title && benefit.title) title.textContent = benefit.title;
    if (text && benefit.text) text.textContent = benefit.text;
  });
};

const renderMoments = (moments = []) => {
  const cards = document.querySelectorAll(".moment-card");

  moments.slice(0, cards.length).forEach((moment, index) => {
    const card = cards[index];
    const kicker = card.querySelector(".section-kicker");
    const title = card.querySelector("h3");
    const text = card.querySelector("p:not(.section-kicker)");
    const image = card.querySelector("img");

    if (kicker && moment.kicker) kicker.textContent = moment.kicker;
    if (title && moment.title) title.textContent = moment.title;
    if (text && moment.text) text.textContent = moment.text;
    if (image && moment.image) {
      image.src = moment.image;
      image.alt = moment.imageAlt || image.alt;
    }
  });
};

const renderGallery = (gallery = {}) => {
  const grid = document.querySelector(".gallery-grid");
  const items = Array.isArray(gallery.items) ? gallery.items : [];

  setText(".gallery .section-kicker", gallery.kicker);
  setText("#gallery-title", gallery.title);

  if (!grid || !items.length) return;

  grid.innerHTML = items
    .map(
      (item) => `
        <figure class="gallery-item">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "Lisselot Mar en vivo.")}" />
        </figure>
      `
    )
    .join("");
};

const renderQuotePoints = (points = []) => {
  const list = document.querySelector(".quote-points");

  if (!list || !points.length) return;

  list.innerHTML = points.map((point) => `<li>${escapeHtml(point)}</li>`).join("");
};

const applyContent = (content = {}) => {
  setText(".hero .section-kicker", content.hero?.kicker);
  setImage(".hero__image", content.hero?.image, content.hero?.imageAlt);

  const heroTitle = document.querySelector("#hero-title");
  if (heroTitle && (content.hero?.title || content.hero?.accent)) {
    heroTitle.innerHTML = `${escapeHtml(content.hero.title)}<span>${escapeHtml(content.hero.accent)}</span>`;
  }

  setText(".hero__lead", content.hero?.lead);
  renderBenefits(content.benefits);
  setText(".moments .section-heading .section-kicker", content.momentsHeader?.kicker);
  setText("#moments-title", content.momentsHeader?.title);
  renderMoments(content.moments);
  renderGallery(content.gallery);
  setText(".about__copy .section-kicker", content.about?.kicker);
  setText("#about-title", content.about?.title);
  setText(".about__copy p:last-child", content.about?.text);
  setImage(".about__media img", content.about?.image, content.about?.imageAlt);
  setText(".quote-copy .section-kicker", content.quote?.kicker);

  const quoteTitle = document.querySelector("#quote-title");
  if (quoteTitle && content.quote) {
    quoteTitle.innerHTML = `${escapeHtml(content.quote.titleBefore)} <span>${escapeHtml(
      content.quote.titleAccent
    )}</span> ${escapeHtml(content.quote.titleAfter)}`;
  }

  setText(".quote-copy > p:not(.section-kicker)", content.quote?.text);
  renderQuotePoints(content.quote?.points);
  setText(".site-footer > div:first-child p", content.footer?.tagline);
  setText(".site-footer > div:nth-child(2) p:nth-of-type(1)", content.footer?.whatsapp);
  setText(".site-footer > div:nth-child(2) p:nth-of-type(2)", content.footer?.email);
  setText(".site-footer > div:nth-child(2) p:nth-of-type(3)", content.footer?.location);
  setText(".site-footer > div:nth-child(4) p", content.footer?.available);
};

fetch("/api/content")
  .then((response) => response.json())
  .then((result) => {
    if (result.ok) applyContent(result.content);
  })
  .catch(() => {});

const fallback = (value) => value?.trim() || "Por confirmar";

const formatDate = (value) => {
  if (!value) return "Por confirmar";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const buildMessage = () => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  return [
    "Hola, quiero cotizar a Lisselot Mar para un evento.",
    "",
    `Nombre: ${fallback(data.name)}`,
    `Email: ${fallback(data.email)}`,
    `Teléfono/WhatsApp: ${fallback(data.phone)}`,
    `Tipo de evento: ${fallback(data.eventType)}`,
    `Lugar del evento: ${fallback(data.venue)}`,
    `Fecha: ${formatDate(data.date)}`,
    `Cantidad de invitados: ${fallback(data.guests)}`,
    `Ciudad/País: ${fallback(data.city)}`,
    `Formato deseado: ${fallback(data.format)}`,
    `Duración: ${fallback(data.duration)}`,
    "",
    `Detalles: ${fallback(data.notes).replace("Por confirmar", "Sin detalles adicionales por ahora.")}`,
  ].join("\n");
};

const buildPayload = () => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    eventType: data.eventType,
    venue: data.venue,
    date: data.date,
    guests: data.guests,
    city: data.city,
    format: data.format,
    duration: data.duration,
    notes: data.notes,
    company: data.company,
    sourceUrl: window.location.href,
  };
};

const showPreview = (message) => {
  previewEl.textContent = message;
  previewEl.classList.add("is-visible");
};

const getFileSafeValue = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "solicitud";

const downloadRequest = (message) => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const date = new Date().toISOString().slice(0, 10);
  const name = getFileSafeValue(data.name || "cliente");
  const blob = new Blob([message], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `cotizacion-lisselot-mar-${date}-${name}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const openFallbackChannels = (message, encodedMessage) => {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  downloadRequest(message);
  whatsappFallback.href = whatsappUrl;
  whatsappFallback.classList.add("is-visible");

  const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener");

  if (!whatsappWindow) {
    statusEl.textContent = "Se descargó una copia. Si WhatsApp no abrió, usa el enlace de abajo.";
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const message = buildMessage();
  const encodedMessage = encodeURIComponent(message);
  const payload = buildPayload();

  showPreview(message);
  statusEl.textContent = "Enviando solicitud...";

  fetch(SUBMISSION_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No se pudo guardar la solicitud.");
      }

      statusEl.textContent = "Solicitud recibida. Te contactaremos pronto.";
      whatsappFallback.classList.remove("is-visible");
      form.reset();
    })
    .catch(() => {
      statusEl.textContent = "No se pudo guardar en la base de datos local. Se abrió WhatsApp como respaldo.";
      openFallbackChannels(message, encodedMessage);
    });
});
