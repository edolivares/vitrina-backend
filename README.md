# Vitrina Backend

[![Backend CI](https://github.com/edolivares/vitrina-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/edolivares/vitrina-backend/actions) [![codecov](https://codecov.io/github/edolivares/vitrina-backend/graph/badge.svg?token=FP518U03XL)](https://codecov.io/github/edolivares/vitrina-backend)

![NodeJS](https://img.shields.io/badge/Node.js-6DA55F?style=flat-square&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-7A9B57?style=flat-square&logo=vitest&logoColor=white)

API REST para el proyecto Vitrina Marketplace.

## Tecnologías

- Node.js con ES Modules
- Express 4
- Prisma ORM
- PostgreSQL
- pnpm con `pnpm-workspace.yaml`
- Zod para validaciones
- JWT para autenticación
- Vitest y Supertest para pruebas
- Swagger UI para documentación de API
- Sharp para procesamiento de imágenes

## Requisitos

- Node.js instalado
- pnpm instalado
- PostgreSQL corriendo localmente
- Base de datos local creada, por ejemplo `vitrina`

Ejemplo local usado por el proyecto:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vitrina?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/vitrina?schema=public"
```

## Instalación

Instalar dependencias:

```bash
pnpm install
```

Crear el archivo de entorno desde el ejemplo:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Editar `.env` con las credenciales reales de PostgreSQL local.

## Base de datos

Aplicar migraciones en desarrollo:

```bash
pnpm db:migrate
```

Cargar datos base, como regiones y comunas:

```bash
pnpm db:seed
```

Si la base local queda en mal estado durante pruebas, se puede resetear:

```bash
pnpm db:reset
```

Este comando elimina y recrea la estructura de la base de datos usando las migraciones. También ejecuta el seed configurado por Prisma.

Para producción o ambientes de despliegue se debe usar:

```bash
pnpm db:migrate:deploy
```

Ese comando solo aplica migraciones existentes. No crea migraciones nuevas.

## Desarrollo

Levantar el servidor en modo desarrollo:

```bash
pnpm dev
```

Por defecto usa el puerto configurado en `.env`:

```env
PORT=4000
```

## Producción

Aplicar migraciones pendientes:

```bash
pnpm db:migrate:deploy
```

Iniciar servidor:

```bash
pnpm start
```

## Pruebas

Ejecutar pruebas:

```bash
pnpm test
```

Modo watch:

```bash
pnpm test:watch
```

## Prisma

El proyecto usa:

- `prisma/schema.prisma` como definición actual del modelo de datos.
- `prisma/migrations/` como historial de cambios de base de datos.
- `prisma/seed.js` para datos base.
- `prisma.config.js` para configurar schema, migraciones y seed.

Cuando existe `prisma.config.js`, Prisma muestra el mensaje:

```text
Prisma config detected, skipping environment variable loading.
```

Eso significa que Prisma no carga `.env` automáticamente desde su flujo interno. En este proyecto el archivo `prisma.config.js` importa `dotenv/config`, por lo que las variables de `.env` igualmente quedan disponibles.
