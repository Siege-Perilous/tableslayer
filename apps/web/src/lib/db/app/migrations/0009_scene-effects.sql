ALTER TABLE `scene` ADD `effects_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_bloom_intensity` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_bloom_threshold` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_bloom_smoothing` real DEFAULT 0.3 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_bloom_radius` real DEFAULT 0.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_bloom_level` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_bloom_mip_map_blur` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_chromatic_aberration_intensity` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_lut_url` text;--> statement-breakpoint
ALTER TABLE `scene` ADD `effects_tone_mapping_mode` integer DEFAULT 0 NOT NULL;