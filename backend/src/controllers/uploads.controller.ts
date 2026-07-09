import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import type { RequestHandler } from "express";
import { HttpError } from "../middlewares/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

export const clientPhotoUpload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new HttpError(400, "Можна завантажувати тільки зображення"));
      return;
    }

    callback(null, true);
  }
});

export const uploadClientPhoto: RequestHandler = (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError(400, "Файл не передано");
    }

    res.status(201).json({
      photoUrl: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    next(error);
  }
};
