import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/database.js";
import { config } from "../lib/config.js";

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

  const token = jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatarId: user.avatarId,
    },
  };
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
