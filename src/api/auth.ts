// Low-level auth calls. The AuthContext orchestrates these; components use the context.
import { api } from "@/lib/api";
import type {
  LoginRequest,
  Me,
  SignupRequest,
  TokenResponse,
} from "@/types/api";

export function login(body: LoginRequest): Promise<TokenResponse> {
  return api.post<TokenResponse>("/auth/login", body, { skipAuthRetry: true });
}

export function signup(body: SignupRequest): Promise<TokenResponse> {
  return api.post<TokenResponse>("/auth/signup", body, { skipAuthRetry: true });
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout");
}

export function fetchMe(): Promise<Me> {
  return api.get<Me>("/me");
}
