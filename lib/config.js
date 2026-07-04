import "dotenv/config";

const parseCsvEnv = (value) => {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
};

const parseNumberEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  server: {
    port: Number(process.env.PORT) || 4000,
    env: process.env.NODE_ENV || "development",
  },
  cors: {
    allowedOrigins: parseCsvEnv(process.env.CORS_ALLOWED_ORIGINS),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    refreshTokenExpiresInDays: parseNumberEnv(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS, 14),
    refreshCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
  },
  cookies: {
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
  },
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  storage: {
    strategy: process.env.STORAGE_STRATEGY || "local",
    localDir: process.env.STORAGE_LOCAL_DIR || "./storage",
    bucket: process.env.STORAGE_BUCKET || "media",
    cdnBaseUrl:
      process.env.CDN_BASE_URL || `http://localhost:${Number(process.env.PORT) || 4000}/storage`,
  },
  s3: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
  },
  media: {
    avatarMaxFileSizeBytes:
      parseNumberEnv(process.env.MEDIA_AVATAR_MAX_FILE_SIZE_MB, 2) * 1024 * 1024,
    postMaxFileSizeBytes: parseNumberEnv(process.env.MEDIA_POST_MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
    allowedMimeTypes: parseCsvEnv(
      process.env.MEDIA_ALLOWED_MIME_TYPES || "image/jpeg,image/png,image/webp"
    ),
  },
  metrics: {
    viewDedupeWindowMinutes: parseNumberEnv(process.env.METRICS_VIEW_DEDUPE_WINDOW_MINUTES, 60),
    hashSecret: process.env.METRICS_HASH_SECRET || process.env.JWT_SECRET || "dev-metrics-secret",
  },
  rateLimit: {
    public: {
      windowMinutes: parseNumberEnv(process.env.RATE_LIMIT_PUBLIC_WINDOW_MINUTES, 15),
      max: parseNumberEnv(process.env.RATE_LIMIT_PUBLIC_MAX, 300),
    },
    login: {
      windowMinutes: parseNumberEnv(process.env.RATE_LIMIT_LOGIN_WINDOW_MINUTES, 15),
      max: parseNumberEnv(process.env.RATE_LIMIT_LOGIN_MAX, 10),
    },
    register: {
      windowMinutes: parseNumberEnv(process.env.RATE_LIMIT_REGISTER_WINDOW_MINUTES, 60),
      max: parseNumberEnv(process.env.RATE_LIMIT_REGISTER_MAX, 5),
    },
    refresh: {
      windowMinutes: parseNumberEnv(process.env.RATE_LIMIT_REFRESH_WINDOW_MINUTES, 15),
      max: parseNumberEnv(process.env.RATE_LIMIT_REFRESH_MAX, 60),
    },
    media: {
      windowMinutes: parseNumberEnv(process.env.RATE_LIMIT_MEDIA_WINDOW_MINUTES, 15),
      max: parseNumberEnv(process.env.RATE_LIMIT_MEDIA_MAX, 30),
    },
    privateWrite: {
      windowMinutes: parseNumberEnv(process.env.RATE_LIMIT_PRIVATE_WRITE_WINDOW_MINUTES, 15),
      max: parseNumberEnv(process.env.RATE_LIMIT_PRIVATE_WRITE_MAX, 60),
    },
  },
};
