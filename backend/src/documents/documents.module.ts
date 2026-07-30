import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DocumentAccessService } from "./document-access.service";
import { DocumentPermissionsService } from "./document-permissions.service";
import { DocumentVersionsService } from "./document-versions.service";
import { OnlyOfficeController } from "./onlyoffice.controller";
import { OnlyOfficeService } from "./onlyoffice.service";
import { DocumentAuditListener } from "./listeners/document-audit.listener";

@Module({
  imports: [PrismaModule, StorageModule, JwtModule.register({})],
  controllers: [DocumentsController, OnlyOfficeController],
  providers: [
    DocumentsService,
    DocumentAccessService,
    DocumentPermissionsService,
    DocumentVersionsService,
    OnlyOfficeService,
    DocumentAuditListener,
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
