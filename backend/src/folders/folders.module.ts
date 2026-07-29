import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";

@Module({
  imports: [PrismaModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
