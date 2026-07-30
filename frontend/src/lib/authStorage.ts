import type { AuthTokensResponse } from "@share";

const storageKey = "meridian-dms-auth";

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthTokensResponse["user"];
}

function readStorage(storage: Storage): StoredAuth | undefined {
  try {
    const value = storage.getItem(storageKey);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as Partial<StoredAuth>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      !parsed.user ||
      typeof parsed.user.id !== "string"
    ) {
      return undefined;
    }
    return parsed as StoredAuth;
  } catch {
    return undefined;
  }
}

export function loadStoredAuth(): StoredAuth | undefined {
  return readStorage(window.localStorage) ?? readStorage(window.sessionStorage);
}

export function saveStoredAuth(
  response: Pick<AuthTokensResponse, "accessToken" | "refreshToken" | "user">,
  remember: boolean,
) {
  const auth: StoredAuth = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  };
  const target = remember ? window.localStorage : window.sessionStorage;
  window.localStorage.removeItem(storageKey);
  window.sessionStorage.removeItem(storageKey);
  target.setItem(storageKey, JSON.stringify(auth));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(storageKey);
  window.sessionStorage.removeItem(storageKey);
}

export function updateStoredTokens(
  response: Pick<AuthTokensResponse, "accessToken" | "refreshToken" | "user">,
) {
  const existing = loadStoredAuth();
  saveStoredAuth(response, Boolean(existing && readStorage(window.localStorage)));
}
