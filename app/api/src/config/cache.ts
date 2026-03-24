import { env } from "../env";
import type { CacheDriver } from "./drivers/interface";

export type { CacheDriver };

let _driver: CacheDriver | null = null;

export async function getCacheDriver(): Promise<CacheDriver> {
  if (_driver) return _driver;

  if (env.DYNAMODB_TABLE && env.DYNAMODB_REGION) {
    const { DynamoDBDriver } = await import("./drivers/dynamodb");
    _driver = new DynamoDBDriver();
    return _driver;
  }

  if (env.REDIS_URL) {
    const { RedisDriver } = await import("./drivers/redis");
    _driver = new RedisDriver();
    return _driver;
  }

  // fallback: no-op driver (for local dev without cache)
  const { NoopDriver } = await import("./drivers/noop");
  _driver = new NoopDriver();
  return _driver;
}
