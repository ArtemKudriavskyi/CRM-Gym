import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../middlewares/error.middleware.js";
import { prisma } from "../services/prisma.service.js";

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10, "Пароль має містити щонайменше 10 символів")
    .regex(/[a-zа-яіїєґ]/i, "Пароль має містити літери")
    .regex(/\d/, "Пароль має містити цифру")
});

export const login: RequestHandler = async (req, res, next) => {
  try {
    const dto = loginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { login: dto.login } });

    if (!admin) {
      throw new HttpError(401, "Невірний логін або пароль");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);

    if (!isPasswordValid) {
      throw new HttpError(401, "Невірний логін або пароль");
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        login: admin.login
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
};

export const changePassword: RequestHandler = async (req, res, next) => {
  try {
    const dto = changePasswordSchema.parse(req.body);
    const adminId = req.admin?.adminId;

    if (!adminId) {
      throw new HttpError(401, "Потрібна авторизація");
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new HttpError(404, "Адміністратора не знайдено");
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
    if (!isPasswordValid) {
      throw new HttpError(400, "Поточний пароль введено невірно");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash }
    });

    res.json({ message: "Пароль змінено" });
  } catch (error) {
    next(error);
  }
};
