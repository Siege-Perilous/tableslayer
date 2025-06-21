-- Custom SQL migration file, put your code below! --

-- Add version parameter to fog of war URLs (handle both no params and existing params)
UPDATE scene
SET fog_of_war_url = CASE
  WHEN fog_of_war_url LIKE '%?%' THEN substr(fog_of_war_url, 1, instr(fog_of_war_url, '?') - 1) || '?v=0'
  ELSE fog_of_war_url || '?v=0'
END
WHERE fog_of_war_url IS NOT NULL
  AND fog_of_war_url != ''
  AND fog_of_war_url NOT LIKE '%?v=%';--> statement-breakpoint
-- Add version parameter to map locations (handle both no params and existing params)
UPDATE scene
SET map_location = CASE
  WHEN map_location LIKE '%?%' THEN substr(map_location, 1, instr(map_location, '?') - 1) || '?v=0'
  ELSE map_location || '?v=0'
END
WHERE map_location IS NOT NULL
  AND map_location != ''
  AND map_location NOT LIKE '%?v=%'
  AND map_location != 'map/example1080.png';--> statement-breakpoint
-- Add version parameter to thumbnail locations (handle both no params and existing params)
UPDATE scene
SET map_thumb_location = CASE
  WHEN map_thumb_location LIKE '%?%' THEN substr(map_thumb_location, 1, instr(map_thumb_location, '?') - 1) || '?v=0'
  ELSE map_thumb_location || '?v=0'
END
WHERE map_thumb_location IS NOT NULL
  AND map_thumb_location != ''
  AND map_thumb_location NOT LIKE '%?v=%';--> statement-breakpoint
-- Add version parameter to edge overlay URLs (handle both no params and existing params)
UPDATE scene
SET edge_url = CASE
  WHEN edge_url LIKE '%?%' THEN substr(edge_url, 1, instr(edge_url, '?') - 1) || '?v=0'
  ELSE edge_url || '?v=0'
END
WHERE edge_url IS NOT NULL
  AND edge_url != ''
  AND edge_url NOT LIKE '%?v=%';--> statement-breakpoint
-- Add version parameter to LUT effect URLs (handle both no params and existing params)
UPDATE scene
SET effects_lut_url = CASE
  WHEN effects_lut_url LIKE '%?%' THEN substr(effects_lut_url, 1, instr(effects_lut_url, '?') - 1) || '?v=0'
  ELSE effects_lut_url || '?v=0'
END
WHERE effects_lut_url IS NOT NULL
  AND effects_lut_url != ''
  AND effects_lut_url NOT LIKE '%?v=%';--> statement-breakpoint
-- Add version parameter to marker image locations (handle both no params and existing params)
UPDATE marker
SET image_location = CASE
  WHEN image_location LIKE '%?%' THEN substr(image_location, 1, instr(image_location, '?') - 1) || '?v=0'
  ELSE image_location || '?v=0'
END
WHERE image_location IS NOT NULL
  AND image_location != ''
  AND image_location NOT LIKE '%?v=%';--> statement-breakpoint
-- Add version parameter to files table locations (handle both no params and existing params)
UPDATE files
SET location = CASE
  WHEN location LIKE '%?%' THEN substr(location, 1, instr(location, '?') - 1) || '?v=0'
  ELSE location || '?v=0'
END
WHERE location IS NOT NULL
  AND location != ''
  AND location NOT LIKE '%?v=%';--> statement-breakpoint
-- Clean up any URLs that were accidentally set to just "?v=0"
UPDATE scene SET fog_of_war_url = NULL WHERE fog_of_war_url = '?v=0';--> statement-breakpoint
UPDATE scene SET map_location = NULL WHERE map_location = '?v=0';--> statement-breakpoint
UPDATE scene SET map_thumb_location = NULL WHERE map_thumb_location = '?v=0';--> statement-breakpoint
UPDATE scene SET edge_url = NULL WHERE edge_url = '?v=0';--> statement-breakpoint
UPDATE scene SET effects_lut_url = NULL WHERE effects_lut_url = '?v=0';--> statement-breakpoint
UPDATE marker SET image_location = NULL WHERE image_location = '?v=0';--> statement-breakpoint
UPDATE files SET location = NULL WHERE location = '?v=0';
