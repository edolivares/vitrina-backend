# Vitrina Backend

[![Backend CI](https://github.com/edolivares/vitrina-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/edolivares/vitrina-backend/actions) [![codecov](https://codecov.io/github/edolivares/vitrina-backend/graph/badge.svg?token=FP518U03XL)](https://codecov.io/github/edolivares/vitrina-backend)

![NodeJS](https://img.shields.io/badge/Node.js-6DA55F?style=flat-square&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-7A9B57?style=flat-square&logo=vitest&logoColor=white)

API REST para la plataforma Vitrina Marketplace. Este repositorio contiene toda la lógica de negocio, persistencia de datos, autenticación, procesamiento de imágenes y la suite de pruebas unitarias y de integración del backend.

---

## 🚀 Guía de Instalación e Inicio Rápido

Sigue estos sencillos pasos para levantar el entorno de desarrollo desde cero en tu máquina local:

### 1. Prerrequisitos
Asegúrate de contar con las siguientes herramientas instaladas en tu sistema:
* **Node.js** (versión 20 o superior recomendada)
* **pnpm** (versión 11 o superior recomendada)
* **PostgreSQL** corriendo localmente

---

### 2. Clonar e Instalar Dependencias
Clona el repositorio e instala las dependencias del proyecto utilizando `pnpm`, y luego genera el cliente de Prisma:
```bash
pnpm install
pnpm exec prisma generate
```
*(Nota: El comando `prisma generate` es indispensable para compilar localmente los conectores de la base de datos dentro de tu `node_modules`).*

---

### 3. Configurar Variables de Entorno (`.env`)
Duplica el archivo de ejemplo para crear tu configuración local:

* En **Linux / macOS**:
  ```bash
  cp .env.example .env
  ```
* En **Windows (PowerShell)**:
  ```powershell
  copy .env.example .env
  ```

Abre el archivo `.env` recién creado en tu editor y configura los siguientes parámetros clave:
1. **Base de Datos**: Modifica las credenciales de conexión para apuntar a tu servidor PostgreSQL local (asegúrate de crear previamente la base de datos vacía, por ejemplo, llamada `vitrina`):
   ```env
   DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/vitrina?schema=public"
   DIRECT_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/vitrina?schema=public"
   ```
2. **Firma Secreta JWT**: Genera una firma segura aleatoria desde tu consola:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copia el string resultante y asígnalo a la variable `JWT_SECRET` en tu archivo `.env`.

---

### 4. Inicializar Base de Datos (Migraciones y Semilla)
Ejecuta las migraciones de Prisma para crear la estructura de tablas y relaciones, e inicializa la base de datos con los datos geográficos de Chile (regiones y comunas) y usuarios de prueba:

* **Configuración inicial**:
  ```bash
  pnpm db:migrate
  pnpm db:seed
  ```
* **Restauración/Reset (Opcional)**: Si en cualquier momento deseas limpiar la base de datos por completo y volver a ejecutar las migraciones y la semilla desde cero, puedes correr:
  ```bash
  pnpm db:reset
  ```

---

### 5. Levantar el Servidor de Desarrollo
Inicia la aplicación en modo observador (`watch`):
```bash
pnpm dev
```

El servidor levantará por defecto en: **`http://localhost:4000`**

---

### 6. Documentación Interactiva de la API (Swagger UI)
Una vez que el servidor esté corriendo, puedes explorar, probar e interactuar con todos los endpoints disponibles del backend ingresando a:
👉 **`http://localhost:4000/api-docs`**

---

## 🧪 Pruebas Automatizadas y Cobertura

El proyecto cuenta con una suite completa de pruebas unitarias, de integración y endpoints HTTP utilizando **Vitest** y **Supertest**. Todas las llamadas a base de datos en los tests están mockeadas, por lo que las pruebas corren de manera aislada e inmediata.

* **Ejecutar todos los tests**:
  ```bash
  pnpm run test
  ```
* **Ejecutar tests en modo watch**:
  ```bash
  pnpm run test:watch
  ```
* **Generar reporte de cobertura (Coverage)**:
  ```bash
  npx vitest run --coverage
  ```
  *(El reporte detallado se generará en la carpeta `/coverage` y el resumen se mostrará en la terminal).*

---

## 🛠️ Calidad de Código (Linter y Formateador)

El proyecto utiliza **ESLint** (con configuración plana v9) y **Prettier** para mantener un código limpio, legible y libre de errores de estilo:

* **Escanear problemas**:
  ```bash
  pnpm run lint
  ```
* **Corregir problemas de formato automáticamente**:
  ```bash
  pnpm run lint:fix
  ```

---

## 📦 Producción y Despliegue

Para desplegar la aplicación en entornos de producción o staging, sigue estas pautas:

### 1. Variables de Entorno en Producción
Asegúrate de configurar las siguientes variables críticas en tu proveedor de hosting:
* `NODE_ENV="production"`
* `COOKIE_SECURE=true` (requiere HTTPS activo)
* `COOKIE_SAME_SITE="none"` (si el frontend se hospeda en un dominio distinto)

### 2. Aplicar Migraciones Pendientes
En producción **no** debes usar comandos de desarrollo o interactivos. Para aplicar de forma segura el historial de migraciones existente sobre la base de datos de producción, ejecuta:
```bash
pnpm db:migrate:deploy
```
*(Este comando corre `prisma migrate deploy` de forma silenciosa y segura).*

### 3. Iniciar el Servidor
Para arrancar el backend de forma eficiente y sin herramientas de desarrollo (`nodemon`), ejecuta:
```bash
pnpm start
```

---

## 📁 Estructura del Repositorio

A continuación se detalla la organización de carpetas del proyecto:
* 📂 **`prisma/`**: Contiene la definición del esquema del modelo de datos (`schema.prisma`), el archivo de configuración del ORM (`prisma.config.js`), las migraciones generadas y el script de carga base (`seed.js`).
* 📂 **`routes/`**: Controladores de enrutamiento agrupados por módulos (usuarios, publicaciones, ubicaciones, mensajería). Contiene la subcarpeta `docs/` con las especificaciones de Swagger.
* 📂 **`services/`**: Lógica de negocio de la aplicación (consultas Prisma, procesamiento y guardado de imágenes, cálculo de métricas).
* 📂 **`middlewares/`**: Interceptores de Express para validaciones de esquemas (Zod), límites de tasa de peticiones (Rate Limiters) y autenticación segura por tokens.
* 📂 **`schemas/`**: Esquemas de validación Zod que protegen el backend validando la estructura de los datos de entrada.
* 📂 **`tests/`**: Suite de pruebas dividida en pruebas de características (`feature/`), de integración (`integration/`) y unitarias (`unit/`).
* 📂 **`lib/`**: Configuraciones generales de la app (puertos, CORS, carga de variables de entorno, etc.).
