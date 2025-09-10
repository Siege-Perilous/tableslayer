PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_party` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`avatar_file_id` integer DEFAULT 1 NOT NULL,
	`pause_screen_file_id` integer DEFAULT 1 NOT NULL,
	`active_scene_id` text,
	`is_paused` integer DEFAULT false NOT NULL,
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
	CONSTRAINT "protected_slug_check" CHECK(slug NOT IN ('signup', 'login', 'forgot-password', 'reset-password', 'verify-email', 'accept-invite', 'api', 'invalidate-invite', 'logout', 'create-party', 'profile', 'test', 'api', 'healthcheck', 'help', 'tos', 'promo'))
);
--> statement-breakpoint
INSERT INTO `__new_party`("id", "name", "slug", "avatar_file_id", "pause_screen_file_id", "active_scene_id", "is_paused", "tv_size", "default_grid_type", "default_display_size_x", "default_display_size_y", "default_resolution_x", "default_resolution_y", "default_display_padding_x", "default_display_padding_y", "default_grid_spacing", "default_line_thickness", "plan_next_billing_date", "plan_expiration_date", "plan_status", "lemon_squeezy_customer_id", "stripe_customer_id", "plan") SELECT "id", "name", "slug", "avatar_file_id", "pause_screen_file_id", "active_scene_id", "is_paused", "tv_size", "default_grid_type", "default_display_size_x", "default_display_size_y", "default_resolution_x", "default_resolution_y", "default_display_padding_x", "default_display_padding_y", "default_grid_spacing", "default_line_thickness", "plan_next_billing_date", "plan_expiration_date", "plan_status", "lemon_squeezy_customer_id", "stripe_customer_id", "plan" FROM `party`;--> statement-breakpoint
DROP TABLE `party`;--> statement-breakpoint
ALTER TABLE `__new_party` RENAME TO `party`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `party_name_unique` ON `party` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_slug_unique` ON `party` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_party_slug` ON `party` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_promos` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`max_uses` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "valid_max_uses" CHECK("__new_promos"."max_uses" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_promos`("id", "key", "max_uses", "created_by", "created_at", "is_active") SELECT "id", "key", 1, "created_by", "created_at", "is_active" FROM `promos`;--> statement-breakpoint
DROP TABLE `promos`;--> statement-breakpoint
ALTER TABLE `__new_promos` RENAME TO `promos`;--> statement-breakpoint
CREATE UNIQUE INDEX `promos_key_unique` ON `promos` (`key`);--> statement-breakpoint
CREATE INDEX `idx_promos_key` ON `promos` (`key`);--> statement-breakpoint
CREATE INDEX `idx_promos_created_by` ON `promos` (`created_by`);