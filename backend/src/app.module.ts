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
import { SearchModule } from "./search/search.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { OperationsModule } from "./operations/operations.module";
import { TagsModule } from "./tags/tags.module";
import { TemplatesModule } from "./templates/templates.module";
import { AiModule } from "./ai/ai.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const requiredKeys = [
    "API_PUBLIC_URL",
    "ONLYOFFICE_SERVER_URL",
    "ONLYOFFICE_JWT_SECRET",
  ];
  if (config.NODE_ENV === "production") requiredKeys.push("SMTP_URL");

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
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
    ]),
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
    SearchModule,
    NotificationsModule,
    OperationsModule,
    TagsModule,
    TemplatesModule,
    AiModule,
    WebhooksModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
