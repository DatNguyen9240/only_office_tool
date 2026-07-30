import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { DocumentsModule } from "./documents/documents.module";
import { FoldersModule } from "./folders/folders.module";
import { FilesModule } from "./files/files.module";
import { StorageModule } from "./storage/storage.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { AuditModule } from "./audit/audit.module";
import { DashboardModule } from "./dashboard/dashboard.module";

function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const requiredKeys = [
    "API_PUBLIC_URL",
    "ONLYOFFICE_SERVER_URL",
    "ONLYOFFICE_JWT_SECRET",
  ];

  const missingKeys = requiredKeys.filter((key) => {
    const value = config[key];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missingKeys.length > 0 && process.env.NODE_ENV !== "test") {
    throw new Error(
      `[Bootstrap Fail-Fast Fatal Error] Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    AdminModule,
    DashboardModule,
    HealthModule,
    DocumentsModule,
    FoldersModule,
    StorageModule,
    FilesModule,
  ],
})
export class AppModule {}
