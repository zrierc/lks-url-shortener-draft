export interface CacheDriver {
  get(code: string): Promise<string | null>;
  set(code: string, originalUrl: string): Promise<void>;
  del(code: string): Promise<void>;
  checkHealth(): Promise<{ status: "ok" | "error"; latency_ms: number; error?: string }>;
}
