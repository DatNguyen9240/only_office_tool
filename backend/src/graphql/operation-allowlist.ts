import { createHash } from "node:crypto";
import type { ApolloServerPlugin, BaseContext } from "@apollo/server";
import { GraphQLError } from "graphql";

export const OFFICIAL_GRAPHQL_OPERATION_HASHES: Record<string, readonly string[]> = {
  DocumentBrowser: ["efe8509074649266b3a1342f529df4cc67a9796ecdc139c502fd9f23f4a74748"],
  DocumentDetail: ["b18bd982da6c6b3a8a08e9708cd34687d90af8af1404670ed6b657752f4b8045"],
  Documents: ["707c0d229f28c4b13be8612287fcd65a31312f3293ab20fa19672f7a9fa889d5"],
  Folders: ["fd221d916c14b6bfd933c7102550293c7b056db6688c1905b06963e7cbfcfb90"],
  Search: ["2300a2a5489121e972662d4a0b576a58c1df446313761efb936f499e6b48dccc"],
  Workspace: ["e884cae14f263097e782bfa12a0fc37ff4da75f079855cc6d751e9a3182cf463"],
};

export function normalizeGraphqlSource(source: string): string {
  return source.replace(/\r\n/g, "\n").trim();
}

export function hashGraphqlSource(source: string): string {
  return createHash("sha256")
    .update(normalizeGraphqlSource(source))
    .digest("hex");
}

export function isOfficialGraphqlOperation(
  operationName: string | null | undefined,
  source: string,
  allowlist = OFFICIAL_GRAPHQL_OPERATION_HASHES,
): boolean {
  if (!operationName) return false;
  const hashes = allowlist[operationName];
  return Boolean(hashes?.includes(hashGraphqlSource(source)));
}

export function shouldEnforceGraphqlAllowlist(): boolean {
  if (process.env.GRAPHQL_ALLOWLIST === "false") return false;
  return process.env.GRAPHQL_ALLOWLIST === "true" || process.env.NODE_ENV === "production";
}

export function createGraphqlOperationAllowlistPlugin(
  enforce = shouldEnforceGraphqlAllowlist(),
): ApolloServerPlugin<BaseContext> {
  return {
    async requestDidStart() {
      return {
        async didResolveSource(requestContext) {
          if (!enforce) return;
          if (
            isOfficialGraphqlOperation(
              requestContext.request.operationName,
              requestContext.source,
            )
          ) {
            return;
          }
          throw new GraphQLError("GraphQL operation is not allowed", {
            extensions: { code: "GRAPHQL_OPERATION_NOT_ALLOWED" },
          });
        },
      };
    },
  };
}