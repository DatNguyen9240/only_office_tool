import {
  GraphQLError,
  Kind,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationRule,
} from "graphql";

export function operationLimitRule(
  maxDepth = 8,
  maxFields = 250,
): ValidationRule {
  return (context) => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const definition of context.getDocument().definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.set(definition.name.value, definition);
      }
    }

    return {
      OperationDefinition(node) {
        const result = inspectSelection(node.selectionSet, fragments, new Set(), 1);
        if (result.depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Query depth ${result.depth} exceeds limit ${maxDepth}`),
          );
        }
        if (result.fields > maxFields) {
          context.reportError(
            new GraphQLError(`Query field cost ${result.fields} exceeds limit ${maxFields}`),
          );
        }
      },
    };
  };
}

function inspectSelection(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  visited: Set<string>,
  depth: number,
): { depth: number; fields: number } {
  let deepest = depth;
  let fields = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.name.value.startsWith("__")) continue;
      fields += 1;
      if (selection.selectionSet) {
        const nested = inspectSelection(
          selection.selectionSet,
          fragments,
          visited,
          depth + 1,
        );
        deepest = Math.max(deepest, nested.depth);
        fields += nested.fields;
      }
      continue;
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const nested = inspectSelection(selection.selectionSet, fragments, visited, depth);
      deepest = Math.max(deepest, nested.depth);
      fields += nested.fields;
      continue;
    }
    const name = selection.name.value;
    if (visited.has(name)) continue;
    const fragment = fragments.get(name);
    if (!fragment) continue;
    const nextVisited = new Set(visited).add(name);
    const nested = inspectSelection(fragment.selectionSet, fragments, nextVisited, depth);
    deepest = Math.max(deepest, nested.depth);
    fields += nested.fields;
  }
  return { depth: deepest, fields };
}
