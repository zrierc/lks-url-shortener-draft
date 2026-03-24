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

export type ShortenResponse = {
  code: string;
  short_url: string;
  original_url: string;
  created_at: string;
};
