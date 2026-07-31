import { create } from "zustand";
import type { AuthTokensResponse, AuthUser } from "@share";
import { apiRequest } from "@/lib/api";
import {
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
} from "@/lib/authStorage";
import { startAuthentication } from "@simplewebauthn/browser";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user?: AuthUser;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string, remember: boolean) => Promise<AuthUser>;
  loginWithPasskey: (email: string, remember: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  markUnauthenticated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  bootstrap: async () => {
    const stored = loadStoredAuth();
    if (!stored) {
      set({ status: "unauthenticated", user: undefined });
      return;
    }

    set({ status: "loading", user: stored.user });
    try {
      const user = await apiRequest<AuthUser>("/auth/me");
      set({ status: "authenticated", user });
    } catch {
      clearStoredAuth();
      set({ status: "unauthenticated", user: undefined });
    }
  },
  login: async (email, password, remember) => {
    const response = await apiRequest<AuthTokensResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      { skipAuth: true, retryOnUnauthorized: false },
    );
    saveStoredAuth(response, remember);
    set({ status: "authenticated", user: response.user });
    return response.user;
  },
  loginWithPasskey: async (email, remember) => {
    const ceremony = await apiRequest<{
      challengeId: string;
      options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
    }>(
      "/auth/passkeys/login/options",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
      { skipAuth: true, retryOnUnauthorized: false },
    );
    const credential = await startAuthentication({
      optionsJSON: ceremony.options,
    });
    const response = await apiRequest<AuthTokensResponse>(
      "/auth/passkeys/login/verify",
      {
        method: "POST",
        body: JSON.stringify({
          challengeId: ceremony.challengeId,
          response: credential,
        }),
      },
      { skipAuth: true, retryOnUnauthorized: false },
    );
    saveStoredAuth(response, remember);
    set({ status: "authenticated", user: response.user });
    return response.user;
  },
  logout: async () => {
    const stored = loadStoredAuth();
    try {
      if (stored?.refreshToken) {
        await apiRequest(
          "/auth/logout",
          { method: "POST" },
          {
            authToken: stored.refreshToken,
            retryOnUnauthorized: false,
          },
        );
      }
    } finally {
      clearStoredAuth();
      set({ status: "unauthenticated", user: undefined });
    }
  },
  markUnauthenticated: () => {
    clearStoredAuth();
    set({ status: "unauthenticated", user: undefined });
  },
}));
