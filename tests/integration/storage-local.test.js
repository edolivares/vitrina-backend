import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const storageRoot = path.resolve(process.cwd(), "tests/fixtures/storage-runtime");

const createImageBuffer = ({ width = 80, height = 80, format = "png" } = {}) => {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#6366f1",
    },
  });

  return image[format]().toBuffer();
};

vi.mock("../../lib/database.js", () => ({
  prisma: {
    media: {
      create: vi.fn(async ({ data }) => data),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    post: { findUnique: vi.fn() },
    postMedia: { count: vi.fn(), upsert: vi.fn() },
  },
}));

const loadStorageModule = async ({ avatarMaxFileSizeMb = "2", postMaxFileSizeMb = "10" } = {}) => {
  vi.resetModules();
  process.env.STORAGE_STRATEGY = "local";
  process.env.STORAGE_LOCAL_DIR = "./tests/fixtures/storage-runtime";
  process.env.STORAGE_BUCKET = "media";
  process.env.CDN_BASE_URL = "http://localhost:4000/storage";
  process.env.MEDIA_AVATAR_MAX_FILE_SIZE_MB = avatarMaxFileSizeMb;
  process.env.MEDIA_POST_MAX_FILE_SIZE_MB = postMaxFileSizeMb;
  process.env.MEDIA_ALLOWED_MIME_TYPES = "image/jpeg,image/png,image/webp,image/avif";

  return import("../../services/storage.service.js");
};

describe("Storage local compatible con bucket", () => {
  beforeEach(async () => {
    await fs.rm(storageRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(storageRoot, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("guarda, verifica y elimina archivos usando una key interna", async () => {
    const { LocalStorageService } = await loadStorageModule();
    const storage = new LocalStorageService();
    const filePath = "posts/post-uuid/media-uuid.webp";

    await storage.uploadFile(filePath, Buffer.from("contenido"), "image/webp");

    const storedPath = path.join(storageRoot, "media", "posts", "post-uuid", "media-uuid.webp");
    await expect(fs.readFile(storedPath, "utf8")).resolves.toBe("contenido");
    await expect(storage.fileExists(filePath)).resolves.toBe(true);

    await storage.deleteFiles([filePath]);

    await expect(storage.fileExists(filePath)).resolves.toBe(false);
  });

  it("rechaza rutas que intentan salir del storage local", async () => {
    const { LocalStorageService } = await loadStorageModule();
    const storage = new LocalStorageService();

    await expect(
      storage.uploadFile("../escape.webp", Buffer.from("x"), "image/webp")
    ).rejects.toThrow("Ruta de storage invalida");
  });

  it("optimiza imagenes como WebP, genera placeholder y persiste url publica con path interno", async () => {
    await loadStorageModule();
    const { uploadImage } = await import("../../services/media.service.js");
    const { prisma } = await import("../../lib/database.js");
    const fileBuffer = await createImageBuffer({ width: 80, height: 60, format: "png" });
    const postId = "7bcb4b49-45f2-4d95-9005-7f0583b2f3a1";
    const userId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";

    const media = await uploadImage({
      fileBuffer,
      userId,
      context: "POST",
      postId,
      mimeType: "image/png",
    });

    expect(media.id).toEqual(expect.any(String));
    expect(media.userId).toBe(userId);
    expect(media.context).toBe("POST");
    expect(media.mimeType).toBe("image/webp");
    expect(media.placeholder).toMatch(/^data:image\/webp;base64,/);
    expect(media.path).toMatch(new RegExp(`^posts/${postId}/[0-9a-f-]+\\.webp$`));
    expect(media.url).toBe(`http://localhost:4000/storage/media/${media.path}`);

    const storedPath = path.join(storageRoot, "media", ...media.path.split("/"));
    const storedImage = await fs.readFile(storedPath);
    expect(storedImage.length).toBe(media.size);
    expect(prisma.media.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ path: media.path }),
    });
  });

  it("genera placeholder base64 para imagenes de avatar", async () => {
    await loadStorageModule();
    const { uploadImage } = await import("../../services/media.service.js");
    const fileBuffer = await createImageBuffer({ width: 80, height: 80, format: "png" });
    const userId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";

    const media = await uploadImage({
      fileBuffer,
      userId,
      context: "AVATAR",
      mimeType: "image/png",
    });

    expect(media.context).toBe("AVATAR");
    expect(media.mimeType).toBe("image/webp");
    expect(media.placeholder).toMatch(/^data:image\/webp;base64,/);
    expect(media.path).toMatch(new RegExp(`^avatars/${userId}/[0-9a-f-]+\\.webp$`));
    expect(media.url).toBe(`http://localhost:4000/storage/media/${media.path}`);
  });

  it("rechaza MIME no permitido antes de procesar con sharp", async () => {
    await loadStorageModule();
    const { uploadImage } = await import("../../services/media.service.js");

    await expect(
      uploadImage({
        fileBuffer: Buffer.from("no-es-imagen"),
        userId: "899d3f61-2cb1-47e4-97c2-62cdb50a91d8",
        context: "POST",
        postId: "7bcb4b49-45f2-4d95-9005-7f0583b2f3a1",
        mimeType: "text/plain",
      })
    ).rejects.toThrow("Tipo de archivo no permitido");
  });

  it("rechaza avatares que no sean cuadrados", async () => {
    await loadStorageModule();
    const { uploadImage } = await import("../../services/media.service.js");
    const fileBuffer = await createImageBuffer({ width: 80, height: 60, format: "png" });

    await expect(
      uploadImage({
        fileBuffer,
        userId: "899d3f61-2cb1-47e4-97c2-62cdb50a91d8",
        context: "AVATAR",
        mimeType: "image/png",
      })
    ).rejects.toThrow("El avatar debe ser una imagen cuadrada");
  });

  it("aplica limites de tamano distintos para avatar y post", async () => {
    await loadStorageModule({ avatarMaxFileSizeMb: "1", postMaxFileSizeMb: "2" });
    const { uploadImage } = await import("../../services/media.service.js");
    const fileBuffer = Buffer.alloc(1.5 * 1024 * 1024);

    await expect(
      uploadImage({
        fileBuffer,
        userId: "899d3f61-2cb1-47e4-97c2-62cdb50a91d8",
        context: "AVATAR",
        mimeType: "image/png",
      })
    ).rejects.toThrow("El archivo supera el tamano maximo permitido");
  });

  it("mantiene el orden indicado al vincular imagenes de publicacion", async () => {
    await loadStorageModule();
    const { linkMediaToPost } = await import("../../services/media.service.js");
    const { prisma } = await import("../../lib/database.js");
    const postId = "7bcb4b49-45f2-4d95-9005-7f0583b2f3a1";
    const mediaId = "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c";
    const userId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";

    prisma.post.findUnique.mockResolvedValue({ id: postId, userId, deletedAt: null });
    prisma.media.findUnique.mockResolvedValue({ id: mediaId, userId, context: "POST" });
    prisma.postMedia.count.mockResolvedValue(1);
    prisma.postMedia.upsert.mockResolvedValue({ postId, mediaId, sortOrder: 2 });

    const association = await linkMediaToPost({ postId, mediaId, sortOrder: 2, userId });

    expect(association.sortOrder).toBe(2);
    expect(prisma.postMedia.upsert).toHaveBeenCalledWith({
      where: {
        postId_mediaId: {
          postId,
          mediaId,
        },
      },
      update: {
        sortOrder: 2,
      },
      create: {
        postId,
        mediaId,
        sortOrder: 2,
      },
    });
  });
});
