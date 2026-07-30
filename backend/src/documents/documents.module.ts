import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { OnlyOfficeController } from "./onlyoffice.controller";

@Module({
  imports: [PrismaModule, StorageModule, JwtModule.register({})],
  controllers: [DocumentsController, OnlyOfficeController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
