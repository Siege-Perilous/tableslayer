DROP INDEX "email_verification_codes_user_id_unique";--> statement-breakpoint
DROP INDEX "files_location_unique";--> statement-breakpoint
DROP INDEX "unique_party_name";--> statement-breakpoint
DROP INDEX "party_invite_code_unique";--> statement-breakpoint
DROP INDEX "party_name_unique";--> statement-breakpoint
DROP INDEX "party_slug_unique";--> statement-breakpoint
DROP INDEX "reset_password_codes_user_id_unique";--> statement-breakpoint
DROP INDEX "unique_session_scene_order";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "weather_fov" TO "weather_fov" integer NOT NULL DEFAULT 60;--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_codes_user_id_unique` ON `email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `files_location_unique` ON `files` (`location`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_party_name` ON `game_session` (`party_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_invite_code_unique` ON `party_invite` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_name_unique` ON `party` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `party_slug_unique` ON `party` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `reset_password_codes_user_id_unique` ON `reset_password_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_scene_order` ON `scene` (`session_id`,`order`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "weather_opacity" TO "weather_opacity" real NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `users` ADD `favorite_party` text REFERENCES party(id);