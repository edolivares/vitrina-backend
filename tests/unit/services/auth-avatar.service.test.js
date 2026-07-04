import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    media: {
      findUnique: vi.fn(),
    },
  },
  uploadImage: vi.fn(),
  deleteMedia: vi.fn(),
}));

vi.mock("../../../lib/database.js", () => ({
  prisma: mocks.prisma,
}));

vi.mock("../../../services/media.service.js", () => ({
  uploadImage: mocks.uploadImage,
  deleteMedia: mocks.deleteMedia,
}));

describe("Avatar de usuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sube avatar, devuelve placeholder base64 y elimina el avatar anterior", async () => {
    const { uploadUserAvatar } = await import("../../../services/auth.service.js");
    const userId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";
    const oldAvatarId = "5fd0a62d-c971-4e33-8b45-510955fc15ef";
    const newAvatar = {
      id: "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c",
      url: "http://localhost:4000/storage/media/avatars/user/avatar.webp",
      placeholder: "data:image/webp;base64,test",
      width: 80,
      height: 60,
      size: 1024,
      mimeType: "image/webp",
    };

    mocks.prisma.user.findUnique.mockResolvedValue({ avatarId: oldAvatarId });
    mocks.uploadImage.mockResolvedValue(newAvatar);
    mocks.prisma.user.update.mockResolvedValue({
      id: userId,
      name: "Juan Perez",
      email: "juan@email.com",
      bio: "Vendo barato y seguro.",
      avatar: newAvatar,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await uploadUserAvatar(userId, Buffer.from("image"), "image/png");

    expect(mocks.uploadImage).toHaveBeenCalledWith({
      fileBuffer: expect.any(Buffer),
      userId,
      context: "AVATAR",
      mimeType: "image/png",
    });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { avatarId: newAvatar.id },
      include: { avatar: true },
    });
    expect(mocks.deleteMedia).toHaveBeenCalledWith(oldAvatarId, userId);
    expect(result.avatar.placeholder).toMatch(/^data:image\/webp;base64,/);
  });

  it("permite asignar avatar existente solo si pertenece al usuario y es contexto AVATAR", async () => {
    const { updateUserProfile } = await import("../../../services/auth.service.js");
    const userId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";
    const avatarId = "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c";

    mocks.prisma.media.findUnique.mockResolvedValue({
      id: avatarId,
      userId,
      context: "AVATAR",
      url: "http://localhost:4000/storage/media/avatars/user/avatar.webp",
      placeholder: "data:image/webp;base64,test",
    });
    mocks.prisma.user.update.mockResolvedValue({
      id: userId,
      name: "Juan Perez",
      email: "juan@email.com",
      bio: null,
      avatar: {
        id: avatarId,
        url: "http://localhost:4000/storage/media/avatars/user/avatar.webp",
        placeholder: "data:image/webp;base64,test",
      },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await updateUserProfile(userId, { avatarId });

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { avatarId },
      include: { avatar: true },
    });
    expect(result.avatar.placeholder).toMatch(/^data:image\/webp;base64,/);
  });

  it("rechaza asignar como avatar un media de otro usuario", async () => {
    const { updateUserProfile } = await import("../../../services/auth.service.js");

    mocks.prisma.media.findUnique.mockResolvedValue({
      id: "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c",
      userId: "3ba4f026-1c7d-44f7-9875-d0198d013991",
      context: "AVATAR",
    });

    await expect(
      updateUserProfile("899d3f61-2cb1-47e4-97c2-62cdb50a91d8", {
        avatarId: "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c",
      })
    ).rejects.toThrow("Avatar no encontrado");
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("rechaza asignar como avatar una imagen de publicacion", async () => {
    const { updateUserProfile } = await import("../../../services/auth.service.js");
    const userId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";

    mocks.prisma.media.findUnique.mockResolvedValue({
      id: "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c",
      userId,
      context: "POST",
    });

    await expect(
      updateUserProfile(userId, {
        avatarId: "77a8b9c0-d1e2-4f4a-9b6c-7d8e9f0a1b2c",
      })
    ).rejects.toThrow("Avatar no encontrado");
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });
});
