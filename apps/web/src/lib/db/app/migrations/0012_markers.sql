CREATE TABLE `marker` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`visibility` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`text` text,
	`image` text,
	`image_scale` real DEFAULT 1 NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`shape` integer DEFAULT 0 NOT NULL,
	`shape_color` text DEFAULT '#ffffff' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_marker_visibility" CHECK("marker"."visibility" >= 0 AND "marker"."visibility" <= 2),
	CONSTRAINT "protected_marker_shape" CHECK("marker"."shape" >= 0 AND "marker"."shape" <= 2),
	CONSTRAINT "protected_marker_size" CHECK("marker"."size" >= 0 AND "marker"."size" <= 2)
);
--> statement-breakpoint
CREATE INDEX `idx_marker_scene_id` ON `marker` (`scene_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_party` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`avatar_file_id` integer DEFAULT 1 NOT NULL,
	`pause_screen_file_id` integer DEFAULT 1 NOT NULL,
	`tv_size` integer DEFAULT 40 NOT NULL,
	`default_grid_type` integer DEFAULT 0 NOT NULL,
	`default_display_size_x` real DEFAULT 17.77 NOT NULL,
	`default_display_size_y` real DEFAULT 10 NOT NULL,
	`default_resolution_x` integer DEFAULT 1920 NOT NULL,
	`default_resolution_y` integer DEFAULT 1080 NOT NULL,
	`default_display_padding_x` integer DEFAULT 16 NOT NULL,
	`default_display_padding_y` integer DEFAULT 16 NOT NULL,
	`default_grid_spacing` integer DEFAULT 1 NOT NULL,
	`default_line_thickness` integer DEFAULT 1 NOT NULL,
	`plan_next_billing_date` integer,
	`plan_expiration_date` integer,
	`plan_status` text,
	`lemon_squeezy_customer_id` integer,
	`stripe_customer_id` text,
	`plan` text DEFAULT 'free' NOT NULL,
	FOREIGN KEY (`avatar_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pause_screen_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_slug_check" CHECK(slug NOT IN ('signup', 'login', 'forgot-password', 'reset-password', 'verify-email', 'accept-invite', 'api', 'invalidate-invite', 'logout', 'create-party', 'profile', 'test', 'api', 'healthcheck', 'help'))
);
--> statement-breakpoint
INSERT INTO `__new_party`("id", "name", "slug", "avatar_file_id", "pause_screen_file_id", "tv_size", "default_grid_type", "default_display_size_x", "default_display_size_y", "default_resolution_x", "default_resolution_y", "default_display_padding_x", "default_display_padding_y", "default_grid_spacing", "default_line_thickness", "plan_next_billing_date", "plan_expiration_date", "plan_status", "lemon_squeezy_customer_id", "stripe_customer_id", "plan") SELECT "id", "name", "slug", "avatar_file_id", "pause_screen_file_id", "tv_size", "default_grid_type", "default_display_size_x", "default_display_size_y", "default_resolution_x", "default_resolution_y", "default_display_padding_x", "default_display_padding_y", "default_grid_spacing", "default_line_thickness", "plan_next_billing_date", "plan_expiration_date", "plan_status", "lemon_squeezy_customer_id", "stripe_customer_id", "plan" FROM `party`;--> statement-breakpoint
DROP TABLE `party`;--> statement-breakpoint
ALTER TABLE `__new_party` RENAME TO `party`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `party_name_unique` ON `party` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_slug_unique` ON `party` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_party_slug` ON `party` (`slug`);--> statement-breakpoint
ALTER TABLE `scene` ADD `marker_stroke_color` text DEFAULT '#000000' NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `marker_stroke_width` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `marker_text_color` text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `marker_text_stroke_color` text DEFAULT '#000000' NOT NULL;