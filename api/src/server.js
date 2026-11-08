import { app } from './app.js';
import { pool } from './db.js';

// Configuración obligatoria: sin ella la API no arranca.
const faltantes = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'CORS_ORIGIN'].filter((v) => !process.env[v]);
if (faltantes.length) {
  console.error(`Faltan variables en api/.env: ${faltantes.join(', ')}. Copie .env.example como .env.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET debe tener al menos 32 caracteres aleatorios.');
  process.exit(1);
}
if (process.env.CORS_ORIGIN.trim() === '*') {
  console.error('CORS_ORIGIN no puede ser *: escriba el origen exacto de la SPA.');
  process.exit(1);
}

try {
  await pool.query('SELECT 1');
} catch (e) {
  console.error('No se pudo conectar a MySQL:', e.message);
  process.exit(1);
}

const puerto = Number(process.env.PORT ?? 3000);
app.listen(puerto, () => {
  console.log(`API escuchando en http://localhost:${puerto}/api (CORS: ${process.env.CORS_ORIGIN})`);
});
