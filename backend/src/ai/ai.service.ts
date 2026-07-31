import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentAccessService } from "../documents/document-access.service";

@Injectable()
export class AiService {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    config: ConfigService,
  ) {
    this.apiKey = config.get<string>("OPENAI_API_KEY");
    this.model = config.get<string>("OPENAI_MODEL", "gpt-4o-mini");
    this.baseUrl = config
      .get<string>("OPENAI_BASE_URL", "https://api.openai.com/v1")
      .replace(/\/$/, "");
  }

  async summarize(documentId: string, user: AuthenticatedUser) {
    const context = await this.documentContext(documentId, user);
    const answer = await this.complete([
      {
        role: "system",
        content:
          "You summarize enterprise documents accurately. Mention uncertainty and never invent facts.",
      },
      {
        role: "user",
        content: `Summarize this document in Vietnamese and English with concise bullets:\n\n${context}`,
      },
    ]);
    return { documentId, model: this.model, summary: answer };
  }

  async ask(input: { question: string }, user: AuthenticatedUser) {
    const documents = await this.prisma.document.findMany({
      where: { deletedAt: null, ...this.access.accessWhere(user) },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { textContent: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    });
    const context = documents
      .map(
        (document) =>
          `Document: ${document.name}\n${document.versions[0]?.textContent ?? "No extracted text available."}`,
      )
      .join("\n\n---\n\n");
    const answer = await this.complete([
      {
        role: "system",
        content:
          "You answer only from the supplied Meridian DMS context. Cite document names in square brackets and say when context is insufficient.",
      },
      {
        role: "user",
        content: `Question: ${input.question}\n\nContext:\n${context.slice(0, 80_000)}`,
      },
    ]);
    return { question: input.question, model: this.model, answer };
  }

  private async documentContext(documentId: string, user: AuthenticatedUser) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        ...this.access.accessWhere(user),
      },
      include: {
        tags: { include: { tag: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { version: true, textContent: true, note: true },
        },
      },
    });
    if (!document) throw new ServiceUnavailableException("Document context unavailable");
    return [
      `Name: ${document.name}`,
      `Tags: ${document.tags.map((item) => item.tag.name).join(", ") || "none"}`,
      `Metadata: ${JSON.stringify(document.metadata ?? {})}`,
      `Version: ${document.versions[0]?.version ?? "unknown"}`,
      document.versions[0]?.note ?? "",
      document.versions[0]?.textContent ?? "No extracted text available.",
    ].join("\n");
  }

  private async complete(messages: Array<{ role: "system" | "user"; content: string }>) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException("AI assistant is not configured");
    }
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        messages,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException("AI provider request failed");
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new ServiceUnavailableException("AI provider returned no answer");
    return content;
  }
}
