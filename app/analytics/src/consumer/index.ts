import { eq, sql } from "drizzle-orm";
import { db } from "../config/database";
import { clickLog, urlStats } from "../database/schema/index";
import { clickEventSchema } from "../types/index";
import { pollMessages, deleteMessage } from "../utils/sqs";
import { resolveLocation } from "../utils/geo";
import { parseUserAgent } from "../utils/ua-parser";
import type { Message } from "@aws-sdk/client-sqs";

async function processMessage(message: Message): Promise<void> {
  if (!message.Body) {
    throw new Error("Message has no body");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(message.Body);
  } catch {
    throw new Error(`Message body is not valid JSON: ${message.Body}`);
  }

  const parsed = clickEventSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid message shape: ${parsed.error.message}`);
  }

  const event = parsed.data;
  const { country, city } = resolveLocation(event.ip);
  const { device_type, os, browser } = parseUserAgent(event.user_agent);

  // Upsert url_stats
  await db
    .insert(urlStats)
    .values({
      code: event.code,
      clickCount: 1,
      lastClicked: new Date(),
    })
    .onConflictDoUpdate({
      target: urlStats.code,
      set: {
        clickCount: sql`${urlStats.clickCount} + 1`,
        lastClicked: new Date(),
      },
    });

  // Insert click_log
  await db.insert(clickLog).values({
    code: event.code,
    clickedAt: new Date(event.clicked_at),
    ip: event.ip,
    country,
    city,
    deviceType: device_type,
    os,
    browser,
    referrer: event.referrer || null,
  });
}

let _running = false;

export function stopConsumer(): void {
  _running = false;
}

export async function startConsumer(): Promise<void> {
  _running = true;
  console.log("[consumer] Starting SQS consumer...");

  while (_running) {
    try {
      const messages = await pollMessages();
      for (const message of messages) {
        try {
          await processMessage(message);
          // Only delete on successful processing
          await deleteMessage(message.ReceiptHandle!);
        } catch (msgErr) {
          // Do NOT delete — message will re-appear after VisibilityTimeout and
          // eventually route to DLQ after maxReceiveCount retries.
          console.error("[consumer] Failed to process message (will retry via SQS):", msgErr);
        }
      }
    } catch (err) {
      console.error("[consumer] Error in polling loop:", err);
      await Bun.sleep(5000);
    }
  }

  console.log("[consumer] Consumer stopped.");
}
