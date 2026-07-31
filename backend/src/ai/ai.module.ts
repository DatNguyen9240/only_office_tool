import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DocumentsModule } from "../documents/documents.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
