import { env } from "../../env";
import type { CacheDriver } from "./interface";

export class RedisDriver implements CacheDriver {
  private redis: Bun.RedisClient;

  constructor() {
    this.redis = new Bun.RedisClient(env.REDIS_URL!);
  }

  async get(code: string): Promise<string | null> {
    const value = await this.redis.get(`url:${code}`);
    return value ?? null;
  }

  async set(code: string, originalUrl: string): Promise<void> {
    await this.redis.set(`url:${code}`, originalUrl, "EX", 3600);
  }

  async del(code: string): Promise<void> {
    await this.redis.del(`url:${code}`);
  }

  async checkHealth(): Promise<{ status: "ok" | "error"; latency_ms: number; error?: string }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { status: "ok", latency_ms: Date.now() - start };
    } catch (e) {
      return {
        status: "error",
        latency_ms: -1,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
