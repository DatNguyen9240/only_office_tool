import { apiRequest, refreshApiSession } from "@/lib/api";

interface GraphqlErrorItem {
  message: string;
  path?: Array<string | number>;
  extensions?: { code?: string; [key: string]: unknown };
}

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: GraphqlErrorItem[];
}

export class GraphqlRequestError extends Error {
  constructor(readonly errors: GraphqlErrorItem[]) {
    super(errors.map((error) => error.message).join(", "));
    this.name = "GraphqlRequestError";
  }
}

export async function graphqlRequest<TData, TVariables = Record<string, never>>(
  query: string,
  variables?: TVariables,
  options: { signal?: AbortSignal; operationName?: string } = {},
): Promise<TData> {
  return execute<TData, TVariables>(query, variables, options, true);
}

async function execute<TData, TVariables>(
  query: string,
  variables: TVariables | undefined,
  options: { signal?: AbortSignal; operationName?: string },
  retryOnUnauthenticated: boolean,
): Promise<TData> {
  const envelope = await apiRequest<GraphqlEnvelope<TData>>(
    "/graphql",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        variables: variables ?? {},
        ...(options.operationName ? { operationName: options.operationName } : {}),
      }),
      signal: options.signal,
    },
  );
  if (envelope.errors?.length) {
    const unauthenticated = envelope.errors.some(
      (error) => error.extensions?.code === "UNAUTHENTICATED",
    );
    if (unauthenticated && retryOnUnauthenticated && (await refreshApiSession())) {
      return execute(query, variables, options, false);
    }
    throw new GraphqlRequestError(envelope.errors);
  }
  if (envelope.data === undefined) {
    throw new GraphqlRequestError([{ message: "GraphQL response did not contain data" }]);
  }
  return envelope.data;
}
