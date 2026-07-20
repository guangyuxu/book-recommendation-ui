import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchMe,
  login as loginCall,
  logout as logoutCall,
  signup as signupCall,
} from "@/api/auth";
import { api, setAccessToken, setOnAuthFailure } from "@/lib/api";
import type { LoginRequest, Me, SignupRequest, TokenResponse } from "@/types/api";
import { AuthContext, type AuthState } from "./context";

// Owns the in-memory access token and the derived identity (`/me`). On mount it silently attempts a
// refresh (using the HttpOnly cookie) so a returning user stays logged in across reloads.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] =
    useState<AuthState["status"]>("loading");
  const [me, setMe] = useState<Me | null>(null);

  const establishSession = useCallback(async () => {
    const identity = await fetchMe();
    setMe(identity);
    setStatus("authenticated");
  }, []);

  const finishAuth = useCallback(
    async (tokens: TokenResponse) => {
      setAccessToken(tokens.access_token);
      await establishSession();
    },
    [establishSession],
  );

  // On first load, try to restore a session from the refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await api.post<TokenResponse>("/auth/refresh", undefined, {
          anonymous: true,
          skipAuthRetry: true,
        });
        setAccessToken(tokens.access_token);
        if (!cancelled) await establishSession();
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setStatus("unauthenticated");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [establishSession]);

  // When a mid-session refresh ultimately fails, drop to logged-out.
  useEffect(() => {
    setOnAuthFailure(() => {
      setAccessToken(null);
      setMe(null);
      setStatus("unauthenticated");
      qc.clear();
    });
    return () => setOnAuthFailure(null);
  }, [qc]);

  const login = useCallback(
    async (body: LoginRequest) => {
      const tokens = await loginCall(body);
      await finishAuth(tokens);
    },
    [finishAuth],
  );

  const signup = useCallback(
    async (body: SignupRequest) => {
      const tokens = await signupCall(body);
      await finishAuth(tokens);
    },
    [finishAuth],
  );

  const logout = useCallback(async () => {
    try {
      await logoutCall();
    } catch {
      // Best-effort: even if the server call fails, drop local state.
    }
    setAccessToken(null);
    setMe(null);
    setStatus("unauthenticated");
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthState>(
    () => ({ status, me, login, signup, logout }),
    [status, me, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
