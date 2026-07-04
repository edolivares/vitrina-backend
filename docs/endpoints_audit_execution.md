# Informe de Auditoría de Endpoints API - Vitrina

**Fecha de ejecución**: 03-07-2026, 8:39:11 p. m.
**Servidor auditado**: http://localhost:4000

| Endpoint | Método | Estado Esperado | Estado Obtenido | Resultado | Info Extra |
| --- | --- | --- | --- | --- | --- |
| `/` | **GET** | 200 | 200 | **✅ PASSED** | Message: "API REST Vitrina en línea" |
| `/api/locations/regions` | **GET** | 200 | 200 | **✅ PASSED** | Regiones: 16 |
| `/api/locations/regions/13/cities` | **GET** | 200 | 200 | **✅ PASSED** | Comunas en RM: 52 |
| `/api/posts` | **GET** | 200 | 200 | **✅ PASSED** | Publicaciones: 3 |
| `/api/posts?search=Guitarra` | **GET** | 200 | 200 | **✅ PASSED** | Búsqueda "Guitarra": 1 |
| `/api/posts/1a3d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f` | **GET** | 200 | 200 | **✅ PASSED** | Guitarra: "Guitarra Electroacústica Fender FA-125CE" |
| `/api/profiles/d9b3a4f6-8c1d-4b5a-90e8-0d1e2f3a4b5c` | **GET** | 200 | 200 | **✅ PASSED** | Perfil Diego: "Diego Valdivia" |
| `/api/auth/me` | **GET** | 401 | 401 | **✅ PASSED** | Middleware Bloqueó Correctamente |
| `/api/posts/me` | **GET** | 401 | 401 | **✅ PASSED** | Middleware Bloqueó Correctamente |
| `/api/posts/draft` | **POST** | 401 | 401 | **✅ PASSED** | Middleware Bloqueó Correctamente |
| `/api/chats` | **GET** | 401 | 401 | **✅ PASSED** | Middleware Bloqueó Correctamente |
| `/api/saved-posts` | **GET** | 401 | 401 | **✅ PASSED** | Middleware Bloqueó Correctamente |
| `/api/auth/login` | **POST** | 200 | 200 | **✅ PASSED** | Token de acceso obtenido |
| `/api/auth/me (Authed)` | **GET** | 200 | 200 | **✅ PASSED** | Usuario: Diego Valdivia |
| `/api/posts/draft` | **POST** | 201 | 201 | **✅ PASSED** | Draft ID: 841ecdaf-c42f-48af-9890-a7d1cadf7ece |
| `/api/posts/841ecdaf-c42f-48af-9890-a7d1cadf7ece` | **PUT** | 200 | 200 | **✅ PASSED** | Publicación editada y activada |
| `/api/posts/me` | **GET** | 200 | 200 | **✅ PASSED** | Borrador listado en panel |
| `/api/posts/841ecdaf-c42f-48af-9890-a7d1cadf7ece` | **DELETE** | 200 | 200 | **✅ PASSED** | Publicación eliminada correctamente |
| `/api/auth/logout` | **POST** | 200 | 200 | **✅ PASSED** | Logout exitoso |
