import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corsOrigins, isProduction } from "./config/env.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { clientsRouter } from "./routes/clients.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { subscriptionsRouter } from "./routes/subscriptions.routes.js";
import { uploadsRouter } from "./routes/uploads.routes.js";

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/clients", authMiddleware, clientsRouter);
app.use("/api/subscriptions", authMiddleware, subscriptionsRouter);
app.use("/api/dashboard", authMiddleware, dashboardRouter);
app.use("/api/uploads", authMiddleware, uploadsRouter);

app.use(errorMiddleware);
