import express from 'express';
import cors from 'cors';
import { autenticar } from './middleware/auth.js';
import { manejadorErrores, rutaNoEncontrada } from './middleware/errores.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasProductos } from './rutas/productos.js';
import { rutasClientes } from './rutas/clientes.js';

export const app = express();

app.disable('x-powered-by');

// S6: CORS solo para el origen exacto de la SPA, configurado en .env. Nunca '*'.
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

// Única ruta sin token.
app.use('/api/auth', rutasAuth);

// Todo lo demás exige Authorization: Bearer <token> (A2).
app.use('/api', autenticar);
app.use('/api/productos', rutasProductos);
app.use('/api/clientes', rutasClientes);
// Pendiente (ver docs/continuacion.md): actividades, oportunidades y reportes.

app.use(rutaNoEncontrada);
app.use(manejadorErrores);
