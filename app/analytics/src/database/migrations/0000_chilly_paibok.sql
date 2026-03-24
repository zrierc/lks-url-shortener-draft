CREATE TABLE IF NOT EXISTS "click_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" varchar(45),
	"country" varchar(8),
	"city" varchar(128),
	"device_type" varchar(16),
	"os" varchar(64),
	"browser" varchar(64),
	"referrer" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "url_stats" (
	"code" varchar(10) PRIMARY KEY NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_clicked" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "urls" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"original" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "urls_code_unique" UNIQUE("code")
);
