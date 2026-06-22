# Cloudflare Pages + D1

Nota: esta guía queda como referencia de la versión Cloudflare. La versión actual recomendada usa `server.js` con Node para tener bandeja, editor de textos y subida de imágenes en `/admin/`. Para esa versión, sigue `README.md`.

Esta landing usa Cloudflare Pages para servir la página, Pages Functions para recibir el formulario y Cloudflare D1 para guardar las solicitudes.

Importante: no uses `Direct Upload` desde el dashboard para esta versión. El formulario necesita Pages Functions, y ese flujo se despliega correctamente con GitHub o con Wrangler.

## Archivos que se suben

La carpeta completa del sitio es:

```txt
/Users/jonsmac/Documents/Codex/2026-06-17/lisselot-mar/outputs/lisselot-mar-landing
```

Dentro están la landing, las imágenes, el backend, el panel admin y la migración de base de datos.

## Ruta recomendada: GitHub + Cloudflare Pages

1. Crea un repositorio en GitHub.
2. Sube el contenido de esta carpeta al repositorio.
3. En Cloudflare ve a `Workers & Pages`.
4. Entra en `Pages`.
5. Elige `Connect to Git`.
6. Selecciona el repositorio.
7. En la configuración del proyecto usa:

```txt
Framework preset: None
Build command: npm run build
Build output directory: dist
```

8. Haz el primer deploy.

No pongas `npm run deploy` como build command en Cloudflare. Cloudflare ya se encarga del deploy; ese campo es solo para preparar los archivos finales.

## Crear la base de datos D1

1. En Cloudflare ve a `Workers & Pages`.
2. Entra a `D1 SQL Database`.
3. Crea una base de datos llamada:

```txt
lisselot-bookings
```

4. Abre la base de datos.
5. En `Console` o `Query`, pega y ejecuta el contenido de:

```txt
migrations/0001_create_booking_requests.sql
```

Ese archivo crea la tabla donde se guardan las solicitudes.

## Conectar D1 al proyecto Pages

1. Entra al proyecto de Cloudflare Pages.
2. Ve a `Settings`.
3. Busca `Bindings`.
4. Agrega un binding de tipo `D1 database`.
5. En `Variable name` escribe exactamente:

```txt
DB
```

6. Selecciona la base:

```txt
lisselot-bookings
```

7. Guarda los cambios.

## Crear el token privado del panel

1. En el mismo proyecto Pages, ve a `Settings`.
2. Busca `Variables and Secrets`.
3. Crea una variable secreta llamada:

```txt
ADMIN_TOKEN
```

4. Usa una clave larga y privada, por ejemplo:

```txt
lisselot-admin-cambia-este-token-por-uno-largo
```

Guarda ese valor en un lugar seguro. Lo necesitarás para entrar al panel admin.

## Hacer redeploy

Después de agregar `DB` y `ADMIN_TOKEN`, vuelve a hacer deploy.

Si usaste GitHub, basta con hacer un nuevo commit o tocar `Retry deployment` desde Cloudflare.

## Probar el formulario

1. Abre la landing publicada.
2. Llena el formulario.
3. Haz clic en `Recibir cotización personalizada`.
4. Si todo está bien, verás:

```txt
Solicitud recibida. Te contactaremos pronto.
```

## Ver solicitudes

Abre:

```txt
https://TU-DOMINIO/admin/
```

Pega el valor de `ADMIN_TOKEN`.

Desde ahí puedes:

- Ver solicitudes.
- Buscar por nombre, teléfono, email, lugar o ciudad.
- Filtrar por estado.
- Cambiar estado: `Nuevo`, `Contactado`, `Cotizado`, `Archivado`.
- Exportar CSV.

## Alternativa con Wrangler

Si prefieres no usar GitHub, puedes desplegar por terminal desde esta carpeta:

```bash
npm run build
npx wrangler pages deploy dist --project-name lisselot-mar-landing
```

Luego haces los mismos pasos de D1, `DB`, `ADMIN_TOKEN` y redeploy.

## Error: Asset too large / workerd

Si ves un error parecido a:

```txt
Asset too large
node_modules/workerd/bin/workerd
```

Significa que Cloudflare intento publicar `node_modules` como parte de la web.

Corrigelo asi:

1. Entra al proyecto de Cloudflare Pages.
2. Ve a `Settings`.
3. En `Builds & deployments`, revisa la configuracion.
4. Cambia `Build command` a:

```txt
npm run build
```

5. Cambia `Build output directory` a:

```txt
dist
```

6. Verifica que no tengas `npm run deploy` en ningun campo de Cloudflare.
7. Vuelve a desplegar con `Retry deployment`.

Si Cloudflare ofrece limpiar cache al redeployar, usalo.

## Nota local

Si abres la web con `python3 -m http.server`, el backend no corre porque Cloudflare Functions solo funcionan dentro de Cloudflare Pages o con Wrangler.

En local, el formulario hará fallback: descarga una copia `.txt` y abre WhatsApp.
