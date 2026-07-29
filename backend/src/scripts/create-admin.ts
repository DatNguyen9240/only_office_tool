import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Meridian Administrator";

  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL must be a valid email address");
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("ADMIN_PASSWORD must contain 12 to 128 characters");
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: UserRole.ADMINISTRATOR,
      status: UserStatus.ACTIVE,
    },
    update: {
      name,
      passwordHash,
      role: UserRole.ADMINISTRATOR,
      status: UserStatus.ACTIVE,
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`Administrator ready: ${user.email} (${user.id})`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
