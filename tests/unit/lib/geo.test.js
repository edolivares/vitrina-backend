import { describe, it, expect } from "vitest";
import { calculateDistanceKm } from "../../../lib/geo.js";

describe("calculateDistanceKm", () => {
  it("debe retornar 0 km cuando las dos coordenadas son idénticas", () => {
    const lat = -33.4489;
    const lng = -70.6693;
    const dist = calculateDistanceKm(lat, lng, lat, lng);
    expect(dist).toBe(0);
  });

  it("debe calcular una distancia aproximada correcta entre Santiago y Valparaíso (~100-115 km)", () => {
    // Plaza de Armas, Santiago
    const santiagoLat = -33.4372;
    const santiagoLng = -70.6506;

    // Plaza Sotomayor, Valparaíso
    const valparaisoLat = -33.036;
    const valparaisoLng = -71.6296;

    const dist = calculateDistanceKm(santiagoLat, santiagoLng, valparaisoLat, valparaisoLng);
    expect(dist).toBeGreaterThan(95);
    expect(dist).toBeLessThan(125);
  });

  it("debe retornar Infinity si alguna de las coordenadas es inválida o nula", () => {
    expect(calculateDistanceKm(null, -70.65, -33.43, -70.65)).toBe(Infinity);
    expect(calculateDistanceKm("invalido", -70.65, -33.43, -70.65)).toBe(Infinity);
  });
});
