PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game_session` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`party_id` text NOT NULL,
	`is_paused` integer DEFAULT false NOT NULL,
	`last_updated` integer,
	FOREIGN KEY (`party_id`) REFERENCES `party`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_game_session`("id", "name", "slug", "party_id", "is_paused", "last_updated") SELECT "id", "name", "slug", "party_id", "is_paused", "last_updated" FROM `game_session`;--> statement-breakpoint
DROP TABLE `game_session`;--> statement-breakpoint
ALTER TABLE `__new_game_session` RENAME TO `game_session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_party_name` ON `game_session` (`party_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_game_session_party_id` ON `game_session` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_game_session_last_updated` ON `game_session` (`last_updated`);--> statement-breakpoint
CREATE INDEX `idx_game_session_slug` ON `game_session` (`slug`);