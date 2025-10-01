ALTER TABLE `party` ADD `created_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `party` SET `created_at` = unixepoch() WHERE `created_at` = 0;