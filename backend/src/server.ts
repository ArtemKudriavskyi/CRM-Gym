import { env } from "./config/env.js";
import { app } from "./app.js";
import { prisma } from "./services/prisma.service.js";

const server = app.listen(env.PORT, () => {
  console.log(`API server is running on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
