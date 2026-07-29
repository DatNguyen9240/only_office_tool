import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { DocumentsModule } from "./documents/documents.module";
import { FoldersModule } from "./folders/folders.module";
import { FilesModule } from "./files/files.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    DocumentsModule,
    FoldersModule,
    StorageModule,
    FilesModule,
  ],
})
export class AppModule {}
