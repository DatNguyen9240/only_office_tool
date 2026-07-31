import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StorageModule } from "../../integrations/storage/storage.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DocumentAccessService } from "./document-access.service";
import { DocumentPermissionsService } from "./document-permissions.service";
import { DocumentVersionsService } from "./document-versions.service";
import { OnlyOfficeController } from "./onlyoffice.controller";
import { OnlyOfficeService } from "./onlyoffice.service";
import { DocumentAuditListener } from "./listeners/document-audit.listener";
import { ShareLinksController } from "./share-links.controller";
import { ShareLinksService } from "./share-links.service";
import { NotificationsModule } from "../../core/notifications/notifications.module";
import { DocumentCommentsController } from "./document-comments.controller";
import { DocumentCommentsService } from "./document-comments.service";
import { OperationsModule } from "../../integrations/operations/operations.module";

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    NotificationsModule,
    OperationsModule,
    JwtModule.register({}),
  ],
  controllers: [
    DocumentsController,
    OnlyOfficeController,
    ShareLinksController,
    DocumentCommentsController,
  ],
  providers: [
    DocumentsService,
    DocumentAccessService,
    DocumentPermissionsService,
    DocumentVersionsService,
    OnlyOfficeService,
    DocumentAuditListener,
    ShareLinksService,
    DocumentCommentsService,
  ],
  exports: [
    DocumentsService,
    DocumentAccessService,
    DocumentPermissionsService,
    DocumentVersionsService,
    OnlyOfficeService,
    DocumentAuditListener,
  ],
})
export class DocumentsModule {}
