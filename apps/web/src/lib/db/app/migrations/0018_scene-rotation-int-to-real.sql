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
	CONSTRAINT "protected_slug_check" CHECK(slug NOT IN ('signup', 'login', 'forgot-password', 'reset-password', 'verify-email', 'accept-invite', 'api', 'invalidate-invite', 'logout', 'create-party', 'profile', 'test', 'api', 'healthcheck', 'help', 'tos'))
);
--> statement-breakpoint
INSERT INTO `__new_party`("id", "name", "slug", "avatar_file_id", "pause_screen_file_id", "tv_size", "default_grid_type", "default_display_size_x", "default_display_size_y", "default_resolution_x", "default_resolution_y", "default_display_padding_x", "default_display_padding_y", "default_grid_spacing", "default_line_thickness", "plan_next_billing_date", "plan_expiration_date", "plan_status", "lemon_squeezy_customer_id", "stripe_customer_id", "plan") SELECT "id", "name", "slug", "avatar_file_id", "pause_screen_file_id", "tv_size", "default_grid_type", "default_display_size_x", "default_display_size_y", "default_resolution_x", "default_resolution_y", "default_display_padding_x", "default_display_padding_y", "default_grid_spacing", "default_line_thickness", "plan_next_billing_date", "plan_expiration_date", "plan_status", "lemon_squeezy_customer_id", "stripe_customer_id", "plan" FROM `party`;--> statement-breakpoint
DROP TABLE `party`;--> statement-breakpoint
ALTER TABLE `__new_party` RENAME TO `party`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `party_name_unique` ON `party` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_slug_unique` ON `party` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_party_slug` ON `party` (`slug`);--> statement-breakpoint
DROP INDEX "email_verification_codes_user_id_unique";--> statement-breakpoint
DROP INDEX "files_location_unique";--> statement-breakpoint
DROP INDEX "unique_party_name";--> statement-breakpoint
DROP INDEX "idx_game_session_party_id";--> statement-breakpoint
DROP INDEX "idx_game_session_last_updated";--> statement-breakpoint
DROP INDEX "idx_game_session_slug";--> statement-breakpoint
DROP INDEX "idx_marker_scene_id";--> statement-breakpoint
DROP INDEX "party_invite_code_unique";--> statement-breakpoint
DROP INDEX "idx_party_invite_party_id";--> statement-breakpoint
DROP INDEX "idx_party_invite_email";--> statement-breakpoint
DROP INDEX "idx_party_invite_code";--> statement-breakpoint
DROP INDEX "idx_party_member_party_id";--> statement-breakpoint
DROP INDEX "idx_party_member_user_id";--> statement-breakpoint
DROP INDEX "idx_party_member_party_role";--> statement-breakpoint
DROP INDEX "party_name_unique";--> statement-breakpoint
DROP INDEX "party_slug_unique";--> statement-breakpoint
DROP INDEX "idx_party_slug";--> statement-breakpoint
DROP INDEX "reset_password_codes_user_id_unique";--> statement-breakpoint
DROP INDEX "unique_session_scene_order";--> statement-breakpoint
DROP INDEX "idx_scene_order";--> statement-breakpoint
DROP INDEX "idx_scene_game_session_id";--> statement-breakpoint
DROP INDEX "idx_session_user_id";--> statement-breakpoint
DROP INDEX "idx_user_files_user_id";--> statement-breakpoint
DROP INDEX "idx_user_files_file_id";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "scene_offset_x" TO "scene_offset_x" real NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_codes_user_id_unique` ON `email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `files_location_unique` ON `files` (`location`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_party_name` ON `game_session` (`party_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_game_session_party_id` ON `game_session` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_game_session_last_updated` ON `game_session` (`last_updated`);--> statement-breakpoint
CREATE INDEX `idx_game_session_slug` ON `game_session` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_marker_scene_id` ON `marker` (`scene_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_invite_code_unique` ON `party_invite` (`code`);--> statement-breakpoint
CREATE INDEX `idx_party_invite_party_id` ON `party_invite` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_party_invite_email` ON `party_invite` (`email`);--> statement-breakpoint
CREATE INDEX `idx_party_invite_code` ON `party_invite` (`code`);--> statement-breakpoint
CREATE INDEX `idx_party_member_party_id` ON `party_member` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_party_member_user_id` ON `party_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_party_member_party_role` ON `party_member` (`party_id`,`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `reset_password_codes_user_id_unique` ON `reset_password_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_scene_order` ON `scene` (`session_id`,`order`);--> statement-breakpoint
CREATE INDEX `idx_scene_order` ON `scene` (`order`);--> statement-breakpoint
CREATE INDEX `idx_scene_game_session_id` ON `scene` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_files_user_id` ON `user_files` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_files_file_id` ON `user_files` (`file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "scene_offset_y" TO "scene_offset_y" real NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "scene_rotation" TO "scene_rotation" real NOT NULL;