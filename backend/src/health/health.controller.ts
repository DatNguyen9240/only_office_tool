import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check();
  }

  @Get("database")
  database() {
    return this.healthService.database();
  }

  @Get("onlyoffice")
  onlyoffice() {
    return this.healthService.onlyoffice();
  }
}
