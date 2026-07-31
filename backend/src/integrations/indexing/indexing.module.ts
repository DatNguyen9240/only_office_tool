import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { ContentExtractionService } from "./content-extraction.service";
import { ElasticsearchService } from "./elasticsearch.service";

@Module({
  imports: [PrismaModule],
  providers: [ContentExtractionService, ElasticsearchService],
  exports: [ContentExtractionService, ElasticsearchService],
})
export class IndexingModule {}
