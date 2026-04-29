# Wavelength Mini

Mini juego local para 2 personas inspirado en Wavelength.

La idea es usar una ruleta física en pantalla: una persona gira la rueda con la tapa cerrada, puede abrirla para ver dónde cayó la puntuación y volver a cerrarla. La otra persona mueve la flecha intentando acertar la zona correcta. Todo ocurre en una sola pantalla, sin temas, textos ni navegación.

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
