import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth/auth.module";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StorageModule } from "../../integrations/storage/storage.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
