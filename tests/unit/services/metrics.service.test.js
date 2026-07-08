import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
    },
    postView: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    savedPost: {
      count: vi.fn(),
    },
    chat: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/database.js", () => ({
  prisma: mocks.prisma,
}));

describe("Metricas de publicaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.METRICS_VIEW_DEDUPE_WINDOW_MINUTES = "60";
    process.env.METRICS_HASH_SECRET = "test-secret";
  });

  it("registra una vista valida de una publicacion publicada", async () => {
    const { trackPostView } = await import("../../../services/metrics.service.js");
    const postId = "7bcb4b49-45f2-4d95-9005-7f0583b2f3a1";

    mocks.prisma.post.findUnique.mockResolvedValue({
      id: postId,
      userId: "899d3f61-2cb1-47e4-97c2-62cdb50a91d8",
      status: "PUBLISHED",
      deletedAt: null,
    });
    mocks.prisma.postView.findFirst.mockResolvedValue(null);
    mocks.prisma.postView.create.mockResolvedValue({});

    const tracked = await trackPostView({
      postId,
      viewerId: null,
      viewContext: {
        ipHash: "ip-hash",
        userAgentHash: "ua-hash",
        isBot: false,
      },
    });

    expect(tracked).toBe(true);
    expect(mocks.prisma.postView.create).toHaveBeenCalledWith({
      data: {
        postId,
        viewerId: null,
        ipHash: "ip-hash",
        userAgentHash: "ua-hash",
      },
    });
  });

  it("no registra vistas del propietario, bots o visitantes repetidos", async () => {
    const { trackPostView } = await import("../../../services/metrics.service.js");
    const postId = "7bcb4b49-45f2-4d95-9005-7f0583b2f3a1";
    const ownerId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";

    mocks.prisma.post.findUnique.mockResolvedValue({
      id: postId,
      userId: ownerId,
      status: "PUBLISHED",
      deletedAt: null,
    });

    await expect(
      trackPostView({
        postId,
        viewerId: ownerId,
        viewContext: { isBot: false },
      })
    ).resolves.toBe(false);

    await expect(
      trackPostView({
        postId,
        viewerId: null,
        viewContext: { isBot: true },
      })
    ).resolves.toBe(false);

    mocks.prisma.postView.findFirst.mockResolvedValue({ id: "existing-view" });
    await expect(
      trackPostView({
        postId,
        viewerId: null,
        viewContext: { ipHash: "ip", userAgentHash: "ua", isBot: false },
      })
    ).resolves.toBe(false);

    expect(mocks.prisma.postView.create).not.toHaveBeenCalled();
  });

  it("calcula resumen desde vistas, favoritos y conversaciones", async () => {
    const { getPostMetrics } = await import("../../../services/metrics.service.js");
    const postId = "7bcb4b49-45f2-4d95-9005-7f0583b2f3a1";
    const ownerId = "899d3f61-2cb1-47e4-97c2-62cdb50a91d8";
    const lastContactAt = new Date("2026-07-01T12:00:00.000Z");

    mocks.prisma.post.findUnique.mockResolvedValue({
      id: postId,
      userId: ownerId,
      deletedAt: null,
    });
    mocks.prisma.postView.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(20);
    mocks.prisma.savedPost.count.mockResolvedValue(8);
    mocks.prisma.chat.count.mockResolvedValue(2);
    mocks.prisma.chat.findFirst.mockResolvedValue({ lastMessageAt: lastContactAt });

    const metrics = await getPostMetrics(postId, ownerId);

    expect(metrics).toEqual({
      postId,
      views: {
        total: 100,
        last24h: 12,
        last48h: 20,
      },
      favorites: 8,
      conversations: 2,
      interestRate: 10,
      lastContactAt,
    });
    expect(mocks.prisma.chat.findFirst).toHaveBeenCalledWith({
      where: { postId },
      orderBy: { lastMessageAt: "desc" },
      select: { lastMessageAt: true },
    });
  });
});
