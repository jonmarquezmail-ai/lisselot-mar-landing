const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
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

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });

const textValue = (value) => String(value || "").trim();

const requireAdmin = (request, env) => {
  if (!env.ADMIN_TOKEN) {
    return json({ ok: false, error: "ADMIN_TOKEN no configurado." }, 500);
  }

  const expected = `Bearer ${env.ADMIN_TOKEN}`;
  const received = request.headers.get("authorization") || "";

  if (received !== expected) {
    return json({ ok: false, error: "No autorizado." }, 401);
  }

  return null;
};

const readPayload = async (request) => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
};

const validatePayload = (payload) => {
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

  return { guests: Math.round(guests) };
};

const rowFromPayload = (payload, guests, request) => ({
  name: textValue(payload.name),
  email: textValue(payload.email),
  phone: textValue(payload.phone),
  eventType: textValue(payload.eventType),
  venue: textValue(payload.venue),
  date: textValue(payload.date),
  guests,
  city: textValue(payload.city),
  format: textValue(payload.format),
  duration: textValue(payload.duration),
  notes: textValue(payload.notes),
  sourceUrl: textValue(payload.sourceUrl),
  userAgent: request.headers.get("user-agent") || "",
});

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return json({ ok: false, error: "Binding DB no configurado." }, 500);
  }

  try {
    const payload = await readPayload(request);
    const validation = validatePayload(payload);

    if (validation.spam) {
      return json({ ok: true, message: "Solicitud recibida." }, 201);
    }

    if (validation.error) {
      return json({ ok: false, error: validation.error }, 400);
    }

    const row = rowFromPayload(payload, validation.guests, request);
    const result = await env.DB.prepare(
      `INSERT INTO booking_requests (
        name,
        email,
        phone,
        event_type,
        venue,
        event_date,
        guests,
        city,
        format,
        duration,
        notes,
        source_url,
        user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        row.name,
        row.email,
        row.phone,
        row.eventType,
        row.venue,
        row.date,
        row.guests,
        row.city,
        row.format,
        row.duration,
        row.notes,
        row.sourceUrl,
        row.userAgent
      )
      .run();

    return json(
      {
        ok: true,
        id: result.meta?.last_row_id || null,
        message: "Solicitud guardada correctamente.",
      },
      201
    );
  } catch (error) {
    return json({ ok: false, error: "No se pudo guardar la solicitud." }, 500);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const unauthorized = requireAdmin(request, env);

  if (unauthorized) return unauthorized;

  if (!env.DB) {
    return json({ ok: false, error: "Binding DB no configurado." }, 500);
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const status = textValue(url.searchParams.get("status"));
  const query = textValue(url.searchParams.get("q")).toLowerCase();

  let sql = "SELECT * FROM booking_requests";
  const where = [];
  const bindings = [];

  if (status && STATUS_VALUES.has(status)) {
    where.push("status = ?");
    bindings.push(status);
  }

  if (query) {
    where.push(
      "(lower(name) LIKE ? OR lower(phone) LIKE ? OR lower(email) LIKE ? OR lower(venue) LIKE ? OR lower(city) LIKE ?)"
    );
    const likeQuery = `%${query}%`;
    bindings.push(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
  }

  if (where.length) {
    sql += ` WHERE ${where.join(" AND ")}`;
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  bindings.push(limit);

  const result = await env.DB.prepare(sql)
    .bind(...bindings)
    .all();

  return json({ ok: true, items: result.results || [] });
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const unauthorized = requireAdmin(request, env);

  if (unauthorized) return unauthorized;

  if (!env.DB) {
    return json({ ok: false, error: "Binding DB no configurado." }, 500);
  }

  const body = await request.json();
  const id = Number(body.id);
  const status = textValue(body.status);

  if (!Number.isInteger(id) || id < 1) {
    return json({ ok: false, error: "ID inválido." }, 400);
  }

  if (!STATUS_VALUES.has(status)) {
    return json({ ok: false, error: "Estado inválido." }, 400);
  }

  await env.DB.prepare("UPDATE booking_requests SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();

  return json({ ok: true });
}
