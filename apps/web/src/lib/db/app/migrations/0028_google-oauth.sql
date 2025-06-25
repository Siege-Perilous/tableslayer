ALTER TABLE `users` ALTER COLUMN "password_hash" TO "password_hash" text;--> statement-breakpoint
ALTER TABLE `users` ADD `google_id` text;
