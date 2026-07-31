import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { OperationsModule } from "../../integrations/operations/operations.module";

@Module({
  imports: [PrismaModule, OperationsModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
