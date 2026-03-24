import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { env } from "../../env";
import type { CacheDriver } from "./interface";

export class DynamoDBDriver implements CacheDriver {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient(
      env.DYNAMODB_REGION ? { region: env.DYNAMODB_REGION } : {},
    );
    this.tableName = env.DYNAMODB_TABLE!;
  }

  async get(code: string): Promise<string | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { code: { S: code } },
      }),
    );
    return result.Item?.original_url?.S ?? null;
  }

  async set(code: string, originalUrl: string): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          code: { S: code },
          original_url: { S: originalUrl },
          ttl: { N: String(Math.floor(Date.now() / 1000) + 3600) },
        },
      }),
    );
  }

  async del(code: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: { code: { S: code } },
      }),
    );
  }

  async checkHealth(): Promise<{ status: "ok" | "error"; latency_ms: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.send(
        new DescribeTableCommand({ TableName: this.tableName }),
      );
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
