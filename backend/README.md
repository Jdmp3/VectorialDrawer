# Backend Go

El backend expone la API local del editor y guarda los nueve espacios en la base PostgreSQL `lienzos_guardados`, en una tabla llamada `lienzo`. La base debe existir antes de iniciar el servidor. La tabla se crea automáticamente al arrancar.

## Configuración

En DBeaver, confirma que la conexión PostgreSQL apunte a:

- Host: `localhost`
- Puerto: `5432`
- Base de datos: `lienzos_guardados`
- Usuario: `postgres`

Abre una terminal en `backend/` y configura la contraseña solo en esa sesión. No la guardes en Git ni la compartas en el chat:

```bash
export DATABASE_URL='postgres://postgres:TU_CONTRASENA@localhost:5432/lienzos_guardados?sslmode=disable'
```

Si la contraseña contiene caracteres reservados de URL, deben codificarse en porcentaje. Después, en el primer uso, descarga la dependencia y arranca el backend manualmente:

```bash
go mod tidy
go run .
```

Por defecto, la API escucha solo en `127.0.0.1:8080`. Para cambiar la dirección se puede definir `API_ADDR`; para permitir otro origen de frontend, `CORS_ORIGINS` acepta orígenes separados por comas.

## Endpoints

- `GET /api/health`: comprueba la conexión con PostgreSQL.
- `GET /api/slots`: devuelve los nueve espacios; los vacíos son `null`.
- `GET /api/slots/{espacio}`: obtiene un lienzo guardado.
- `PUT /api/slots/{espacio}`: crea o reemplaza un espacio.
- `DELETE /api/slots/{espacio}`: borra un espacio.
- `POST /api/slots/migrate`: importa en una sola transacción los espacios antiguos del navegador, únicamente si la tabla está vacía.

El número de espacio va de `0` a `8`. La tabla guarda el contenido del lienzo en JSONB y su fecha en `TIMESTAMPTZ`.

## Frontend

El frontend usa `http://localhost:8080` por defecto. Si la API usa otra dirección, define `VITE_API_URL` en el entorno de Vite. Arranca el frontend desde la raíz del proyecto con `npm run dev`.
