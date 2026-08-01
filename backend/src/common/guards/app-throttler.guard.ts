import { ExecutionContext, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { GraphqlContext } from "../../graphql/graphql.context";

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<string>() === "graphql") {
      const { req, res } = GqlExecutionContext.create(context)
        .getContext<GraphqlContext>();
      return { req, res };
    }
    return super.getRequestResponse(context);
  }
}
