import { describe, expect, it } from "vitest";
import { assertDeleteObjectsSucceeded } from "../../../services/storage.service.js";

describe("Eliminacion de objetos S3", () => {
  it("acepta una respuesta sin errores por objeto", () => {
    expect(() =>
      assertDeleteObjectsSucceeded({ Deleted: [{ Key: "posts/image.webp" }] })
    ).not.toThrow();
  });

  it("rechaza una respuesta con errores aunque S3 haya respondido correctamente", () => {
    expect(() =>
      assertDeleteObjectsSucceeded({
        Errors: [{ Key: "posts/image.webp", Code: "AccessDenied" }],
      })
    ).toThrow("S3 no pudo eliminar 1 archivo(s)");
  });
});
