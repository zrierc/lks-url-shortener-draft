import { z } from "zod";

export const clickEventSchema = z.object({
  code: z.string(),
  clicked_at: z.string().datetime(),
  ip: z.string(),
  user_agent: z.string(),
  referrer: z.string(),
});

export type ClickEvent = z.infer<typeof clickEventSchema>;

export type StatsResponse = {
  code: string;
  original_url: string;
  click_count: number;
  last_clicked: string | null;
  clicks_over_time: Array<{ date: string; count: number }>;
  by_device: Array<{ device_type: string; count: number }>;
  by_os: Array<{ os: string; count: number }>;
  by_browser: Array<{ browser: string; count: number }>;
  by_country: Array<{ country: string; count: number }>;
};

export type LeaderboardEntry = {
  code: string;
  click_count: number;
  last_clicked: string | null;
};

export type ServiceStatus = {
  status: "ok" | "error";
  latency_ms: number;
  error?: string;
};

export type HealthData = {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    postgres: ServiceStatus;
    sqs: ServiceStatus;
  };
};
