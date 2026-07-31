import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { MalwareScannerService } from "./malware-scanner.service";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";
import { IndexingModule } from "../indexing/indexing.module";

@Module({
  imports: [PrismaModule, StorageModule, IndexingModule],
  controllers: [OperationsController],
  providers: [MalwareScannerService, OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
