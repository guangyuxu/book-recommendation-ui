// The fetch wrapper is the only place in the app that decides "is this caller authenticated?", so
// its 401 -> refresh -> retry path and its error-envelope parsing are the highest-value logic in
// src/lib. Every test here drives it through a stubbed global fetch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  api,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  setOnAuthFailure,
} from "@/lib/api";

const BASE = "http://localhost:8001";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

/** The Authorization header of the Nth fetch call (0-indexed), or undefined. */
function authHeaderOf(call: number): string | undefined {
  const mock = vi.mocked(globalThis.fetch);
  const init = mock.mock.calls[call]?.[1] as RequestInit | undefined;
  return (init?.headers as Record<string, string> | undefined)?.[
    "Authorization"
  ];
}

function urlOf(call: number): string {
  return String(vi.mocked(globalThis.fetch).mock.calls[call]?.[0]);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  // The module holds the token in a closure; reset it so tests can't leak into each other.
  setAccessToken(null);
  setOnAuthFailure(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("request headers", () => {
  it("sends the in-memory token as a Bearer header and includes credentials", async () => {
    setAccessToken("token-1");
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse(200, { id: "f1" }),
    );

    await api.get("/family");

    expect(urlOf(0)).toBe(`${BASE}/family`);
    expect(authHeaderOf(0)).toBe("Bearer token-1");
    const init = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    // The refresh cookie is HttpOnly and scoped to /auth; it only rides along with this.
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("GET");
  });

  it("omits Authorization when no token is held", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(jsonResponse(200, {}));

    await api.get("/family");

    expect(authHeaderOf(0)).toBeUndefined();
  });

  it("sets a JSON content type only when there is a body", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, {}));

    await api.post("/children", { display_name: "child-1" });
    await api.del("/children/c1");

    const withBody = vi.mocked(globalThis.fetch).mock
      .calls[0][1] as RequestInit;
    const withoutBody = vi.mocked(globalThis.fetch).mock
      .calls[1][1] as RequestInit;
    expect((withBody.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(withBody.body).toBe(JSON.stringify({ display_name: "child-1" }));
    expect(
      (withoutBody.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
    expect(withoutBody.body).toBeUndefined();
  });
});

describe("401 handling", () => {
  it("refreshes once and retries the original call with the NEW token", async () => {
    setAccessToken("stale");
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(emptyResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "fresh" }))
      .mockResolvedValueOnce(jsonResponse(200, { id: "f1" }));

    const out = await api.get<{ id: string }>("/family");

    expect(out).toEqual({ id: "f1" });
    expect(urlOf(1)).toBe(`${BASE}/auth/refresh`);
    // The refresh call itself must be anonymous -- sending the stale Bearer would be pointless.
    expect(authHeaderOf(1)).toBeUndefined();
    // The retry must NOT reuse the stale token.
    expect(authHeaderOf(2)).toBe("Bearer fresh");
    expect(getAccessToken()).toBe("fresh");
  });

  it("drops to logged-out and throws when refresh fails", async () => {
    const onFailure = vi.fn();
    setOnAuthFailure(onFailure);
    setAccessToken("stale");
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { message: "expired" } }),
      )
      .mockResolvedValueOnce(emptyResponse(401)); // refresh itself rejected

    await expect(api.get("/family")).rejects.toBeInstanceOf(ApiError);
    expect(onFailure).toHaveBeenCalledTimes(1);
    // Exactly two calls: the original and the one refresh attempt. No retry loop.
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the caller opted out (auth endpoints)", async () => {
    // login/signup must surface their own 401 as "bad credentials", not trigger a refresh.
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse(401, { error: { message: "invalid credentials" } }),
    );

    await expect(
      api.post("/auth/login", { email: "a@b.c" }, { skipAuthRetry: true }),
    ).rejects.toThrow("invalid credentials");
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });

  it("collapses concurrent 401s into a single refresh", async () => {
    setAccessToken("stale");
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        return jsonResponse(200, { access_token: "fresh" });
      }
      // Every protected call 401s until the token is refreshed.
      return getAccessToken() === "fresh"
        ? jsonResponse(200, { ok: true })
        : emptyResponse(401);
    });

    await Promise.all([api.get("/family"), api.get("/members")]);

    const refreshCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("reports refresh failure as false rather than throwing", async () => {
    // AuthProvider's silent-refresh-on-boot depends on this: a network error at startup must
    // resolve to "not logged in", not crash the render.
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("offline"));

    await expect(refreshAccessToken()).resolves.toBe(false);
  });
});

describe("error envelope parsing", () => {
  it("lifts message and request_id off the backend envelope", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse(404, {
        error: {
          code: "not_found",
          message: "child not found",
          request_id: "req-9",
        },
      }),
    );

    const err = await api.get("/children/c1").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe("child not found");
    expect((err as ApiError).requestId).toBe("req-9");
  });

  it("joins a 422 validation array into one sentence", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse(422, {
        error: {
          message: [
            { loc: ["body", "display_name"], msg: "field required" },
            { loc: ["body", "birth_date"], msg: "invalid date" },
            { loc: ["body", "other"] }, // no msg -- must be dropped, not stringified
          ],
        },
      }),
    );

    await expect(api.post("/children", {})).rejects.toThrow(
      "field required; invalid date",
    );
  });

  it("falls back to the status text on a non-JSON body", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("<html>502</html>", {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    const err = (await api.get("/family").catch((e: unknown) => e)) as ApiError;

    expect(err.status).toBe(502);
    expect(err.message).toBe("Bad Gateway");
  });

  it("resolves 204 to undefined instead of failing to parse a body", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(emptyResponse(204));

    await expect(api.del("/children/c1")).resolves.toBeUndefined();
  });
});

describe("token storage (PII / security rule)", () => {
  it("never persists the access token to web storage", async () => {
    // CLAUDE.md: the access token lives in memory ONLY. Persisting it would survive an XSS and
    // outlive the tab. This test is the executable form of that rule.
    setAccessToken("token-1");
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse(200, { access_token: "fresh" }),
    );

    await refreshAccessToken();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(getAccessToken()).toBe("fresh");
  });
});
