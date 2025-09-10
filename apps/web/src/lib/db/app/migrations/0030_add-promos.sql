CREATE TABLE `promo_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`promo_id` text NOT NULL,
	`user_id` text NOT NULL,
	`party_id` text NOT NULL,
	`redeemed_at` integer NOT NULL,
	FOREIGN KEY (`promo_id`) REFERENCES `promos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`party_id`) REFERENCES `party`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_promo_user` ON `promo_redemptions` (`promo_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_redemptions_promo_id` ON `promo_redemptions` (`promo_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_redemptions_user_id` ON `promo_redemptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_redemptions_party_id` ON `promo_redemptions` (`party_id`);--> statement-breakpoint
CREATE TABLE `promos` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promos_key_unique` ON `promos` (`key`);--> statement-breakpoint
CREATE INDEX `idx_promos_key` ON `promos` (`key`);--> statement-breakpoint
CREATE INDEX `idx_promos_created_by` ON `promos` (`created_by`);--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;