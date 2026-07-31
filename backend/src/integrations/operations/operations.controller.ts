import { Controller, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../../core/auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../core/auth/guards/roles.guard";
import { OperationsService } from "./operations.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
@Controller("admin/operations")
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Post("cleanup")
  cleanup() {
    return this.operations.cleanupNow();
  }
}
