import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const login = process.env.ADMIN_LOGIN ?? "admin";
const isProduction = process.env.NODE_ENV === "production";

const main = async () => {
  const existingAdmin = await prisma.admin.findUnique({
    where: { login }
  });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${login}. Password was not changed.`);
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? (isProduction ? undefined : "admin12345");

  if (!password) {
    throw new Error("ADMIN_PASSWORD is required to create the first admin in production");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.create({
    data: { login, passwordHash }
  });

  console.log(`Admin user is ready: ${login}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
