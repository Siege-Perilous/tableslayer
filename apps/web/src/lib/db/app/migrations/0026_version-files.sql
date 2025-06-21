-- Custom SQL migration file, put your code below! --

-- Add version parameter to fog of war URLs
UPDATE scene 
SET fog_of_war_url = fog_of_war_url || '?v=0'
WHERE fog_of_war_url IS NOT NULL
  AND fog_of_war_url NOT LIKE '%?%';

-- Add version parameter to map locations
UPDATE scene
SET map_location = map_location || '?v=0'
WHERE map_location IS NOT NULL
  AND map_location NOT LIKE '%?%'
  AND map_location != 'map/example1080.png';

-- Add version parameter to thumbnail locations
UPDATE scene
SET map_thumb_location = map_thumb_location || '?v=0'  
WHERE map_thumb_location IS NOT NULL
  AND map_thumb_location NOT LIKE '%?%';

-- Add version parameter to edge overlay URLs
UPDATE scene
SET edge_url = edge_url || '?v=0'
WHERE edge_url IS NOT NULL
  AND edge_url NOT LIKE '%?%';

-- Add version parameter to LUT effect URLs
UPDATE scene
SET effects_lut_url = effects_lut_url || '?v=0'
WHERE effects_lut_url IS NOT NULL
  AND effects_lut_url NOT LIKE '%?%';

-- Add version parameter to marker image locations
UPDATE marker
SET image_location = image_location || '?v=0'
WHERE image_location IS NOT NULL
  AND image_location NOT LIKE '%?%';

-- Add version parameter to files table locations (avatars, pause screens, etc.)
UPDATE files
SET location = location || '?v=0'
WHERE location IS NOT NULL
  AND location NOT LIKE '%?%';