import {
  ASTVisitor,
  FragmentDefinitionNode,
  GraphQLError,
  Kind,
  SelectionSetNode,
  ValidationContext,
} from 'graphql';

/**
 * Rejects operations nested deeper than `maxDepth` fields. The endpoint is
 * public and unauthenticated, and `Species` links back to itself through
 * `parent`, `children` and `ancestors`, so without a limit one small query
 * could fan out across the whole tree many times over. Introspection fields
 * (`__schema`, `__type`) are not counted, so GraphiQL and codegen still work.
 */
export function depthLimitRule(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => ({
    OperationDefinition(node) {
      const fragments = new Map<string, FragmentDefinitionNode>();
      for (const definition of context.getDocument().definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          fragments.set(definition.name.value, definition);
        }
      }
      const depth = measure(node.selectionSet, fragments, 0, new Set());
      if (depth > maxDepth) {
        context.reportError(
          new GraphQLError(
            `Query depth ${depth} exceeds the maximum of ${maxDepth}.`,
            { nodes: [node], extensions: { code: 'QUERY_TOO_DEEP' } },
          ),
        );
      }
    },
  });
}

function measure(
  selectionSet: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  depth: number,
  visiting: Set<string>,
): number {
  let deepest = depth;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.name.value.startsWith('__')) {
        continue;
      }
      deepest = Math.max(
        deepest,
        selection.selectionSet
          ? measure(selection.selectionSet, fragments, depth + 1, visiting)
          : depth + 1,
      );
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      deepest = Math.max(
        deepest,
        measure(selection.selectionSet, fragments, depth, visiting),
      );
    } else {
      const name = selection.name.value;
      const fragment = fragments.get(name);
      // Unknown or cyclic fragments are reported by graphql's own rules.
      if (!fragment || visiting.has(name)) {
        continue;
      }
      visiting.add(name);
      deepest = Math.max(
        deepest,
        measure(fragment.selectionSet, fragments, depth, visiting),
      );
      visiting.delete(name);
    }
  }
  return deepest;
}
