/**
 * Calcula la distancia en kilómetros entre dos coordenadas geográficas utilizando la fórmula de Haversine.
 *
 * @param {number|string} lat1 - Latitud del punto 1.
 * @param {number|string} lon1 - Longitud del punto 1.
 * @param {number|string} lat2 - Latitud del punto 2.
 * @param {number|string} lon2 - Longitud del punto 2.
 * @returns {number} Distancia en kilómetros. Retorna Infinity si alguna coordenada es inválida.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (
    isNaN(nLat1) ||
    isNaN(nLon1) ||
    isNaN(nLat2) ||
    isNaN(nLon2) ||
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null
  ) {
    return Infinity;
  }

  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
