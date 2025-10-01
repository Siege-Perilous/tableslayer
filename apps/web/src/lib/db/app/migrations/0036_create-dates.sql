ALTER TABLE `game_session` ADD `created_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `game_session` SET `created_at` = unixepoch() WHERE `created_at` = 0;--> statement-breakpoint
UPDATE `users` SET `created_at` = unixepoch() WHERE `created_at` = 0;