import type { AuthUser, CreateUrlResponse, ShortUrl, UrlStatus } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const TOKEN_KEY = "fasturl_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message =
      (body && (body.error || body.message)) ||
      "Something went wrong. Please try again.";
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export async function signUp(email: string, password: string, name: string): Promise<void> {
  await request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function signIn(email: string, password: string): Promise<void> {
  const body = await request<{ token: string }>("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(body.token);
}

export async function signOut(): Promise<void> {
  try {
    await request("/api/auth/sign-out", { method: "POST" });
  } finally {
    clearToken();
  }
}

export async function getMe(): Promise<AuthUser> {
  const body = await request<{ user: AuthUser }>("/api/me");
  return body.user;
}

export async function listUrls(limit: number, offset: number): Promise<ShortUrl[]> {
  return request(`/api/v1/urls?limit=${limit}&offset=${offset}`);
}

export interface CreateUrlInput {
  destination: string;
  customAlias?: string;
  expiresAt?: string | null;
}

export async function createUrl(input: CreateUrlInput): Promise<CreateUrlResponse> {
  return request("/api/v1/urls", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface UpdateUrlInput {
  destination?: string;
  status?: UrlStatus;
  expiresAt?: string | null;
}

export async function updateUrl(shortCode: string, patch: UpdateUrlInput): Promise<ShortUrl> {
  return request(`/api/v1/urls/${encodeURIComponent(shortCode)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteUrl(shortCode: string): Promise<void> {
  await request(`/api/v1/urls/${encodeURIComponent(shortCode)}`, { method: "DELETE" });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalClicks: number;
  topReferrers: { referrer: string; count: number }[];
  topOs: { os: string; count: number }[];
  topBrowsers: { browser: string; count: number }[];
  topDeviceTypes: { deviceType: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

export interface TimeSeriesPoint {
  bucket: string;
  clicks: number;
}

export type AnalyticsRange = "24h" | "7d" | "30d";

export async function getAnalyticsSummary(shortCode: string): Promise<AnalyticsSummary> {
  return request(`/api/v1/urls/${encodeURIComponent(shortCode)}/analytics/summary`);
}

export async function getAnalyticsTimeSeries(
  shortCode: string,
  range: AnalyticsRange
): Promise<TimeSeriesPoint[]> {
  return request(`/api/v1/urls/${encodeURIComponent(shortCode)}/analytics/timeseries?range=${range}`);
}
