import type { LeaderboardEntry, PaginatedResponse, ShortenResponse, StatsResponse } from "#/types/index";

const API_BASE = "/api";

export const apiClient = {
  shorten: async (url: string): Promise<ShortenResponse> => {
    const res = await fetch(`${API_BASE}/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json() as { success: boolean; data: ShortenResponse; error?: string };
    if (!data.success) throw new Error(data.error ?? "Unknown error");
    return data.data;
  },

  getStats: async (code: string): Promise<StatsResponse> => {
    const res = await fetch(`${API_BASE}/stats/${encodeURIComponent(code)}`);
    const data = await res.json() as { success: boolean; data: StatsResponse; error?: string };
    if (!data.success) throw new Error(data.error ?? "Unknown error");
    return data.data;
  },

  getLeaderboard: async (params?: {
    q?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<LeaderboardEntry>> => {
    const qs = new URLSearchParams();
    if (params?.q)     qs.set("q",     params.q);
    if (params?.from)  qs.set("from",  params.from);
    if (params?.to)    qs.set("to",    params.to);
    if (params?.sort)  qs.set("sort",  params.sort);
    if (params?.order) qs.set("order", params.order);
    if (params?.page  != null) qs.set("page",  String(params.page));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString();
    const res = await fetch(`${API_BASE}/stats${query ? `?${query}` : ""}`);
    const data = await res.json() as { success: boolean; data: PaginatedResponse<LeaderboardEntry>; error?: string };
    if (!data.success) throw new Error(data.error ?? "Unknown error");
    return data.data;
  },

  getLinks: async (params?: {
    q?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ShortenResponse>> => {
    const qs = new URLSearchParams();
    if (params?.q)     qs.set("q",     params.q);
    if (params?.sort)  qs.set("sort",  params.sort);
    if (params?.order) qs.set("order", params.order);
    if (params?.page  != null) qs.set("page",  String(params.page));
    if (params?.limit != null) qs.set("limit", String(params.limit));
    const query = qs.toString();
    const res = await fetch(`${API_BASE}/shorten${query ? `?${query}` : ""}`);
    const data = await res.json() as { success: boolean; data: PaginatedResponse<ShortenResponse>; error?: string };
    if (!data.success) throw new Error(data.error ?? "Unknown error");
    return data.data;
  },
};
