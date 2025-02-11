CREATE TABLE `email_verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer DEFAULT (strftime('%s', 'now') + 60 * 15) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_codes_user_id_unique` ON `email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_location_unique` ON `files` (`location`);--> statement-breakpoint
CREATE TABLE `game_session` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`party_id` text NOT NULL,
	`active_scene_id` text,
	`is_paused` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`party_id`) REFERENCES `party`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`active_scene_id`) REFERENCES `scene`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_party_name` ON `game_session` (`party_id`,`slug`);--> statement-breakpoint
CREATE TABLE `party_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`party_id` text NOT NULL,
	`invited_by` text NOT NULL,
	`code` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`party_id`) REFERENCES `party`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `party_invite_code_unique` ON `party_invite` (`code`);--> statement-breakpoint
CREATE TABLE `party_member` (
	`party_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	PRIMARY KEY(`party_id`, `user_id`),
	FOREIGN KEY (`party_id`) REFERENCES `party`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `party` (
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
	`plan` text DEFAULT 'free' NOT NULL,
	FOREIGN KEY (`avatar_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pause_screen_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_slug_check" CHECK(slug NOT IN ('signup', 'login', 'forgot-password', 'reset-password', 'verify-email', 'accept-invite', 'api', 'invalidate-invite', 'logout', 'create-party', 'profile', 'test', 'api'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `party_name_unique` ON `party` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_slug_unique` ON `party` (`slug`);--> statement-breakpoint
CREATE TABLE `reset_password_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer DEFAULT (strftime('%s', 'now') + 60 * 15) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reset_password_codes_user_id_unique` ON `reset_password_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `scene` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text DEFAULT 'New Scene' NOT NULL,
	`order` integer NOT NULL,
	`background_color` text DEFAULT '#0b0b0c' NOT NULL,
	`display_padding_x` integer DEFAULT 16 NOT NULL,
	`display_padding_y` integer DEFAULT 16 NOT NULL,
	`display_size_x` real DEFAULT 17.77 NOT NULL,
	`display_size_y` real DEFAULT 10 NOT NULL,
	`display_resolution_x` integer DEFAULT 1920 NOT NULL,
	`display_resolution_y` integer DEFAULT 1080 NOT NULL,
	`fog_of_war_url` text,
	`fog_of_war_color` text DEFAULT '#000' NOT NULL,
	`fog_of_war_opacity` real DEFAULT 0.9 NOT NULL,
	`map_location` text,
	`map_rotation` integer DEFAULT 0 NOT NULL,
	`map_offset_x` real DEFAULT 0 NOT NULL,
	`map_offset_y` real DEFAULT 0 NOT NULL,
	`map_zoom` real DEFAULT 1 NOT NULL,
	`grid_type` integer DEFAULT 0 NOT NULL,
	`grid_spacing` integer DEFAULT 1 NOT NULL,
	`grid_opacity` real DEFAULT 0.8 NOT NULL,
	`grid_line_color` text DEFAULT '#E6E6E6' NOT NULL,
	`grid_line_thickness` integer DEFAULT 1 NOT NULL,
	`grid_shadow_color` text DEFAULT '#000000' NOT NULL,
	`grid_shadow_spread` integer DEFAULT 2 NOT NULL,
	`grid_shadow_blur` real DEFAULT 0.5 NOT NULL,
	`grid_shadow_opacity` real DEFAULT 0.4 NOT NULL,
	`scene_offset_x` integer DEFAULT 0 NOT NULL,
	`scene_offset_y` integer DEFAULT 0 NOT NULL,
	`scene_rotation` integer DEFAULT 0 NOT NULL,
	`weather_color` text DEFAULT '#FFFFFF' NOT NULL,
	`weather_fov` integer DEFAULT 50 NOT NULL,
	`weather_intensity` real DEFAULT 1 NOT NULL,
	`weather_opacity` real DEFAULT 0.5 NOT NULL,
	`weather_type` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_session`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_fog_of_war_opacity" CHECK("scene"."fog_of_war_opacity" >= 0 AND "scene"."fog_of_war_opacity" <= 1),
	CONSTRAINT "protected_grid_opacity" CHECK("scene"."grid_opacity" >= 0 AND "scene"."grid_opacity" <= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_scene_order` ON `scene` (`session_id`,`order`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_files` (
	`user_id` text NOT NULL,
	`file_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `file_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`password_hash` text NOT NULL,
	`avatar_file_id` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`avatar_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);