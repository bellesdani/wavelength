# La Ruleta de TikTok

Juego gratis para 2 personas inspirado en una ruleta de adivinanza.

Una persona gira la rueda con la tapa cerrada, puede abrirla para ver donde cayo la puntuacion y volver a cerrarla. La otra persona mueve la flecha intentando acertar la zona correcta. Se puede jugar en una sola pantalla o en una sala online.

## Ejecutar

```bash
npm install
npm run dev
```

Abre la URL que muestre Vite en la terminal.

## Modo online

Para jugar en dos ordenadores en la misma sala, arranca tambien el servidor de salas en otra terminal:

```bash
npm run server
```

Por defecto el frontend corre en `http://localhost:3000` y el servidor Socket.IO en `http://localhost:3001`.

## SEO de produccion

Antes de compilar para produccion, define `VITE_SITE_URL` con el dominio publico final. Vite lo usa para generar canonical, Open Graph, sitemap y robots:

```bash
VITE_SITE_URL=https://laruletadetiktok.com npm run build
```

## Produccion con Docker

El despliegue de produccion sirve frontend, backend y Socket.IO desde el mismo dominio. Caddy se encarga del HTTPS.

En el servidor Linux:

```bash
git clone <url-del-repo>
cd wavelength-mini
cp .env.production.example .env
```

Edita `.env`:

```env
SITE_HOST=laruletadetiktok.com
VITE_SITE_URL=https://laruletadetiktok.com
VITE_SOCKET_URL=
CLIENT_ORIGIN=https://laruletadetiktok.com
```

Levanta la app:

```bash
docker compose up -d --build
```

Comprueba:

```bash
docker compose ps
docker compose logs -f app
curl https://laruletadetiktok.com/health
```

Para actualizar:

```bash
git pull
docker compose up -d --build
```
