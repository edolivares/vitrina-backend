# Logica de autenticacion con refresh token

Este flujo define la base de autenticacion para Vitrina.

## Objetivo

Evitar access tokens largos. Un token principal de 7 dias es riesgoso porque, si se filtra, permite usar la cuenta durante demasiado tiempo sin que el backend pueda revocarlo facilmente.

La sesion se divide en dos piezas:

- Access token corto: se usa para consumir la API.
- Refresh token largo: se usa solo para renovar el access token.

## Duraciones

- Access token: 15 minutos.
- Refresh token: 14 dias.

Estos valores se configuran en variables de entorno:

```env
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN_DAYS=14
```

## Login

Endpoint:

```http
POST /api/auth/login
```

Flujo:

1. El usuario envia email y password.
2. El backend valida las credenciales.
3. Si son correctas, genera un access token con duracion corta.
4. Tambien genera un refresh token opaco y aleatorio.
5. El backend guarda en base de datos solo el hash del refresh token.
6. El refresh token real se envia al navegador como cookie.
7. El response entrega el access token en el body.

La cookie del refresh token debe ser:

- `HttpOnly`: JavaScript del frontend no puede leerla.
- `Secure`: activa en produccion con HTTPS.
- `SameSite`: configurable segun ambiente.
- `Path=/api/auth`: solo se envia a endpoints de autenticacion.

## Uso del access token

El frontend usa el access token para llamar rutas privadas:

```http
Authorization: Bearer <access_token>
```

El access token no se guarda como cookie. La recomendacion es mantenerlo en memoria o en el estado de la aplicacion.

## Refresh

Endpoint:

```http
POST /api/auth/refresh
```

Flujo:

1. El frontend llama el endpoint cuando el access token expira o recibe `401 Token expirado`.
2. El navegador envia automaticamente la cookie `refreshToken`.
3. El backend hashea el refresh token recibido.
4. Busca ese hash en la tabla `refresh_tokens`.
5. Rechaza si no existe, expiro o fue revocado.
6. Si es valido, genera un nuevo access token.
7. Devuelve el nuevo access token en el body.

El refresh token no se expone al JavaScript del frontend.

## Logout

Endpoint:

```http
POST /api/auth/logout
```

Flujo:

1. El navegador envia la cookie `refreshToken`.
2. El backend busca el hash del token.
3. Marca el refresh token como revocado con `revoked_at`.
4. Limpia la cookie en el response.
5. El frontend elimina su access token local.

## Persistencia

Tabla:

```text
refresh_tokens
```

Campos principales:

- `id`: UUID interno del refresh token.
- `user_id`: usuario asociado.
- `token_hash`: hash del refresh token, nunca el token plano.
- `expires_at`: vencimiento absoluto.
- `revoked_at`: fecha de revocacion, nullable.
- `created_at`: fecha de creacion.

Regla importante: si la base de datos se filtra, los refresh tokens guardados no deben poder usarse directamente.

## Politica base

- El access token dura poco y no es revocable por si mismo.
- El refresh token dura 14 dias y si es revocable.
- El refresh token vive en cookie `HttpOnly`.
- El backend solo almacena hash del refresh token.
- El logout revoca el refresh token y limpia la cookie.
- Si el refresh token expira o esta revocado, el usuario debe iniciar sesion nuevamente.
