CREATE TABLE `light` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`radius` real DEFAULT 2 NOT NULL,
	`color` text DEFAULT '#FFA500' NOT NULL,
	`style` text DEFAULT 'lantern' NOT NULL,
	`pulse` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_light_pulse" CHECK("light"."pulse" >= 0 AND "light"."pulse" <= 3),
	CONSTRAINT "protected_light_radius" CHECK("light"."radius" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_light_scene_id` ON `light` (`scene_id`);