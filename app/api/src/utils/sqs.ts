import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { env } from "../env";
import type { ClickEvent } from "../types";

// Extract region from SQS URL: https://sqs.<region>.amazonaws.com/...
function regionFromSqsUrl(url: string): string {
  const match = /https:\/\/sqs\.([^.]+)\.amazonaws\.com/.exec(url);
  return match?.[1] ?? "us-east-1";
}

const sqsClient = new SQSClient({
  region: regionFromSqsUrl(env.SQS_URL),
});

export async function publishClickEvent(event: ClickEvent): Promise<void> {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: env.SQS_URL,
      MessageBody: JSON.stringify(event),
    }),
  );
}
