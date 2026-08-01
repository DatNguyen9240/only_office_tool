import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../core/auth/auth.types";
import type { GraphqlLoaders } from "./graphql.loaders";

export interface GraphqlRequest extends Request {
  user?: AuthenticatedUser;
}

export interface GraphqlContext {
  req: GraphqlRequest;
  res: Response;
  loaders: GraphqlLoaders;
}
