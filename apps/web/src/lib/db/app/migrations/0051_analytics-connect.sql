CREATE TABLE `realtime_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`party_id` text NOT NULL,
	`game_session_id` text,
	`kind` text NOT NULL,
	`user_id` text,
	`connections` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`party_id`) REFERENCES `party`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`game_session_id`) REFERENCES `game_session`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_realtime_activity_party_created` ON `realtime_activity` (`party_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_realtime_activity_session_created` ON `realtime_activity` (`game_session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_realtime_activity_created_at` ON `realtime_activity` (`created_at`);