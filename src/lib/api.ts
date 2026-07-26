// Thin fetch wrapper for the accounts service.
//
// - The access token lives in memory only (never localStorage) and is injected as a Bearer header.
// - `credentials: "include"` so the HttpOnly refresh cookie (scoped to /auth) rides along on
//   refresh/logout calls.
// - On a 401 for a protected call, we transparently hit /auth/refresh once, then retry the
//   original request with the fresh token. A second 401 propagates as an ApiError.
//
// The browser calls the accounts service directly by absolute URL; the backend is CORS-enabled for
// the UI origin. Override with VITE_API_BASE_URL to point at a different accounts origin.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001";

let accessToken: string | null = null;
// Called when refresh ultimately fails, so the auth layer can drop to the logged-out state.
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnAuthFailure(cb: (() => void) | null): void {
  onAuthFailure = cb;
}

// Let other clients (lib/chatApi.ts) drop to the logged-out state when their own refresh fails.
export function notifyAuthFailure(): void {
  onAuthFailure?.();
}

// The backend's uniform error envelope: { error: { code, message, request_id } }.
export class ApiError extends Error {
  status: number;
  requestId?: string;
  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // Auth endpoints (login/signup/refresh) must not trigger the refresh-retry loop.
  skipAuthRetry?: boolean;
  // Skip the Authorization header (used by the refresh call itself).
  anonymous?: boolean;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || "request failed";
  let requestId: string | undefined;
  try {
    const data = await res.json();
    const env = data?.error;
    if (env) {
      requestId = env.request_id;
      if (typeof env.message === "string") {
        message = env.message;
      } else if (Array.isArray(env.message)) {
        // 422 validation errors: array of {loc, msg, ...}.
        message = env.message
          .map((e: { msg?: string }) => e.msg)
          .filter(Boolean)
          .join("; ");
      }
    }
  } catch {
    // non-JSON body; keep the status text
  }
  return new ApiError(res.status, message, requestId);
}

async function doFetch(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!opts.anonymous && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

// Refresh coordination: collapse concurrent refreshes into a single in-flight promise.
let refreshInFlight: Promise<boolean> | null = null;

// Exported so the chat client (lib/chatApi.ts) shares one refresh-coordination point: concurrent
// 401s across the accounts and chat clients collapse into a single /auth/refresh call.
export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await doFetch("/auth/refresh", {
          method: "POST",
          anonymous: true,
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { access_token: string };
        accessToken = data.access_token;
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await doFetch(path, opts);

  if (res.status === 401 && !opts.skipAuthRetry && !opts.anonymous) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(path, opts);
    } else {
      onAuthFailure?.();
      throw await parseError(res);
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
