export type ClickEvent = {
  code: string;
  clicked_at: string; // ISO 8601
  ip: string;
  user_agent: string;
  referrer: string;
};

export type ShortenResult = {
  code: string;
  short_url: string;
  original_url: string;
  created_at: string;
};

export type PaginatedLinks = {
  items: ShortenResult[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type ServiceHealth = {
  status: "ok" | "error";
  latency_ms: number;
  error?: string;
};

export type HealthData = {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    postgres: ServiceHealth;
    dynamodb?: ServiceHealth;
    redis?: ServiceHealth;
  };
};
