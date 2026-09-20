# 🏟️ MANUAL DE INICIO — Sistema de Reservas de Complejo Deportivo

> **Arquitectura del sistema:**
> ```
> [React + Vite :5173]  →  [Express + TypeScript :4000]  →  [PostgreSQL :5432 en Docker]
>     Frontend                    Backend                         Base de Datos
> ```

---

## ✅ Requisitos previos

| Herramienta | Versión mínima | Verificar |
|-------------|---------------|-----------|
| Node.js     | 18+           | `node -v` |
| npm         | 9+            | `npm -v`  |
| Docker Desktop | Última estable | `docker -v` |

---

## 📁 Estructura del Proyecto

```
Sistema de Reservas CD/
├── 📄 docker-compose.yml       ← Levanta PostgreSQL en Docker
├── 📁 backend/
│   ├── 📄 .env                 ← Variables de entorno (DB + PORT)
│   └── 📁 src/
│       ├── server.ts           ← Punto de entrada del backend
│       ├── app.ts              ← Express + rutas + middlewares
│       ├── config/
│       │   ├── database.ts     ← Pool de conexión a PostgreSQL
│       │   └── script-database.sql  ← SQL (tablas + datos de prueba)
│       ├── types/              ← Interfaces TypeScript por iteración
│       ├── services/           ← SQL puro + lógica de negocio
│       ├── controllers/        ← Manejo HTTP (req/res)
│       ├── routes/             ← Endpoints REST
│       └── documents/
│           └── canchas.http    ← Pruebas con REST Client
└── 📁 frontend/
    ├── 📄 .env                 ← VITE_API_URL del backend
    └── 📁 src/
        ├── App.tsx             ← Componente raíz
        ├── api/client.ts       ← Cliente HTTP centralizado
        ├── components/         ← Navbar, Hero, Footer...
        └── iteraciones/
            ├── iteracion-1-usuarios/
            ├── iteracion-2-canchas/  ← ✅ IMPLEMENTADO
            ├── iteracion-3-reservas/
            ├── iteracion-4-pagos/
            ├── iteracion-5-eventos/
            └── iteracion-6-reportes/
```

---

## 🚀 Pasos para iniciar (3 terminales en paralelo)

> En VS Code abre 3 terminales con `Ctrl + Shift + `` ` ``

---

### 🐳 TERMINAL 1 — Base de Datos

Desde la **raíz del proyecto**:

```powershell
docker compose up -d
```

**¿Qué hace?**
- Descarga la imagen `postgres:16-alpine` (solo la primera vez)
- Crea el contenedor `complejo_deportivo_db`
- Crea la base de datos `complejo_deportivo`
- Ejecuta `script-database.sql` **automáticamente solo la primera vez** (crea tablas e inserta datos de prueba)

**Verificar que está corriendo:**
```powershell
docker ps
```
Debe aparecer `complejo_deportivo_db` con estado `Up`.

> ⚠️ El script SQL solo se ejecuta en la **primera creación**. Al reiniciar el contenedor, los datos no se pierden.

---

### ⚙️ TERMINAL 2 — Backend

```powershell
cd backend
npm run dev
```

**Salida esperada:**
```
🔄 Verificando conexión con PostgreSQL...
✅ [PostgreSQL] Conexión exitosa a la base de datos 'complejo_deportivo'
====================================================
🚀 Servidor backend escuchando en: http://localhost:4000
📋 API Canchas lista en: http://localhost:4000/api/canchas
🩺 Health check: http://localhost:4000/api/health
====================================================
```

> ❌ Si ves error de conexión, espera 10 segundos y presiona `Ctrl+S` en cualquier archivo del backend para recargar.

---

### 🌐 TERMINAL 3 — Frontend

```powershell
cd frontend
npm run dev
```

Abre el navegador en **http://localhost:5173**

El indicador en la página cambiará de 🟡 *"Modo Demostración"* a 🟢 *"Conectado a PostgreSQL"* cuando el backend esté corriendo.

---

## 🔗 URLs del sistema

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Health Check | http://localhost:4000/api/health |
| API Canchas | http://localhost:4000/api/canchas |

---

## 🗄️ Credenciales de la Base de Datos

Definidas en `docker-compose.yml` y `backend/.env`:

| Campo | Valor |
|-------|-------|
| Host | `localhost` |
| Puerto | `5432` |
| Usuario | `admin` |
| Contraseña | `admin1234` |
| Base de datos | `complejo_deportivo` |

> 💡 Para conectarte desde **DBeaver**, **TablePlus** o **pgAdmin**, usa estas mismas credenciales.

---

## 🧪 Probar la API (sin el Frontend)

Instala la extensión **REST Client** en VS Code y abre:
`backend/src/documents/canchas.http`

O desde PowerShell:
```powershell
# Ver todas las canchas
Invoke-RestMethod -Uri "http://localhost:4000/api/canchas" -Method GET

# Crear una cancha
$body = '{"nombre":"Cancha Test","precio_hora":100}'
Invoke-RestMethod -Uri "http://localhost:4000/api/canchas" -Method POST -Body $body -ContentType "application/json"
```

---

## 🔴 Detener el sistema

```powershell
# Detener Docker (datos conservados)
docker compose stop

# Detener Docker y eliminar el contenedor (datos en volumen conservados)
docker compose down

# Eliminar TODO incluyendo datos ⚠️
docker compose down -v
```

Detener Backend y Frontend: `Ctrl+C` en cada terminal.

---

## ❓ Solución de problemas

### Backend no conecta a PostgreSQL
1. Verifica Docker: `docker ps`
2. Reinicia el contenedor: `docker compose up -d`
3. Confirma que `backend/.env` tiene las mismas credenciales que `docker-compose.yml`

### Puerto 5432 ya está en uso
Ya tienes PostgreSQL instalado localmente. Cambia el puerto en `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"
```
Y en `backend/.env`: `DB_PORT=5433`

### El script SQL no creó las tablas
Ocurre si el contenedor ya existía. Ejecuta manualmente:
```powershell
docker exec -i complejo_deportivo_db psql -U admin -d complejo_deportivo -f /docker-entrypoint-initdb.d/init.sql
```

---

## 🔄 Flujo de comunicación

```
Navegador  →  React (Vite :5173)
                │  fetch('http://localhost:4000/api/canchas')
                ▼
           Express (Node :4000)
           cancha.routes → cancha.controller → cancha.service
                │  pool.query('SELECT * FROM cancha WHERE ...')
                ▼
           PostgreSQL (:5432 en Docker)
```

---

## 📋 Guía para cada equipo de iteración

**Backend** — Sigue el mismo patrón de la Iteración 2:
```
src/types/        → mimodulo.types.ts
src/services/     → mimodulo.service.ts    ← SQL puro aquí
src/controllers/  → mimodulo.controller.ts ← req/res aquí
src/routes/       → mimodulo.routes.ts     ← endpoints aquí
src/documents/    → mimodulo.http          ← pruebas
```

Registrar la ruta en `app.ts`:
```typescript
import miRutas from './routes/mimodulo.routes.js';
app.use('/api/mimodulo', miRutas);
```

**Frontend** — Dentro de `frontend/src/iteraciones/iteracion-X-nombre/`:
```
mimodulo.types.ts  ← tipos del módulo
mimodulo.api.ts    ← llama a api.get(), api.post(), api.patch(), api.delete()
MiComponente.tsx   ← componente React que usa mimodulo.api.ts
```
