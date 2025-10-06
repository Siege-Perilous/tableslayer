DROP INDEX "idx_annotations_scene_id";--> statement-breakpoint
DROP INDEX "idx_annotations_order";--> statement-breakpoint
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
DROP INDEX "unique_promo_user";--> statement-breakpoint
DROP INDEX "idx_promo_redemptions_promo_id";--> statement-breakpoint
DROP INDEX "idx_promo_redemptions_user_id";--> statement-breakpoint
DROP INDEX "idx_promo_redemptions_party_id";--> statement-breakpoint
DROP INDEX "promos_key_unique";--> statement-breakpoint
DROP INDEX "idx_promos_key";--> statement-breakpoint
DROP INDEX "idx_promos_created_by";--> statement-breakpoint
DROP INDEX "reset_password_codes_user_id_unique";--> statement-breakpoint
DROP INDEX "unique_session_scene_order";--> statement-breakpoint
DROP INDEX "idx_scene_order";--> statement-breakpoint
DROP INDEX "idx_scene_game_session_id";--> statement-breakpoint
DROP INDEX "idx_session_user_id";--> statement-breakpoint
DROP INDEX "idx_user_files_user_id";--> statement-breakpoint
DROP INDEX "idx_user_files_file_id";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_google_id_unique";--> statement-breakpoint
ALTER TABLE `party` ALTER COLUMN "default_display_size_x" TO "default_display_size_x" real NOT NULL DEFAULT 34.86;--> statement-breakpoint
CREATE INDEX `idx_annotations_scene_id` ON `annotations` (`scene_id`);--> statement-breakpoint
CREATE INDEX `idx_annotations_order` ON `annotations` (`scene_id`,`order`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `party_name_unique` ON `party` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_slug_unique` ON `party` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_party_slug` ON `party` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_promo_user` ON `promo_redemptions` (`promo_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_redemptions_promo_id` ON `promo_redemptions` (`promo_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_redemptions_user_id` ON `promo_redemptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_redemptions_party_id` ON `promo_redemptions` (`party_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `promos_key_unique` ON `promos` (`key`);--> statement-breakpoint
CREATE INDEX `idx_promos_key` ON `promos` (`key`);--> statement-breakpoint
CREATE INDEX `idx_promos_created_by` ON `promos` (`created_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `reset_password_codes_user_id_unique` ON `reset_password_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_scene_order` ON `scene` (`session_id`,`order`);--> statement-breakpoint
CREATE INDEX `idx_scene_order` ON `scene` (`order`);--> statement-breakpoint
CREATE INDEX `idx_scene_game_session_id` ON `scene` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_files_user_id` ON `user_files` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_files_file_id` ON `user_files` (`file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_id_unique` ON `users` (`google_id`);--> statement-breakpoint
ALTER TABLE `party` ALTER COLUMN "default_display_size_y" TO "default_display_size_y" real NOT NULL DEFAULT 19.6;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "display_size_x" TO "display_size_x" real NOT NULL DEFAULT 34.86;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "display_size_y" TO "display_size_y" real NOT NULL DEFAULT 19.6;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "fog_of_war_color" TO "fog_of_war_color" text NOT NULL DEFAULT '#CCC';--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "fog_of_war_opacity_dm" TO "fog_of_war_opacity_dm" real NOT NULL DEFAULT 0.5;