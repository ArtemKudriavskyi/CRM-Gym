import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Некоректні дані запиту",
      errors: error.flatten()
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ message: "Запис із такими унікальними даними вже існує" });
      return;
    }

    if (error.code === "P2025") {
      res.status(404).json({ message: "Запис не знайдено" });
      return;
    }
  }

  console.error(error);
  res.status(500).json({ message: "Внутрішня помилка сервера" });
};
