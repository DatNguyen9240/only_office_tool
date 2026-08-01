import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./database/prisma/prisma.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { FoldersModule } from "./modules/folders/folders.module";
import { FilesModule } from "./modules/files/files.module";
import { StorageModule } from "./integrations/storage/storage.module";
import { AuthModule } from "./core/auth/auth.module";
import { AdminModule } from "./core/admin/admin.module";
import { AuditModule } from "./core/audit/audit.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { SearchModule } from "./modules/search/search.module";
import { NotificationsModule } from "./core/notifications/notifications.module";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { OperationsModule } from "./integrations/operations/operations.module";
import { TagsModule } from "./modules/tags/tags.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { AiModule } from "./integrations/ai/ai.module";
import { WebhooksModule } from "./integrations/webhooks/webhooks.module";
import { ProcessorModule } from "./integrations/processor/processor.module";

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
    ProcessorModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
