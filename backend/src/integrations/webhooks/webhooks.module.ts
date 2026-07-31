import { forwardRef, Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { OperationsModule } from "../operations/operations.module";

@Module({
  imports: [PrismaModule, forwardRef(() => OperationsModule)],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
