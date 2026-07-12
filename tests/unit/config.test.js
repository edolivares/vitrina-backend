import { describe, expect, it } from "vitest";
import { resolveCookieConfig } from "../../lib/config.js";

describe("Configuración de cookies", () => {
  it("fuerza una cookie cross-site segura en producción", () => {
    const cookies = resolveCookieConfig({
      production: true,
      secure: "false",
      sameSite: "lax",
    });

    expect(cookies.secure).toBe(true);
    expect(cookies.sameSite).toBe("none");
  });

  it("mantiene defaults compatibles con desarrollo local", () => {
    const cookies = resolveCookieConfig({
      production: false,
      secure: undefined,
      sameSite: undefined,
    });

    expect(cookies.secure).toBe(false);
    expect(cookies.sameSite).toBe("lax");
  });
});
