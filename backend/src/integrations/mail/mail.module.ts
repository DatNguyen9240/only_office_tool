import { forwardRef, Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { OperationsModule } from "../operations/operations.module";

@Module({
  imports: [forwardRef(() => OperationsModule)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
