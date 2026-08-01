import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth/auth.module";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StorageModule } from "../../integrations/storage/storage.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { DocumentsModule } from "../documents/documents.module";

@Module({
  imports: [AuthModule, PrismaModule, StorageModule, DocumentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
