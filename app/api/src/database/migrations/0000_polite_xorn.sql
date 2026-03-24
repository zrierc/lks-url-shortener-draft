CREATE TABLE IF NOT EXISTS "urls" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"original" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "urls_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_urls_code" ON "urls" USING btree ("code");