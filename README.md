# Especificaciones generales del Sistema

## API
Api Rest

## ORM
Sin ningun ORM (hacer consultas sql puras desde los servicios)

## Lenguaje
TypeScript

## Pruebas Backend
Postman o Rest Client

## Flujo de procesos
CLIENTE -- (HTTP) --> ROUTE ---> CONTROLLER ---> SERVICE ---> SQL / BD ---> SERVICE ---> CONTROLLER ---> RESPONSE

## Rol de cada archivo
### Config/
Configuraciones externas de la aplicacion , como la base de datos , consumir APIs de otras aplicaciones , etc. Por ejenplo : 
database.ts

### Types/
Aqui colocamos todos los tipos que usaremos , ejemplo: 
user.types.ts ( puede ser interfaz o type [recomendado] )

### Services/
Aqui debe estar toda la logica de negocio (si trabajaremos sin ORM , aqui hacemos las consultas sql y control de errores), el servicio es el proveedor de datos , el que se comunica con la BD

### Controllers/
El controlador se encarga de Recibir HTTP y devolver HTTP (request , response) el controlador es el que llama al servicio adecuado

### Routes/
En esta carpeta se van a documentar y ordenar todas las rutas en archivos por iteraciones , por ejemplo: 
user.router.ts

### Documents/
Archivos Para la prueba de la API , rest Client o postman

### app.ts
Aqui se configura Express y conectamos las rutas

### server.ts
Aqui levantamos el servidor

# Documentacion de la API por iteracion

## 1 Gestion de usuarios
## 2 Gestion de canchas

CRUD canchas:
```ts
GET /api/canchas
```
```ts
POST /api/canchas
```
```ts
PATCH /api/canchas/{id}
```
```ts
DELETE /api/canchas/{id}
```
## 3 Gestion de Reservas
## 4 Gestion de Pagos
## 5 Eventos y servicios sociales
## 6 Elaboracion de reportes y notificaciones




