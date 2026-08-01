import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("PROCESSOR_SERVICE_URL", "http://document-processor:8080").replace(/\/$/, "");
  }

  async mergeWord(
    templateObjectKey: string,
    outputObjectKey: string,
    placeholders: Record<string, string>
  ): Promise<{ success: boolean; message: string; objectKey: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/Processor/merge-word`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateObjectKey,
          outputObjectKey,
          placeholders,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new HttpException(
          `C# Processor failed: ${errText}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      return await response.json() as any;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`mergeWord failed: ${msg}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to connect to document-processor: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async generateExcel(
    title: string,
    data: Array<{ category: string; value: number }>,
    outputObjectKey: string
  ): Promise<{ success: boolean; message: string; objectKey: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/Processor/generate-excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          data,
          outputObjectKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new HttpException(
          `C# Processor failed: ${errText}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      return await response.json() as any;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`generateExcel failed: ${msg}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to connect to document-processor: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async convertPdf(
    inputObjectKey: string,
    outputObjectKey: string
  ): Promise<{ success: boolean; message: string; objectKey: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/Processor/convert-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputObjectKey,
          outputObjectKey,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new HttpException(
          `C# Processor failed: ${errText}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      return await response.json() as any;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`convertPdf failed: ${msg}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to connect to document-processor: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
