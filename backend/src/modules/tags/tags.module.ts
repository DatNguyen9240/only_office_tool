import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { DocumentsModule } from "../documents/documents.module";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
