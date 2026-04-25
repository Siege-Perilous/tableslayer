PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_light` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`radius` real DEFAULT 2 NOT NULL,
	`color` text DEFAULT '#FFA500' NOT NULL,
	`style` text DEFAULT 'lantern' NOT NULL,
	`pulse` integer DEFAULT 0 NOT NULL,
	`opacity` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_light_pulse" CHECK("__new_light"."pulse" >= 0 AND "__new_light"."pulse" <= 3),
	CONSTRAINT "protected_light_radius" CHECK("__new_light"."radius" > 0),
	CONSTRAINT "protected_light_opacity" CHECK("__new_light"."opacity" >= 0 AND "__new_light"."opacity" <= 1)
);
--> statement-breakpoint
INSERT INTO `__new_light`("id", "scene_id", "position_x", "position_y", "radius", "color", "style", "pulse", "opacity") SELECT "id", "scene_id", "position_x", "position_y", "radius", "color", "style", "pulse", "opacity" FROM `light`;--> statement-breakpoint
DROP TABLE `light`;--> statement-breakpoint
ALTER TABLE `__new_light` RENAME TO `light`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_light_scene_id` ON `light` (`scene_id`);