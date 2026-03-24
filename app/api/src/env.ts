import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SQS_URL: z.string().url(),
  BASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  // Batch A
  DYNAMODB_TABLE: z.string().optional(),
  DYNAMODB_REGION: z.string().optional(),
  // Batch B
  REDIS_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
