import { Module } from "@nestjs/common";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import type { Request, Response } from "express";
import { AuthModule } from "../core/auth/auth.module";
import { PrismaModule } from "../database/prisma/prisma.module";
import { PrismaService } from "../database/prisma/prisma.service";
import { DashboardModule } from "../modules/dashboard/dashboard.module";
import { DocumentsModule } from "../modules/documents/documents.module";
import { FoldersModule } from "../modules/folders/folders.module";
import { SearchModule } from "../modules/search/search.module";
import { GqlJwtAuthGuard, GqlRolesGuard } from "./graphql-auth";
import { createGraphqlLoaders } from "./graphql.loaders";
import { createGraphqlOperationAllowlistPlugin } from "./operation-allowlist";
import { operationLimitRule } from "./operation-limit.rule";
import {
  DocumentFieldsResolver,
  WorkspaceResolver,
} from "./workspace.resolver";
import { WorkspaceQueryService } from "./workspace-query.service";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DashboardModule,
    DocumentsModule,
    FoldersModule,
    SearchModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): ApolloDriverConfig => ({
        driver: ApolloDriver,
        path: "/api/graphql",
        autoSchemaFile:
          process.env.NODE_ENV === "production" ? true : "schema.gql",
        sortSchema: true,
        graphiql: process.env.NODE_ENV !== "production",
        introspection: process.env.NODE_ENV !== "production",
        includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
        validationRules: [operationLimitRule(8, 250)],
        plugins: [createGraphqlOperationAllowlistPlugin()],
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          loaders: createGraphqlLoaders(prisma),
        }),
        formatError: (formattedError) => {
          if (
            process.env.NODE_ENV === "production" &&
            formattedError.extensions?.code === "INTERNAL_SERVER_ERROR"
          ) {
            return {
              message: "Internal Server Error",
              extensions: { code: "INTERNAL_SERVER_ERROR" },
            };
          }
          return formattedError;
        },
      }),
    }),
  ],
  providers: [
    WorkspaceQueryService,
    WorkspaceResolver,
    DocumentFieldsResolver,
    GqlJwtAuthGuard,
    GqlRolesGuard,
  ],
})
export class GraphqlApiModule {}
