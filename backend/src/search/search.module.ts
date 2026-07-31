import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { IndexingModule } from "../indexing/indexing.module";

@Module({
  imports: [PrismaModule, DocumentsModule, IndexingModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
