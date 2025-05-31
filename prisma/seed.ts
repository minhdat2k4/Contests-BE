import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";
import { logger } from "../src/utils/logger";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.user.deleteMany();
    const username = process.env.UsernameAdmin || "admin";
    const password = process.env.PasswordAdmin || "admin123";
    const email = process.env.EmailAdmin || "admin@example.com";
    const adminPassword = await hash(password, 10);
    const adminUser = await prisma.user.create({
      data: {
        username,
        email,
        password: adminPassword,
        role: "Admin",
      },
    });

    logger.info(
      `Tạo tài khoản admin thành công : ${adminUser.username} với email ${adminUser.email} và mật khẩu ${adminUser.password}`
    );
  } catch (error) {
    logger.error("Tạo tài khoản admin thất bại :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
