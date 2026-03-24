import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  type Message,
} from "@aws-sdk/client-sqs";
import { env } from "../env";

const sqsRegion = env.SQS_URL.match(/sqs\.([^.]+)\.amazonaws/)?.[1] ?? env.AWS_DEFAULT_REGION;

export const sqsClient = new SQSClient({ region: sqsRegion });

export async function pollMessages(): Promise<Message[]> {
  const result = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: env.SQS_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 30,
    }),
  );
  return result.Messages ?? [];
}

export async function deleteMessage(receiptHandle: string): Promise<void> {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: env.SQS_URL,
      ReceiptHandle: receiptHandle,
    }),
  );
}

export async function checkSqsHealth(): Promise<{ status: "ok" | "error"; latency_ms: number; error?: string }> {
  const start = Date.now();
  try {
    await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: env.SQS_URL,
        AttributeNames: ["QueueArn"],
      }),
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
