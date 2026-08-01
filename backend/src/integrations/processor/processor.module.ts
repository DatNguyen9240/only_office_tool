import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProcessorService } from "./processor.service";

@Module({
  imports: [ConfigModule],
  providers: [ProcessorService],
  exports: [ProcessorService],
})
export class ProcessorModule {}
