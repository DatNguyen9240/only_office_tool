import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  DependencyHealthResponse,
  DependencyStatus,
  HealthResponse,
} from "@share";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<HealthResponse> {
    const [database, onlyoffice] = await Promise.all([
      this.checkDatabase(),
      this.checkOnlyOffice(),
    ]);
    const requiredDependenciesReady = database === "up";

    return {
      status: requiredDependenciesReady ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database,
        onlyoffice,
      },
    };
  }

  async database(): Promise<DependencyHealthResponse> {
    return this.dependencyResponse("database", await this.checkDatabase());
  }

  async onlyoffice(): Promise<DependencyHealthResponse> {
    return this.dependencyResponse("onlyoffice", await this.checkOnlyOffice());
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "up";
    } catch {
      return "down";
    }
  }

  private async checkOnlyOffice(): Promise<DependencyStatus> {
    const baseUrl = this.config.get<string>("ONLYOFFICE_SERVER_URL");
    if (!baseUrl) return "not_configured";

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/web-apps/apps/api/documents/api.js`,
        { signal: AbortSignal.timeout(3000) },
      );
      return response.ok ? "up" : "down";
    } catch {
      return "down";
    }
  }

  private dependencyResponse(
    name: DependencyHealthResponse["service"],
    status: DependencyStatus,
  ): DependencyHealthResponse {
    return {
      service: name,
      status,
      timestamp: new Date().toISOString(),
    };
  }
}
