import assert from "node:assert/strict";
import test from "node:test";
import { buildSchema, parse, validate } from "graphql";
import { operationLimitRule } from "../src/graphql/operation-limit.rule";

const schema = buildSchema(`
  type Query {
    workspace: Workspace!
  }

  type Workspace {
    recentDocuments: DocumentConnection!
  }

  type DocumentConnection {
    nodes: [Document!]!
  }

  type Document {
    id: ID!
    tags: [Tag!]!
  }

  type Tag {
    id: ID!
    name: String!
  }
`);

test("operation limit counts fragments defined after operations", () => {
  const document = parse(`
    query Workspace {
      workspace {
        ...WorkspaceFields
      }
    }

    fragment WorkspaceFields on Workspace {
      recentDocuments {
        nodes {
          id
          tags {
            id
            name
          }
        }
      }
    }
  `);

  const errors = validate(schema, document, [operationLimitRule(8, 2)]);

  assert.equal(errors.length, 1);
  assert.match(errors[0]?.message ?? "", /field cost/i);
});
