const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

const canchas = [
  // 3 FUTBOL
  { id: 1, nombre: 'Cancha Central de Fútbol 11', disciplina: 'futbol', capacidad: 22, precio: 120, estado: 'disponible', ubicacion: 'Bloque A - Planta baja', largo: 105, ancho: 68, hora_a: '07:00:00', hora_c: '23:00:00' },
  { id: 2, nombre: 'Cancha de Fútbol 8 - Sintético', disciplina: 'futbol', capacidad: 16, precio: 100, estado: 'disponible', ubicacion: 'Bloque A - Campo Auxiliar', largo: 65, ancho: 45, hora_a: '07:00:00', hora_c: '23:00:00' },
  { id: 3, nombre: 'Cancha de Fútbol 7 - Los Pinos', disciplina: 'futbol', capacidad: 14, precio: 85, estado: 'disponible', ubicacion: 'Sector Sur - Campo C', largo: 50, ancho: 30, hora_a: '07:00:00', hora_c: '23:00:00' },

  // 2 FUTSAL
  { id: 4, nombre: 'Cancha Futsal Techada Pro', disciplina: 'futsal', capacidad: 10, precio: 90, estado: 'disponible', ubicacion: 'Bloque A - Piso 1', largo: 40, ancho: 20, hora_a: '07:00:00', hora_c: '23:00:00' },
  { id: 5, nombre: 'Cancha Futsal Sintética Lateral', disciplina: 'futsal', capacidad: 10, precio: 80, estado: 'disponible', ubicacion: 'Sector C - Lateral', largo: 40, ancho: 20, hora_a: '07:00:00', hora_c: '23:00:00' },

  // 2 PADEL
  { id: 6, nombre: 'Cancha Pádel 1 - Cristal Panorámica', disciplina: 'padel', capacidad: 4, precio: 80, estado: 'disponible', ubicacion: 'Bloque C - Exterior Cristal', largo: 20, ancho: 10, hora_a: '06:00:00', hora_c: '23:30:00' },
  { id: 7, nombre: 'Cancha Pádel 2 - Pro Master', disciplina: 'padel', capacidad: 4, precio: 80, estado: 'disponible', ubicacion: 'Bloque C - Exterior Master', largo: 20, ancho: 10, hora_a: '06:00:00', hora_c: '23:30:00' },

  // 3 TENIS
  { id: 8, nombre: 'Cancha Tenis 1 - Polvo de Ladrillo', disciplina: 'tenis', capacidad: 4, precio: 95, estado: 'disponible', ubicacion: 'Sector Tenis - Cancha Principal', largo: 23.77, ancho: 10.97, hora_a: '06:30:00', hora_c: '22:00:00' },
  { id: 9, nombre: 'Cancha Tenis 2 - Cemento Rápida', disciplina: 'tenis', capacidad: 4, precio: 85, estado: 'disponible', ubicacion: 'Sector Tenis - Cancha Azul', largo: 23.77, ancho: 10.97, hora_a: '06:30:00', hora_c: '22:00:00' },
  { id: 10, nombre: 'Cancha Tenis 3 - Césped Sintético', disciplina: 'tenis', capacidad: 4, precio: 90, estado: 'disponible', ubicacion: 'Sector Tenis - Cancha Verde', largo: 23.77, ancho: 10.97, hora_a: '06:30:00', hora_c: '22:00:00' },

  // 2 BASQUET
  { id: 11, nombre: 'Coliseo Central de Básquetbol', disciplina: 'basquet', capacidad: 10, precio: 80, estado: 'disponible', ubicacion: 'Bloque B - Piso 1 Coliseo', largo: 28, ancho: 15, hora_a: '07:00:00', hora_c: '22:30:00' },
  { id: 12, nombre: 'Cancha Básquet Exterior - Tablado', disciplina: 'basquet', capacidad: 10, precio: 65, estado: 'disponible', ubicacion: 'Explanada Deportiva Norte', largo: 28, ancho: 15, hora_a: '07:00:00', hora_c: '22:00:00' },

  // 4 VOLEY
  { id: 13, nombre: 'Cancha Voleibol 1 - Arena Playa', disciplina: 'voley', capacidad: 12, precio: 60, estado: 'disponible', ubicacion: 'Sector Playa & Solarium', largo: 16, ancho: 8, hora_a: '08:00:00', hora_c: '21:00:00' },
  { id: 14, nombre: 'Cancha Voleibol 2 - Arena Pro', disciplina: 'voley', capacidad: 12, precio: 60, estado: 'disponible', ubicacion: 'Sector Playa - Cancha Sur', largo: 16, ancho: 8, hora_a: '08:00:00', hora_c: '21:00:00' },
  { id: 15, nombre: 'Cancha Voleibol 3 - Sala Techada', disciplina: 'voley', capacidad: 12, precio: 70, estado: 'disponible', ubicacion: 'Bloque B - Sala Techada Polideportiva', largo: 18, ancho: 9, hora_a: '07:00:00', hora_c: '22:00:00' },
  { id: 16, nombre: 'Cancha Voleibol 4 - Pista Rápida', disciplina: 'voley', capacidad: 12, precio: 70, estado: 'disponible', ubicacion: 'Bloque B - Pista Rápida', largo: 18, ancho: 9, hora_a: '07:00:00', hora_c: '22:00:00' },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of canchas) {
      await client.query(`
        INSERT INTO cancha (id_cancha, nombre, disciplina, capacidad, precio_hora, estado, ubicacion, largo, ancho, hora_apertura, hora_cierre)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id_cancha) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          disciplina = EXCLUDED.disciplina,
          capacidad = EXCLUDED.capacidad,
          precio_hora = EXCLUDED.precio_hora,
          estado = EXCLUDED.estado,
          ubicacion = EXCLUDED.ubicacion,
          largo = EXCLUDED.largo,
          ancho = EXCLUDED.ancho,
          hora_apertura = EXCLUDED.hora_apertura,
          hora_cierre = EXCLUDED.hora_cierre
      `, [c.id, c.nombre, c.disciplina, c.capacidad, c.precio, c.estado, c.ubicacion, c.largo, c.ancho, c.hora_a, c.hora_c]);
    }
    // Delete test canchas > 16 if not in reserva
    await client.query('DELETE FROM cancha WHERE id_cancha > 16 AND id_cancha NOT IN (SELECT id_cancha FROM reserva)');
    await client.query("SELECT setval('cancha_id_cancha_seq', (SELECT MAX(id_cancha) FROM cancha))");
    await client.query('COMMIT');
    console.log('EXITO: 16 canchas insertadas/actualizadas.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR AL RELLENAR CANCHAS:', err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
