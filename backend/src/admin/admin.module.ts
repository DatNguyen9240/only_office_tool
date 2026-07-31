import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { GroupsDirectoryController } from "./groups-directory.controller";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminController, GroupsController, GroupsDirectoryController],
  providers: [AdminService, GroupsService],
})
export class AdminModule {}
