# Reporte de Auditoría Técnica: Vitrina Backend (Hito 3)

Este documento presenta el resultado de la auditoría de seguridad, arquitectura y endpoints realizada al proyecto backend de Vitrina Marketplace, con el objetivo de asegurar una entrega libre de fallas para el Hito 3.

---

## 1. Auditoría de Seguridad y Middleware

### A. Autenticación y Autorización (JWT)
* **Middleware de Validación:** auth.middleware.js valida correctamente el token Bearer en la cabecera Authorization. Posee un manejo estructurado de errores específicos (TokenExpiredError, JsonWebTokenError) devolviendo el código de estado 401 Unauthorized de forma correcta.
* **Control de Sesión (Refresh Tokens):** El flujo de renovación utiliza tokens persistidos de forma segura mediante hashes únicos (tokenHash) en la tabla refresh_tokens. Se envían al cliente utilizando una cookie HttpOnly (refreshToken) configurada con directivas de seguridad (secure, sameSite: lax/strict). Esto mitiga eficazmente ataques XSS y robo de credenciales.
* **Cifrado:** Las contraseñas se encriptan correctamente en el registro y se verifican en el login mediante bcryptjs.

### B. Validación de Entrada (Zod)
* Todos los endpoints de entrada de datos (POST, PUT, DELETE con parámetros de ruta como UUIDs) están blindados con middlewares específicos (validateBody y validateParams) usando esquemas declarativos en Zod.
* Esto previene ataques por inyección de esquemas, payloads corruptos o inconsistencias de tipos en base de datos.

### C. Prevención de Abuso (Rate Limiting y CORS)
* **Rate Limits:** Se implementó express-rate-limit con políticas segmentadas y adaptadas al tipo de ruta (p. ej., límites estrictos de 5 peticiones por hora en registro, 10 en inicio de sesión, y límites más amplios para consultas generales).
* **CORS:** La protección CORS verifica de forma estricta los orígenes permitidos leyendo de la variable CORS_ALLOWED_ORIGINS. Si el origen no coincide, retorna un error de estado 403.
* **Helmet:** Añade las cabeceras HTTP de seguridad recomendadas por OWASP.

---

## 2. Auditoría Arquitectónica y Base de Datos

### A. Capa de Datos (Prisma ORM & PostgreSQL)
* **Desacoplamiento:** El uso de Prisma ORM aísla la base de datos de consultas crudas que introducen riesgos de inyección SQL (SQLi).
* **Migraciones y Seeders:** Las tablas, tipos enumerados (PostStatus, PostCondition, MediaContext) y relaciones están completamente documentados en schema.prisma. El seeder (seed.js) inicializa adecuadamente las regiones y comunas oficiales chilenas.
* **Reglas de Integridad:** Se implementó ON DELETE CASCADE en las claves foráneas más críticas (post_media, saved_posts, chats, messages) garantizando que al eliminar una entidad (como un borrador descartado), no queden registros huérfanos en la base de datos.

### B. Gestión de Paquetes y Entorno (pnpm)
* El proyecto está configurado con pnpm, y la propiedad minimumReleaseAge: 2880 en pnpm-workspace.yaml limita el uso de librerías extremadamente nuevas para mitigar ataques de inyección de malware del tipo supply-chain (contaminación de paquetes npm recién lanzados).

---

## 3. Auditoría de Lógica de Endpoints

### A. Flujo de Auto-Drafts y Límites
* El endpoint de inicialización de borradores (POST /api/posts/draft) cuenta de forma asíncrona los borradores activos (status = 'DRAFT', deletedAt = null).
* Si el conteo supera el límite estricto de 5 borradores activos, el servidor detiene la operación lanzando un estado 403 Forbidden (protegiendo el almacenamiento físico contra bots).

### B. Borrado Lógico (Soft Delete)
* El endpoint DELETE /api/posts/:id no elimina físicamente los registros, sino que les asigna una marca de tiempo en deletedAt. Esto permite que la mensajería histórica (messages) y los marcadores de favoritos (saved_posts) no pierdan integridad referencial, mostrando de manera amigable que el producto ya no se encuentra a la venta.

### C. Autorización a Nivel de Registro (IDOR Prevention)
* Todas las acciones que alteran el estado del recurso (guardar, archivar, reactivar, borrar y adjuntar media) realizan una comprobación explícita para asegurar que el userId que realiza la petición sea el mismo que creó la publicación:
  ```javascript
  if (post.userId !== userId) {
      const err = new Error("No estás autorizado para modificar esta publicación");
      err.statusCode = 403;
      throw err;
  }
  ```
  Esto bloquea por completo vulnerabilidades de autorización de tipo Insecure Direct Object Reference (IDOR).

### D. Privacidad de Publicaciones No Activas
* Los endpoints para obtener el detalle de una publicación (GET /api/posts/:id) restringen la visualización de publicaciones en estado DRAFT o ARCHIVED únicamente al creador de la misma. Para usuarios ajenos, responde un estado 404 Not Found, ocultándolas del público.

---

## 4. Pruebas Automatizadas

Se verificó el set completo de pruebas del proyecto:
* **Framework:** vitest y supertest.
* **Resultado:** 56 pruebas exitosas en 9 archivos de tests.
* **Mocking:** Las llamadas a Prisma están perfectamente simuladas (mocked), lo cual permite ejecutar los tests sin depender de un servidor PostgreSQL local corriendo durante las fases de integración continua o testing unitario.

---

## 5. Colecciones de Endpoints Generadas

Se han estructurado y agregado dos colecciones listas para importar en la carpeta docs/collections:

1. **Thunder Client:** thunder-collection_vitrina.json
2. **Postman:** postman-collection_vitrina.json

Ambas colecciones incluyen:
* Estructura ordenada de carpetas correspondiente al ciclo de vida del backend: Autenticación, Ubicaciones, Publicaciones, Media, Chats y Mensajería, Perfiles Públicos, Favoritos.
* Payloads de ejemplo (JSON) para el registro de usuarios, inicios de sesión, creación de borradores y mensajería.
* Soporte para variables globales como {{base_url}} (apunta a http://localhost:4000) y {{token}} para la autorización Bearer de cabeceras en rutas protegidas.
* Script de prueba en la solicitud de Login para guardar automáticamente el token de acceso obtenido en las variables locales de Postman.
