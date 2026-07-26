# Limpieza programada de imagenes huerfanas

El backend expone `GET /api/internal/cleanup-media` para eliminar archivos multimedia que fueron
subidos, pero nunca quedaron asociados a una publicacion o a un avatar.

## Cuando se ejecuta

Vercel solo acepta horarios UTC, mientras que Chile cambia entre UTC-3 y UTC-4. Para mantener la
ejecucion a medianoche durante todo el año, `vercel.json` programa dos comprobaciones:

- `0 3 * * *` para la medianoche del horario de verano.
- `0 4 * * *` para la medianoche del horario de invierno.

La ruta convierte la hora recibida a `America/Santiago` y solo ejecuta la limpieza cuando la hora
local es `00`. La segunda comprobacion devuelve una respuesta omitida, por lo que el recolector se
ejecuta una sola vez al dia. En el plan Hobby, Vercel puede invocar cada comprobacion en cualquier
momento dentro de la hora programada.

La ejecucion requiere `CRON_SECRET` en las variables de entorno de Vercel. Vercel envia
automaticamente el encabezado:

```text
Authorization: Bearer <CRON_SECRET>
```

Sin ese secreto, la ruta responde `503`. Con un secreto incorrecto, responde `401`.

## Que se considera huerfano

Un registro de `media` se puede eliminar solo si cumple todas estas condiciones:

1. Tiene mas de `MEDIA_ORPHAN_MIN_AGE_HOURS` horas; el valor predeterminado es 2.
2. Si su contexto es `POST`, no tiene ninguna relacion en `post_media`.
3. Si su contexto es `AVATAR`, ningun usuario lo usa como avatar.
4. Conserva un `path` de storage valido.

El periodo de gracia evita borrar una imagen mientras el usuario aun esta completando una
publicacion. Los posts archivados, vendidos o eliminados logicamente conservan sus imagenes mientras
la relacion siga existiendo.

## Orden y tolerancia a fallos

Cada ejecucion procesa primero los registros mas antiguos, con un maximo configurable mediante
`MEDIA_CLEANUP_BATCH_SIZE` (100 por defecto y 1000 como limite).

Antes de cada borrado se vuelve a comprobar que la imagen siga huerfana. Después:

1. Se elimina el objeto desde Supabase Storage mediante su API compatible con S3.
2. Solo si lo anterior resulta correctamente, se elimina el registro de PostgreSQL.

Si falla Storage, el registro queda en la base de datos para reintentar al dia siguiente. La
respuesta informa cuántos registros fueron revisados, eliminados, omitidos o fallaron.

## Prueba manual

Con el backend en ejecucion y las variables configuradas:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:4000/api/internal/cleanup-media
```

No se debe ejecutar manualmente contra produccion sin revisar primero la antiguedad y las relaciones
de los candidatos.
