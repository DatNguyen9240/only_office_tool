import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { IndexingModule } from "../../integrations/indexing/indexing.module";

@Module({
  imports: [PrismaModule, DocumentsModule, IndexingModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
