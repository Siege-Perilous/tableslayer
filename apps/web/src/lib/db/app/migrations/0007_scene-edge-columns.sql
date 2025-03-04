ALTER TABLE `scene` ADD `edge_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `edge_url` text;--> statement-breakpoint
ALTER TABLE `scene` ADD `edge_opacity` real DEFAULT 0.3 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `edge_scale` real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `edge_fade_start` real DEFAULT 0.2 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `edge_fade_end` real DEFAULT 1 NOT NULL;