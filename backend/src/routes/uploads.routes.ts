import { Router } from "express";
import type { RequestHandler } from "express";
import { clientPhotoUpload, uploadClientPhoto } from "../controllers/uploads.controller.js";

export const uploadsRouter = Router();
const uploadPhotoMiddleware = clientPhotoUpload.single("photo") as unknown as RequestHandler;

uploadsRouter.post("/client-photo", uploadPhotoMiddleware, uploadClientPhoto);
