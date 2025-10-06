ALTER TABLE `party` ALTER COLUMN "default_display_size_x" TO "default_display_size_x" real NOT NULL DEFAULT 34.86;--> statement-breakpoint
ALTER TABLE `party` ALTER COLUMN "default_display_size_y" TO "default_display_size_y" real NOT NULL DEFAULT 19.6;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "display_size_x" TO "display_size_x" real NOT NULL DEFAULT 34.86;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "display_size_y" TO "display_size_y" real NOT NULL DEFAULT 19.6;--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "fog_of_war_color" TO "fog_of_war_color" text NOT NULL DEFAULT '#CCC';--> statement-breakpoint
ALTER TABLE `scene` ALTER COLUMN "fog_of_war_opacity_dm" TO "fog_of_war_opacity_dm" real NOT NULL DEFAULT 0.5;