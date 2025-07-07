CREATE TABLE `annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`name` text DEFAULT 'New Annotation' NOT NULL,
	`opacity` real DEFAULT 1 NOT NULL,
	`color` text DEFAULT '#FF0000' NOT NULL,
	`url` text,
	`visibility` integer DEFAULT 1 NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_annotation_opacity" CHECK("annotations"."opacity" >= 0 AND "annotations"."opacity" <= 1),
	CONSTRAINT "protected_annotation_visibility" CHECK("annotations"."visibility" >= 0 AND "annotations"."visibility" <= 1)
);
--> statement-breakpoint
CREATE INDEX `idx_annotations_scene_id` ON `annotations` (`scene_id`);--> statement-breakpoint
CREATE INDEX `idx_annotations_order` ON `annotations` (`scene_id`,`order`);--> statement-breakpoint
ALTER TABLE `scene` ADD `annotation_layers` text;