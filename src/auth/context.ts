import { createContext, useContext } from "react";
import type { LoginRequest, Me, SignupRequest } from "@/types/api";

export interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  me: Me | null;
  login: (body: LoginRequest) => Promise<void>;
  signup: (body: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
