import type { LeaderboardEntry, ShortenResponse, StatsResponse } from "#/types/index";

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

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json() as { success: boolean; data: LeaderboardEntry[]; error?: string };
    if (!data.success) throw new Error(data.error ?? "Unknown error");
    return data.data;
  },
};
