import "dotenv/config";

export const config = {
  server: {
    port: Number(process.env.PORT) || 4000,
    env: process.env.NODE_ENV || "development",
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  db: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  }
};
