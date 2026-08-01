import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { printSchema } from "graphql";
import { DocumentFieldsResolver, WorkspaceResolver } from "../graphql/workspace.resolver";

async function main() {
  const app = await NestFactory.createApplicationContext(GraphQLSchemaBuilderModule, {
    logger: false,
  });
  try {
    const schemaFactory = app.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create(
      [WorkspaceResolver, DocumentFieldsResolver],
      { skipCheck: true },
    );
    writeFileSync(join(process.cwd(), "schema.gql"), `${printSchema(schema)}\n`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
