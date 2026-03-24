import type { CacheDriver } from "./interface";

export class NoopDriver implements CacheDriver {
  async get(_code: string): Promise<string | null> {
    return null;
  }

  async set(_code: string, _originalUrl: string): Promise<void> {
    // no-op
  }

  async del(_code: string): Promise<void> {
    // no-op
  }

  async checkHealth(): Promise<{ status: "ok" | "error"; latency_ms: number }> {
    return { status: "ok", latency_ms: 0 };
  }
}
