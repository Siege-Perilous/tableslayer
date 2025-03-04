CREATE INDEX `idx_game_session_party_id` ON `game_session` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_game_session_last_updated` ON `game_session` (`last_updated`);--> statement-breakpoint
CREATE INDEX `idx_game_session_slug` ON `game_session` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_party_invite_party_id` ON `party_invite` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_party_invite_email` ON `party_invite` (`email`);--> statement-breakpoint
CREATE INDEX `idx_party_invite_code` ON `party_invite` (`code`);--> statement-breakpoint
CREATE INDEX `idx_party_member_party_id` ON `party_member` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_party_member_user_id` ON `party_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_party_member_party_role` ON `party_member` (`party_id`,`role`);--> statement-breakpoint
CREATE INDEX `idx_party_slug` ON `party` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_scene_order` ON `scene` (`order`);--> statement-breakpoint
CREATE INDEX `idx_scene_game_session_id` ON `scene` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_files_user_id` ON `user_files` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_files_file_id` ON `user_files` (`file_id`);