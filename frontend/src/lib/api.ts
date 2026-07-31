import type { AuthTokensResponse } from "@share";
import {
  clearStoredAuth,
  loadStoredAuth,
  updateStoredTokens,
} from "@/lib/authStorage";

const apiBase = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

export const isApiConfigured = Boolean(apiBase);

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  retryOnUnauthorized?: boolean;
  authToken?: string;
  skipAuth?: boolean;
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (body.message) return body.message;
  } catch {
    // Fall back to the HTTP status when the API did not return JSON.
  }
  return response.statusText || `Request failed (${response.status})`;
}

async function request(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${apiBase}${path}`, { ...init, headers });
}

async function refreshTokens(): Promise<AuthTokensResponse | undefined> {
  return refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = undefined;
  });
}

let refreshPromise: Promise<AuthTokensResponse | undefined> | undefined;

async function performRefresh(): Promise<AuthTokensResponse | undefined> {
  const stored = loadStoredAuth();
  if (!stored?.refreshToken) return undefined;

  const response = await request(
    "/auth/refresh",
    { method: "POST" },
    stored.refreshToken,
  );
  if (!response.ok) {
    clearStoredAuth();
    window.dispatchEvent(new Event("meridian-auth-expired"));
    return undefined;
  }

  const tokens = (await response.json()) as AuthTokensResponse;
  updateStoredTokens(tokens);
  return tokens;
}

async function parseSuccess<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  if (!isApiConfigured) {
    throw new ApiError(0, "API URL is not configured");
  }

  const stored = loadStoredAuth();
  const token = options.skipAuth ? undefined : options.authToken ?? stored?.accessToken;
  const response = await request(path, init, token);

  if (
    response.status === 401 &&
    !options.skipAuth &&
    options.retryOnUnauthorized !== false
  ) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const retry = await request(path, init, refreshed.accessToken);
      if (!retry.ok) {
        throw new ApiError(retry.status, await parseError(retry));
      }
      return parseSuccess<T>(retry);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }
  return parseSuccess<T>(response);
}
