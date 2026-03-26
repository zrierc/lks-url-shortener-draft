import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  SQS_URL: z.string().url(),
  PORT: z.coerce.number().default(3001),
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_DEFAULT_REGION: z.string().default("us-east-1"),
});

export const env = envSchema.parse(process.env);
