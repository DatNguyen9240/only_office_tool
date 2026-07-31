import { forwardRef, Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { MalwareScannerService } from "./malware-scanner.service";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";
import { IndexingModule } from "../indexing/indexing.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    IndexingModule,
    forwardRef(() => WebhooksModule),
    forwardRef(() => MailModule),
  ],
  controllers: [OperationsController],
  providers: [MalwareScannerService, OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
