import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SearchService } from "./search.service";

@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query("q") query: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.searchService.search(query ?? "", user);
  }
}
