PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_scene` (
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
	`weather_fov` integer DEFAULT 60 NOT NULL,
	`weather_intensity` real DEFAULT 1 NOT NULL,
	`weather_opacity` real DEFAULT 1 NOT NULL,
	`weather_type` integer DEFAULT 0 NOT NULL,
	`fog_enabled` integer DEFAULT false NOT NULL,
	`fog_color` text DEFAULT '#a0a0a0' NOT NULL,
	`fog_opacity` real DEFAULT 0.8 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_session`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "protected_fog_of_war_opacity" CHECK("__new_scene"."fog_of_war_opacity" >= 0 AND "__new_scene"."fog_of_war_opacity" <= 1),
	CONSTRAINT "protected_grid_opacity" CHECK("__new_scene"."grid_opacity" >= 0 AND "__new_scene"."grid_opacity" <= 1),
	CONSTRAINT "protected_weather_intensity" CHECK("__new_scene"."weather_intensity" >= 0 AND "__new_scene"."weather_intensity" <= 1),
	CONSTRAINT "protected_weather_opacity" CHECK("__new_scene"."weather_opacity" >= 0 AND "__new_scene"."weather_opacity" <= 1),
	CONSTRAINT "protected_fog_opacity" CHECK("__new_scene"."fog_opacity" >= 0 AND "__new_scene"."fog_opacity" <= 1)
);
--> statement-breakpoint
INSERT INTO `__new_scene`("id", "session_id", "name", "order", "background_color", "display_padding_x", "display_padding_y", "display_size_x", "display_size_y", "display_resolution_x", "display_resolution_y", "fog_of_war_url", "fog_of_war_color", "fog_of_war_opacity", "map_location", "map_rotation", "map_offset_x", "map_offset_y", "map_zoom", "grid_type", "grid_spacing", "grid_opacity", "grid_line_color", "grid_line_thickness", "grid_shadow_color", "grid_shadow_spread", "grid_shadow_blur", "grid_shadow_opacity", "scene_offset_x", "scene_offset_y", "scene_rotation", "weather_fov", "weather_intensity", "weather_opacity", "weather_type", "fog_enabled", "fog_color", "fog_opacity") SELECT "id", "session_id", "name", "order", "background_color", "display_padding_x", "display_padding_y", "display_size_x", "display_size_y", "display_resolution_x", "display_resolution_y", "fog_of_war_url", "fog_of_war_color", "fog_of_war_opacity", "map_location", "map_rotation", "map_offset_x", "map_offset_y", "map_zoom", "grid_type", "grid_spacing", "grid_opacity", "grid_line_color", "grid_line_thickness", "grid_shadow_color", "grid_shadow_spread", "grid_shadow_blur", "grid_shadow_opacity", "scene_offset_x", "scene_offset_y", "scene_rotation", "weather_fov", "weather_intensity", "weather_opacity", "weather_type", "fog_enabled", "fog_color", "fog_opacity" FROM `scene`;--> statement-breakpoint
DROP TABLE `scene`;--> statement-breakpoint
ALTER TABLE `__new_scene` RENAME TO `scene`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_session_scene_order` ON `scene` (`session_id`,`order`);