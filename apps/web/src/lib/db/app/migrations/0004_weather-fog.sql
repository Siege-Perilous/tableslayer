ALTER TABLE `scene` ADD `fog_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `fog_color` text DEFAULT '#a0a0a0' NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `fog_opacity` real DEFAULT 0.8 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` DROP COLUMN `weather_color`;