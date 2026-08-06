import { Module } from "@nestjs/common";
import { MeetingsController, LivekitWebhookController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";
import { StorageModule } from "../../integrations/storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [MeetingsController, LivekitWebhookController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
