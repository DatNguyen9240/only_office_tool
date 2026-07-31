import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ContentExtractionService {
  private readonly logger = new Logger(ContentExtractionService.name);
  private readonly tikaUrl?: string;

  constructor(config: ConfigService) {
    this.tikaUrl = config.get<string>("TIKA_URL")?.replace(/\/$/, "");
  }

  async extract(buffer: Buffer, contentType: string) {
    if (this.tikaUrl) {
      try {
        const response = await fetch(`${this.tikaUrl}/tika`, {
          method: "PUT",
          headers: {
            Accept: "text/plain",
            "Content-Type": contentType,
            "X-Tika-PDFOcrStrategy": "auto",
          },
          body: buffer,
          signal: AbortSignal.timeout(120_000),
        });
        if (response.ok) return (await response.text()).trim().slice(0, 2_000_000);
        this.logger.warn(`Tika extraction returned ${response.status}`);
      } catch (error) {
        this.logger.warn(
          `Tika extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (contentType === "application/pdf") {
      return buffer
        .toString("latin1")
        .replace(/[^\x20-\x7E\r\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100_000);
    }
    return "";
  }
}
