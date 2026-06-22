const TOKEN_KEY = "lisselot_admin_token";
const STATUS_LABELS = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  cotizado: "Cotizado",
  archivado: "Archivado",
};

const CONTENT_FIELDS = [
  ["Hero", "hero.kicker", "Etiqueta"],
  ["Hero", "hero.title", "Título"],
  ["Hero", "hero.accent", "Título destacado"],
  ["Hero", "hero.lead", "Descripción", "textarea"],
  ["Diferenciales", "benefits.0.title", "Beneficio 1"],
  ["Diferenciales", "benefits.0.text", "Texto beneficio 1", "textarea"],
  ["Diferenciales", "benefits.1.title", "Beneficio 2"],
  ["Diferenciales", "benefits.1.text", "Texto beneficio 2", "textarea"],
  ["Diferenciales", "benefits.2.title", "Beneficio 3"],
  ["Diferenciales", "benefits.2.text", "Texto beneficio 3", "textarea"],
  ["Diferenciales", "benefits.3.title", "Beneficio 4"],
  ["Diferenciales", "benefits.3.text", "Texto beneficio 4", "textarea"],
  ["Momentos", "momentsHeader.kicker", "Etiqueta"],
  ["Momentos", "momentsHeader.title", "Título"],
  ["Bodas", "moments.0.kicker", "Etiqueta"],
  ["Bodas", "moments.0.title", "Título"],
  ["Bodas", "moments.0.text", "Texto", "textarea"],
  ["Eventos", "moments.1.kicker", "Etiqueta"],
  ["Eventos", "moments.1.title", "Título"],
  ["Eventos", "moments.1.text", "Texto", "textarea"],
  ["Galería", "gallery.kicker", "Etiqueta"],
  ["Galería", "gallery.title", "Título"],
  ["Sobre", "about.kicker", "Etiqueta"],
  ["Sobre", "about.title", "Título"],
  ["Sobre", "about.text", "Texto", "textarea"],
  ["Cotización", "quote.kicker", "Etiqueta"],
  ["Cotización", "quote.titleBefore", "Título antes del nombre"],
  ["Cotización", "quote.titleAccent", "Nombre destacado"],
  ["Cotización", "quote.titleAfter", "Título después del nombre"],
  ["Cotización", "quote.text", "Descripción", "textarea"],
  ["Cotización", "quote.points", "Puntos, uno por línea", "textarea"],
  ["Footer", "footer.tagline", "Frase"],
  ["Footer", "footer.whatsapp", "WhatsApp"],
  ["Footer", "footer.email", "Correo"],
  ["Footer", "footer.location", "Ubicación"],
  ["Footer", "footer.available", "Disponible para"],
];

const loginPanel = document.querySelector("#loginPanel");
const adminWorkspace = document.querySelector("#adminWorkspace");
const adminStatus = document.querySelector("#adminStatus");
const tokenInput = document.querySelector("#adminToken");
const saveTokenButton = document.querySelector("#saveToken");
const logoutButton = document.querySelector("#logout");
const tabButtons = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll(".admin-panel");
const refreshButton = document.querySelector("#refreshRequests");
const exportButton = document.querySelector("#exportCsv");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const requestsTable = document.querySelector("#requestsTable");
const contentForm = document.querySelector("#contentForm");
const saveContentButton = document.querySelector("#saveContent");
const galleryUpload = document.querySelector("#galleryUpload");
const galleryFile = document.querySelector("#galleryFile");
const galleryAlt = document.querySelector("#galleryAlt");
const galleryAdminGrid = document.querySelector("#galleryAdminGrid");

let currentItems = [];
let currentContent = null;

const getToken = () => localStorage.getItem(TOKEN_KEY) || "";

const setStatus = (message, isError = false) => {
  adminStatus.textContent = message;
  adminStatus.style.color = isError ? "#ffb3b3" : "var(--gold-bright)";
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDateTime = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const requestHeaders = () => ({
  authorization: `Bearer ${getToken()}`,
});

const jsonHeaders = () => ({
  ...requestHeaders(),
  "content-type": "application/json",
});

const getPath = (object, path) =>
  path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);

const setPath = (object, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  let cursor = object;

  for (const part of parts) {
    if (cursor[part] == null) {
      cursor[part] = Number.isInteger(Number(part)) ? [] : {};
    }

    cursor = cursor[part];
  }

  cursor[last] = value;
};

const renderLoginState = () => {
  const hasToken = Boolean(getToken());
  loginPanel.hidden = hasToken;
  adminWorkspace.hidden = !hasToken;
};

const activateTab = (tabName) => {
  tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tabName));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === `panel-${tabName}`));

  if (tabName === "inbox") loadRequests();
  if (tabName === "content" || tabName === "gallery") loadContent();
};

const verifySession = async () => {
  const response = await fetch("/api/session", { headers: requestHeaders() });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Clave incorrecta.");
  }
};

const renderEmptyRequests = () => {
  requestsTable.innerHTML = `
    <tr>
      <td colspan="7">
        <strong>No hay solicitudes para mostrar.</strong>
        <span class="cell-muted">Cuando alguien envíe el formulario, aparecerá aquí.</span>
      </td>
    </tr>
  `;
};

const renderRequests = (items) => {
  if (!items.length) {
    renderEmptyRequests();
    return;
  }

  requestsTable.innerHTML = items
    .map((item) => {
      const phoneDigits = String(item.phone || "").replace(/\D/g, "");

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <span class="cell-muted">${escapeHtml(item.phone)}</span>
            <span class="cell-muted">${escapeHtml(item.email || "Sin email")}</span>
          </td>
          <td>
            ${escapeHtml(item.event_type)}
            <span class="cell-muted">${escapeHtml(item.guests)} invitados</span>
          </td>
          <td>
            ${escapeHtml(item.event_date)}
            <span class="cell-muted">${formatDateTime(item.created_at)}</span>
          </td>
          <td>
            ${escapeHtml(item.venue)}
            <span class="cell-muted">${escapeHtml(item.city)}</span>
          </td>
          <td>
            ${escapeHtml(item.format)}
            <span class="cell-muted">${escapeHtml(item.duration)}</span>
            <span class="cell-muted">${escapeHtml(item.notes || "Sin detalles adicionales.")}</span>
          </td>
          <td>
            <select class="status-select" data-status-id="${escapeHtml(item.id)}">
              ${Object.entries(STATUS_LABELS)
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`
                )
                .join("")}
            </select>
          </td>
          <td>
            <div class="table-actions">
              <a class="button button--ghost" href="https://wa.me/${phoneDigits}" target="_blank" rel="noopener">
                WhatsApp
              </a>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
};

const loadRequests = async () => {
  const params = new URLSearchParams();
  const q = searchInput.value.trim();
  const status = statusFilter.value;

  if (q) params.set("q", q);
  if (status) params.set("status", status);

  setStatus("Cargando solicitudes...");

  try {
    const response = await fetch(`/api/solicitudes?${params.toString()}`, {
      headers: requestHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "No se pudieron cargar las solicitudes.");
    }

    currentItems = result.items;
    renderRequests(currentItems);
    setStatus(`${currentItems.length} solicitud(es) cargada(s).`);
  } catch (error) {
    setStatus(error.message, true);
  }
};

const updateStatus = async (id, status) => {
  try {
    const response = await fetch("/api/solicitudes", {
      method: "PATCH",
      headers: jsonHeaders(),
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "No se pudo actualizar el estado.");
    }

    setStatus("Estado actualizado.");
    await loadRequests();
  } catch (error) {
    setStatus(error.message, true);
  }
};

const exportCsv = () => {
  if (!currentItems.length) {
    setStatus("No hay solicitudes para exportar.", true);
    return;
  }

  const columns = [
    "created_at",
    "status",
    "name",
    "email",
    "phone",
    "event_type",
    "venue",
    "event_date",
    "guests",
    "city",
    "format",
    "duration",
    "notes",
  ];
  const csv = [
    columns.join(","),
    ...currentItems.map((item) =>
      columns
        .map((column) => `"${String(item[column] || "").replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `solicitudes-lisselot-mar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const renderContentForm = () => {
  if (!currentContent) return;

  let lastGroup = "";

  contentForm.innerHTML = CONTENT_FIELDS.map(([group, path, label, type]) => {
    const value = getPath(currentContent, path);
    const normalizedValue = Array.isArray(value) ? value.join("\n") : value || "";
    const isTextarea = type === "textarea";
    const groupTitle =
      group !== lastGroup
        ? `<div class="content-field content-field--wide"><p class="section-kicker">${escapeHtml(group)}</p></div>`
        : "";

    lastGroup = group;

    return `
      ${groupTitle}
      <label class="content-field ${isTextarea ? "content-field--wide" : ""}">
        ${escapeHtml(label)}
        ${
          isTextarea
            ? `<textarea data-content-path="${path}" rows="4">${escapeHtml(normalizedValue)}</textarea>`
            : `<input data-content-path="${path}" type="text" value="${escapeHtml(normalizedValue)}" />`
        }
      </label>
    `;
  }).join("");
};

const renderGalleryAdmin = () => {
  const items = currentContent?.gallery?.items || [];

  if (!items.length) {
    galleryAdminGrid.innerHTML = "<p>No hay imágenes en la galería.</p>";
    return;
  }

  galleryAdminGrid.innerHTML = items
    .map(
      (item) => `
        <article class="gallery-admin-item">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" />
          <p>${escapeHtml(item.alt || "Imagen de galería.")}</p>
          <button class="button button--ghost" type="button" data-delete-gallery="${escapeHtml(item.id)}">
            Eliminar
          </button>
        </article>
      `
    )
    .join("");
};

const loadContent = async () => {
  setStatus("Cargando contenido...");

  try {
    const response = await fetch("/api/content");
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "No se pudo cargar el contenido.");
    }

    currentContent = result.content;
    renderContentForm();
    renderGalleryAdmin();
    setStatus("Contenido cargado.");
  } catch (error) {
    setStatus(error.message, true);
  }
};

const saveContent = async () => {
  if (!currentContent) return;

  const nextContent = structuredClone(currentContent);
  const fields = contentForm.querySelectorAll("[data-content-path]");

  fields.forEach((field) => {
    const path = field.dataset.contentPath;
    const value = path === "quote.points" ? field.value.split("\n").map((item) => item.trim()).filter(Boolean) : field.value;
    setPath(nextContent, path, value);
  });

  setStatus("Guardando textos...");

  try {
    const response = await fetch("/api/content", {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify(nextContent),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "No se pudo guardar el contenido.");
    }

    currentContent = result.content;
    renderContentForm();
    setStatus("Textos guardados. Refresca la landing para verlos.");
  } catch (error) {
    setStatus(error.message, true);
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

const uploadGalleryImage = async (event) => {
  event.preventDefault();

  const file = galleryFile.files[0];

  if (!file) {
    setStatus("Selecciona una imagen.", true);
    return;
  }

  setStatus("Subiendo imagen...");

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const response = await fetch("/api/gallery", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        fileName: file.name,
        alt: galleryAlt.value.trim(),
        dataUrl,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "No se pudo subir la imagen.");
    }

    currentContent = result.content;
    galleryUpload.reset();
    renderGalleryAdmin();
    setStatus("Imagen agregada a la galería.");
  } catch (error) {
    setStatus(error.message, true);
  }
};

const deleteGalleryImage = async (id) => {
  setStatus("Eliminando imagen...");

  try {
    const response = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: requestHeaders(),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "No se pudo eliminar la imagen.");
    }

    currentContent = result.content;
    renderGalleryAdmin();
    setStatus("Imagen eliminada.");
  } catch (error) {
    setStatus(error.message, true);
  }
};

saveTokenButton.addEventListener("click", async () => {
  const token = tokenInput.value.trim();

  if (!token) {
    setStatus("Escribe la clave de administrador.", true);
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);

  try {
    await verifySession();
    tokenInput.value = "";
    renderLoginState();
    await loadRequests();
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    renderLoginState();
    setStatus(error.message, true);
  }
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  currentItems = [];
  currentContent = null;
  requestsTable.innerHTML = "";
  contentForm.innerHTML = "";
  galleryAdminGrid.innerHTML = "";
  renderLoginState();
  setStatus("Sesión cerrada.");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

refreshButton.addEventListener("click", loadRequests);
exportButton.addEventListener("click", exportCsv);
saveContentButton.addEventListener("click", saveContent);
galleryUpload.addEventListener("submit", uploadGalleryImage);
searchInput.addEventListener("input", () => window.clearTimeout(searchInput._timer));
searchInput.addEventListener("input", () => {
  searchInput._timer = window.setTimeout(loadRequests, 350);
});
statusFilter.addEventListener("change", loadRequests);

requestsTable.addEventListener("change", (event) => {
  if (!event.target.matches("[data-status-id]")) return;
  updateStatus(event.target.dataset.statusId, event.target.value);
});

galleryAdminGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-gallery]");
  if (!button) return;
  deleteGalleryImage(button.dataset.deleteGallery);
});

renderLoginState();

if (getToken()) {
  verifySession()
    .then(() => loadRequests())
    .catch((error) => {
      localStorage.removeItem(TOKEN_KEY);
      renderLoginState();
      setStatus(error.message, true);
    });
}
