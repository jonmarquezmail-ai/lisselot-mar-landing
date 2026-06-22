const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lisselot-admin";
const PERSISTENT_DIR = process.env.PERSISTENT_DIR || ROOT;
const DATA_DIR = process.env.DATA_DIR || path.join(PERSISTENT_DIR, "data");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(PERSISTENT_DIR, "uploads", "gallery");

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const REQUIRED_FIELDS = [
  "name",
  "phone",
  "eventType",
  "venue",
  "date",
  "guests",
  "city",
  "format",
  "duration",
];

const STATUS_VALUES = new Set(["nuevo", "contactado", "cotizado", "archivado"]);

const defaultContent = () => ({
  hero: {
    kicker: "Lisselot Mar en vivo",
    title: "La voz de una celebración",
    accent: "inolvidable",
    lead:
      "Música en vivo, presencia escénica y un repertorio que crea la atmósfera perfecta para bodas, eventos privados, hoteles, celebraciones corporativas y experiencias premium.",
    image: "assets/lisselot-mar-hero-gold.png",
    imageAlt: "Lisselot Mar cantando en vivo bajo luces doradas y magenta.",
  },
  benefits: [
    {
      title: "Voz en vivo",
      text: "Interpretación con calidez, fuerza escénica y conexión auténtica con los invitados.",
    },
    {
      title: "Repertorio versátil",
      text: "Tropical, clásico, pop, boleros y ritmos adaptados al estilo de cada celebración.",
    },
    {
      title: "Imagen premium",
      text: "Estética cuidada y presencia elegante para elevar el ambiente del evento.",
    },
    {
      title: "Experiencia a medida",
      text: "Propuesta personalizada según lugar, invitados, formato, horario y logística.",
    },
  ],
  momentsHeader: {
    kicker: "Momentos especiales",
    title: "Porque la música es el alma de tu evento",
  },
  moments: [
    {
      kicker: "Bodas",
      title: "Romance, elegancia y fiesta.",
      text:
        "Recepción, ceremonia, cóctel o fiesta: el show se adapta al ritmo de la noche con un tono elegante y bailable.",
      image: "assets/lisselot-mar-red-dress.png",
      imageAlt: "Lisselot Mar en un ambiente elegante de celebración.",
    },
    {
      kicker: "Eventos privados",
      title: "Presencia musical premium.",
      text:
        "Ideal para aniversarios, cenas premium, hoteles, resorts y lanzamientos con una atmósfera viva y sofisticada.",
      image: "assets/lisselot-mar-full-stage-red.png",
      imageAlt: "Lisselot Mar cantando en un escenario con luces rojas.",
    },
  ],
  gallery: {
    kicker: "Galería",
    title: "¡Pa' que lo baile' obligao'!",
    items: [
      {
        id: "hero-gold",
        src: "assets/lisselot-mar-hero-gold.png",
        alt: "Lisselot Mar sonriendo con micrófono en escenario.",
      },
      {
        id: "purple-profile",
        src: "assets/lisselot-mar-purple-profile.png",
        alt: "Perfil de Lisselot Mar bajo luces violetas.",
      },
      {
        id: "smile-close",
        src: "assets/lisselot-mar-smile-close.png",
        alt: "Lisselot Mar sonriendo mientras canta.",
      },
      {
        id: "full-stage-red",
        src: "assets/lisselot-mar-full-stage-red.png",
        alt: "Lisselot Mar interpretando en vivo con banda.",
      },
    ],
  },
  about: {
    kicker: "Sobre Lisselot",
    title: "Presencia tropical con una imagen impecable.",
    text:
      "Lisselot Mar lleva al escenario una combinación de carisma, elegancia y sabor tropical pensada para eventos donde cada detalle importa. Su propuesta funciona tanto para celebraciones íntimas como para producciones con banda y montaje completo.",
    image: "assets/lisselot-mar-smile-close.png",
    imageAlt: "Lisselot Mar cantando de cerca con una sonrisa.",
  },
  quote: {
    kicker: "Haz de tu evento una experiencia inolvidable",
    titleBefore: "Lleva la música de",
    titleAccent: "Lisselot Mar",
    titleAfter: "a tu celebración",
    text:
      "Cuéntanos cómo imaginas tu evento y prepararemos una propuesta personalizada, pensada para crear el ambiente perfecto y hacer que cada momento se disfrute y se recuerde.",
    points: [
      "Una experiencia diseñada para ti",
      "Propuesta adaptada a tu evento",
      "Asesoría personalizada",
      "Música tropical en vivo",
      "Repertorio pensado para tus invitados",
      "Disponibilidad en República Dominicana y el extranjero",
    ],
  },
  footer: {
    tagline: "Música tropical en vivo que transforma momentos en recuerdos inolvidables.",
    whatsapp: "WhatsApp: +1 849 650 7110",
    email: "booking@lisselotmar.com",
    location: "Santo Domingo, República Dominicana",
    available: "Bodas, eventos privados, hoteles y eventos corporativos.",
  },
});

const ensureStorage = async () => {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });

  if (!fs.existsSync(REQUESTS_FILE)) {
    await writeJson(REQUESTS_FILE, []);
  }

  if (!fs.existsSync(CONTENT_FILE)) {
    await writeJson(CONTENT_FILE, defaultContent());
  }
};

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};

async function writeJson(file, data) {
  const tempFile = `${file}.${crypto.randomUUID()}.tmp`;
  await fsp.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fsp.rename(tempFile, file);
}

const readBody = (request, limitBytes = 12 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > limitBytes) {
        reject(new Error("El archivo o formulario es demasiado grande."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

const parseJsonBody = async (request) => {
  const body = await readBody(request);
  return body ? JSON.parse(body) : {};
};

const sendJson = (response, body, status = 200) => {
  response.writeHead(status, JSON_HEADERS);
  response.end(JSON.stringify(body));
};

const sendError = (response, message, status = 400) => {
  sendJson(response, { ok: false, error: message }, status);
};

const textValue = (value) => String(value || "").trim();

const isAdmin = (request) => {
  const header = request.headers.authorization || "";
  return header === `Bearer ${ADMIN_PASSWORD}`;
};

const requireAdmin = (request, response) => {
  if (isAdmin(request)) return true;
  sendError(response, "No autorizado.", 401);
  return false;
};

const publicRequestFromPayload = (payload) => {
  if (textValue(payload.company)) {
    return { spam: true };
  }

  const missing = REQUIRED_FIELDS.filter((field) => !textValue(payload[field]));
  const guests = Number(payload.guests);

  if (missing.length) {
    return { error: `Faltan campos requeridos: ${missing.join(", ")}` };
  }

  if (!Number.isFinite(guests) || guests < 1) {
    return { error: "La cantidad de invitados debe ser un número válido." };
  }

  return {
    row: {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      status: "nuevo",
      name: textValue(payload.name),
      email: textValue(payload.email),
      phone: textValue(payload.phone),
      event_type: textValue(payload.eventType),
      venue: textValue(payload.venue),
      event_date: textValue(payload.date),
      guests: Math.round(guests),
      city: textValue(payload.city),
      format: textValue(payload.format),
      duration: textValue(payload.duration),
      notes: textValue(payload.notes),
      source_url: textValue(payload.sourceUrl),
    },
  };
};

const handlePostRequest = async (request, response) => {
  const payload = await parseJsonBody(request);
  const validation = publicRequestFromPayload(payload);

  if (validation.spam) {
    sendJson(response, { ok: true, message: "Solicitud recibida." }, 201);
    return;
  }

  if (validation.error) {
    sendError(response, validation.error, 400);
    return;
  }

  const requests = await readJson(REQUESTS_FILE, []);
  requests.unshift(validation.row);
  await writeJson(REQUESTS_FILE, requests);

  sendJson(response, { ok: true, id: validation.row.id, message: "Solicitud guardada correctamente." }, 201);
};

const handleGetRequests = async (request, response, url) => {
  if (!requireAdmin(request, response)) return;

  const q = textValue(url.searchParams.get("q")).toLowerCase();
  const status = textValue(url.searchParams.get("status"));
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);
  let items = await readJson(REQUESTS_FILE, []);

  if (status && STATUS_VALUES.has(status)) {
    items = items.filter((item) => item.status === status);
  }

  if (q) {
    items = items.filter((item) =>
      [item.name, item.phone, item.email, item.venue, item.city, item.event_type]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  sendJson(response, { ok: true, items: items.slice(0, limit) });
};

const handlePatchRequest = async (request, response) => {
  if (!requireAdmin(request, response)) return;

  const body = await parseJsonBody(request);
  const id = textValue(body.id);
  const status = textValue(body.status);

  if (!id || !STATUS_VALUES.has(status)) {
    sendError(response, "Solicitud o estado inválido.", 400);
    return;
  }

  const requests = await readJson(REQUESTS_FILE, []);
  const item = requests.find((requestItem) => requestItem.id === id);

  if (!item) {
    sendError(response, "Solicitud no encontrada.", 404);
    return;
  }

  item.status = status;
  item.updated_at = new Date().toISOString();
  await writeJson(REQUESTS_FILE, requests);

  sendJson(response, { ok: true });
};

const handleSaveContent = async (request, response) => {
  if (!requireAdmin(request, response)) return;

  const body = await parseJsonBody(request);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    sendError(response, "Contenido inválido.", 400);
    return;
  }

  await writeJson(CONTENT_FILE, body);
  sendJson(response, { ok: true, content: body });
};

const slugify = (value) =>
  textValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "imagen";

const imageExtensionFromMime = (mime) =>
  ({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  })[mime];

const handleUploadGallery = async (request, response) => {
  if (!requireAdmin(request, response)) return;

  const body = await parseJsonBody(request);
  const match = String(body.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  const extension = match ? imageExtensionFromMime(match[1]) : "";

  if (!match || !extension) {
    sendError(response, "Sube una imagen JPG, PNG o WebP.", 400);
    return;
  }

  const bytes = Buffer.from(match[2], "base64");

  if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
    sendError(response, "La imagen debe pesar menos de 10 MB.", 400);
    return;
  }

  const fileName = `${slugify(body.fileName || "galeria")}-${crypto.randomUUID().slice(0, 8)}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fsp.writeFile(filePath, bytes);

  const content = await readJson(CONTENT_FILE, defaultContent());
  const item = {
    id: crypto.randomUUID(),
    src: `/uploads/gallery/${fileName}`,
    alt: textValue(body.alt) || "Imagen de Lisselot Mar en vivo.",
  };

  content.gallery = content.gallery || { kicker: "Galería", title: "Galería", items: [] };
  content.gallery.items = Array.isArray(content.gallery.items) ? content.gallery.items : [];
  content.gallery.items.push(item);
  await writeJson(CONTENT_FILE, content);

  sendJson(response, { ok: true, item, content }, 201);
};

const handleDeleteGallery = async (request, response, url) => {
  if (!requireAdmin(request, response)) return;

  const id = textValue(url.searchParams.get("id"));
  const content = await readJson(CONTENT_FILE, defaultContent());
  const items = Array.isArray(content.gallery?.items) ? content.gallery.items : [];
  const item = items.find((galleryItem) => galleryItem.id === id);

  if (!item) {
    sendError(response, "Imagen no encontrada.", 404);
    return;
  }

  content.gallery.items = items.filter((galleryItem) => galleryItem.id !== id);

  if (item.src.startsWith("/uploads/gallery/")) {
    const fileName = path.basename(item.src);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (filePath.startsWith(UPLOAD_DIR)) {
      await fsp.rm(filePath, { force: true });
    }
  }

  await writeJson(CONTENT_FILE, content);
  sendJson(response, { ok: true, content });
};

const handleApi = async (request, response, url) => {
  if (url.pathname === "/api/session") {
    if (!requireAdmin(request, response)) return;
    sendJson(response, { ok: true });
    return;
  }

  if (url.pathname === "/api/content" && request.method === "GET") {
    sendJson(response, { ok: true, content: await readJson(CONTENT_FILE, defaultContent()) });
    return;
  }

  if (url.pathname === "/api/content" && request.method === "PUT") {
    await handleSaveContent(request, response);
    return;
  }

  if (url.pathname === "/api/solicitudes" && request.method === "POST") {
    await handlePostRequest(request, response);
    return;
  }

  if (url.pathname === "/api/solicitudes" && request.method === "GET") {
    await handleGetRequests(request, response, url);
    return;
  }

  if (url.pathname === "/api/solicitudes" && request.method === "PATCH") {
    await handlePatchRequest(request, response);
    return;
  }

  if (url.pathname === "/api/gallery" && request.method === "POST") {
    await handleUploadGallery(request, response);
    return;
  }

  if (url.pathname === "/api/gallery" && request.method === "DELETE") {
    await handleDeleteGallery(request, response, url);
    return;
  }

  sendError(response, "Ruta no encontrada.", 404);
};

const resolveStaticPath = (pathname) => {
  if (pathname === "/") return path.join(ROOT, "index.html");
  if (pathname === "/admin" || pathname === "/admin/") return path.join(ROOT, "admin", "index.html");

  if (pathname.startsWith("/uploads/gallery/")) {
    const fileName = path.basename(decodeURIComponent(pathname));
    return path.join(UPLOAD_DIR, fileName);
  }

  const allowed =
    pathname === "/styles.css" ||
    pathname === "/script.js" ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/admin/");

  if (!allowed) return "";

  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, cleanPath);

  if (!filePath.startsWith(ROOT)) return "";
  return filePath;
};

const serveStatic = async (response, pathname) => {
  const filePath = resolveStaticPath(pathname);

  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);

    if (!stat.isFile()) throw new Error("No encontrado");

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "content-type": MIME_TYPES[extension] || "application/octet-stream",
      "cache-control": pathname.startsWith("/uploads/") ? "public, max-age=3600" : "no-store",
    });
    fs.createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("No encontrado");
  }
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    sendError(response, error.message || "Error interno.", 500);
  }
});

ensureStorage().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Lisselot Mar listo en http://127.0.0.1:${PORT}`);
    console.log(`Panel admin: http://127.0.0.1:${PORT}/admin/`);
    console.log(`Clave admin local: ${ADMIN_PASSWORD}`);
  });
});
