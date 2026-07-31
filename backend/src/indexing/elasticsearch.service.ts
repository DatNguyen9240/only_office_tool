import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly baseUrl?: string;
  private readonly index: string;
  private readonly apiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>("ELASTICSEARCH_URL")?.replace(/\/$/, "");
    this.index = config.get<string>("ELASTICSEARCH_INDEX", "meridian-documents");
    this.apiKey = config.get<string>("ELASTICSEARCH_API_KEY");
  }

  get enabled() {
    return Boolean(this.baseUrl);
  }

  async indexDocument(documentId: string) {
    if (!this.baseUrl) return false;
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        tags: { include: { tag: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { textContent: true },
        },
      },
    });
    if (!document) return false;
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(this.index)}/_doc/${encodeURIComponent(document.id)}`,
      {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify({
          name: document.name,
          text: document.versions[0]?.textContent ?? "",
          tags: document.tags.map((item) => item.tag.name),
          ownerId: document.ownerId,
          deleted: Boolean(document.deletedAt),
          updatedAt: document.updatedAt.toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      this.logger.warn(`Elasticsearch indexing returned ${response.status}`);
      return false;
    }
    return true;
  }

  async searchIds(query: string, limit: number) {
    if (!this.baseUrl) return [];
    try {
      const response = await fetch(
        `${this.baseUrl}/${encodeURIComponent(this.index)}/_search`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            size: limit,
            query: {
              bool: {
                must_not: [{ term: { deleted: true } }],
                must: [
                  {
                    multi_match: {
                      query,
                      fields: ["name^4", "tags^2", "text"],
                      fuzziness: "AUTO",
                    },
                  },
                ],
              },
            },
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) return [];
      const payload = (await response.json()) as {
        hits?: { hits?: Array<{ _id: string }> };
      };
      return payload.hits?.hits?.map((hit) => hit._id) ?? [];
    } catch {
      return [];
    }
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `ApiKey ${this.apiKey}` } : {}),
    };
  }
}
