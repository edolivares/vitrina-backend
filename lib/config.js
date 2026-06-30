import "dotenv/config";

const parseCsvEnv = (value) => {
  return value
    ? value.split(",").map((item) => item.trim()).filter(Boolean)
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
  },
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
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
