# Lisselot Mar Landing + Panel

Landing para promover a Lisselot Mar en bodas, eventos privados y celebraciones tropicales.

Ahora incluye backend propio:

- Formulario público de cotización.
- Bandeja de solicitudes en `/admin/`.
- Editor de textos de la landing.
- Carga de imágenes para la galería.
- Exportación CSV de solicitudes.

## Ver localmente

Desde esta carpeta:

```bash
npm run dev
```

Luego abre:

```txt
http://127.0.0.1:5173/
```

Panel privado:

```txt
http://127.0.0.1:5173/admin/
```

Clave local inicial:

```txt
lisselot-admin
```

## Cambiar clave de administrador

En producción configura esta variable de entorno:

```txt
ADMIN_PASSWORD=una-clave-larga-y-privada
```

Si no configuras `ADMIN_PASSWORD`, el servidor usa `lisselot-admin`.

## Donde se guarda la información

Solicitudes:

```txt
data/requests.json
```

Textos de la landing:

```txt
data/content.json
```

Imágenes subidas desde el panel:

```txt
uploads/gallery/
```

## Hosting recomendado

Esta versión necesita hosting Node porque guarda datos y permite subir imágenes.

## Subir a Render

En la pantalla `Create a new Service`, elige:

```txt
Web Services
```

No elijas `Static Sites`, porque esta app tiene backend.

Configuración recomendada:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
```

Si el repositorio de GitHub contiene solo esta carpeta, deja `Root Directory` vacío.

Si el repositorio contiene la carpeta completa del proyecto Codex, usa:

```txt
Root Directory: outputs/lisselot-mar-landing
```

Variables de entorno:

```txt
ADMIN_PASSWORD=una-clave-larga-y-privada
PERSISTENT_DIR=/var/data
```

Disco persistente:

```txt
Name: lisselot-data
Mount Path: /var/data
Size: 1 GB
```

Con eso se guardan de forma persistente:

```txt
/var/data/data/requests.json
/var/data/data/content.json
/var/data/uploads/gallery/
```

El servicio debe correr:

```txt
npm start
```

El servidor escucha el puerto que le entregue la plataforma con `PORT`.

Cloudflare Pages no es la mejor opción para esta versión porque la edición de contenido, la bandeja y las subidas de imágenes necesitan un backend con almacenamiento persistente.

## Build estático

Si en algún momento necesitas exportar solo la parte visual:

```bash
npm run build
```

Eso genera `dist/`, pero `dist/` no incluye el backend de bandeja/editor.
