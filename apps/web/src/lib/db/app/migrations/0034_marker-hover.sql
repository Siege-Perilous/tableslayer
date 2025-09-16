PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_marker` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`visibility` integer DEFAULT 1 NOT NULL,
	`title` text DEFAULT 'New token' NOT NULL,
	`label` text,
	`image_location` text,
	`image_scale` real DEFAULT 1 NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`shape` integer DEFAULT 1 NOT NULL,
	`shape_color` text DEFAULT '#ffffff' NOT NULL,
	`size` integer DEFAULT 1 NOT NULL,
	`note` text,
	FOREIGN KEY (`scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_marker_visibility" CHECK("__new_marker"."visibility" >= 0 AND "__new_marker"."visibility" <= 3),
	CONSTRAINT "protected_marker_shape" CHECK("__new_marker"."shape" >= 0 AND "__new_marker"."shape" <= 3),
	CONSTRAINT "protected_marker_size" CHECK("__new_marker"."size" >= 1 AND "__new_marker"."size" <= 3)
);
--> statement-breakpoint
INSERT INTO `__new_marker`("id", "scene_id", "visibility", "title", "label", "image_location", "image_scale", "position_x", "position_y", "shape", "shape_color", "size", "note") SELECT "id", "scene_id", "visibility", "title", "label", "image_location", "image_scale", "position_x", "position_y", "shape", "shape_color", "size", "note" FROM `marker`;--> statement-breakpoint
DROP TABLE `marker`;--> statement-breakpoint
ALTER TABLE `__new_marker` RENAME TO `marker`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_marker_scene_id` ON `marker` (`scene_id`);