import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../backend/schema.gql",
  documents: "src/graphql/**/*.graphql",
  generates: {
    "src/graphql/generated.ts": {
      plugins: ["typescript-operations"],
      config: {
        preResolveTypes: false,
      },
    },
  },
  ignoreNoDocuments: false,
};

export default config;
