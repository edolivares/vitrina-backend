import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/database.js";
import { config } from "../lib/config.js";

const createAccessToken = (user) => jwt.sign(
  { id: user.id, email: user.email },
  config.jwt.secret,
  { expiresIn: config.jwt.accessTokenExpiresIn }
);

const hashRefreshToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const createRefreshTokenRecord = async (userId) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTokenExpiresInDays);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return refreshToken;
};

const toAuthUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  bio: user.bio,
  avatarId: user.avatarId,
});

export const registerUser = async ({ name, email, password }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("El correo electrónico ya se encuentra registrado");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return newUser;
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      avatar: true,
    },
  });

  if (!user) {
    throw new Error("Correo o contraseña incorrectos");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Correo o contraseña incorrectos");
  }

  const token = createAccessToken(user);
  const refreshToken = await createRefreshTokenRecord(user.id);

  return {
    token,
    refreshToken,
    user: toAuthUser(user),
  };
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error("Refresh token no proporcionado");
    error.statusCode = 401;
    throw error;
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
    const error = new Error("Refresh token invalido o expirado");
    error.statusCode = 401;
    throw error;
  }

  return {
    token: createAccessToken(storedToken.user),
    user: toAuthUser(storedToken.user),
  };
};

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      avatar: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar
      ? {
          id: user.avatar.id,
          url: user.avatar.url,
          placeholder: user.avatar.placeholder,
        }
      : null,
    createdAt: user.createdAt,
  };
};

export const updateUserProfile = async (userId, { name, email, bio, avatarId }) => {
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (bio !== undefined) updateData.bio = bio;
  if (avatarId !== undefined) updateData.avatarId = avatarId;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      avatar: true,
    },
  });

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    bio: updatedUser.bio,
    avatar: updatedUser.avatar
      ? {
          id: updatedUser.avatar.id,
          url: updatedUser.avatar.url,
          placeholder: updatedUser.avatar.placeholder,
        }
      : null,
    createdAt: updatedUser.createdAt,
  };
};
