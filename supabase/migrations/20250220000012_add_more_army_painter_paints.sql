-- Additional Army Painter Warpaints (shades, metallics, Speed Paints)
-- Brings total Army Painter count from ~97 to ~170+
-- Sources: Army Painter Warpaints Mega Set, Quickshade, Speedpaint ranges

INSERT INTO public.paints (brand, name, type, color_hex) VALUES
-- Additional Warpaints Shades (Quickshade / dip range)
('Army Painter', 'Green Tone', 'shade', NULL),
('Army Painter', 'Blue Tone', 'shade', NULL),
('Army Painter', 'Purple Tone', 'shade', NULL),
('Army Painter', 'Red Tone', 'shade', NULL),
('Army Painter', 'Light Tone', 'shade', NULL),
('Army Painter', 'Flesh Wash', 'shade', NULL),
-- Warpaints Metallics
('Army Painter', 'Shining Silver', 'layer', NULL),
('Army Painter', 'Gun Metal', 'layer', NULL),
('Army Painter', 'Weapon Bronze', 'layer', NULL),
('Army Painter', 'Plate Mail Metal', 'layer', NULL),
('Army Painter', 'Greedy Gold', 'layer', NULL),
('Army Painter', 'Bright Gold', 'layer', NULL),
('Army Painter', 'Rough Iron', 'layer', NULL),
('Army Painter', 'True Copper', 'layer', NULL),
('Army Painter', 'Polished Gold', 'layer', NULL),
('Army Painter', 'Dark Silver', 'layer', NULL),
('Army Painter', 'Chainmail Silver', 'layer', NULL),
('Army Painter', 'Sparkling Blue', 'layer', NULL),
-- Speedpaint 1.0 range (contrast-style)
('Army Painter', 'Zealot Yellow', 'contrast', NULL),
('Army Painter', 'Fire Giant Orange', 'contrast', NULL),
('Army Painter', 'Blood Red', 'contrast', NULL),
('Army Painter', 'Slaughter Red', 'contrast', NULL),
('Army Painter', 'Purple Alchemy', 'contrast', NULL),
('Army Painter', 'Magenta Magic', 'contrast', NULL),
('Army Painter', 'Hardened Leather', 'contrast', NULL),
('Army Painter', 'Pallid Bone', 'contrast', NULL),
('Army Painter', 'Crusader Skin', 'contrast', NULL),
('Army Painter', 'Grim Black', 'contrast', NULL),
('Army Painter', 'Absolution Green', 'contrast', NULL),
('Army Painter', 'Orc Green', 'contrast', NULL),
('Army Painter', 'Highland Moss', 'contrast', NULL),
('Army Painter', 'Runic Grey', 'contrast', NULL),
('Army Painter', 'Cloudburst Blue', 'contrast', NULL),
('Army Painter', 'Magic Blue', 'contrast', NULL),
('Army Painter', 'Voidwalker Blue', 'contrast', NULL),
('Army Painter', 'Dark Wood', 'contrast', NULL),
-- Speedpaint 2.0 range
('Army Painter', 'Fanatic', 'contrast', NULL),
('Army Painter', 'Necrotic Flesh', 'contrast', NULL),
('Army Painter', 'Desert Yellow', 'contrast', NULL),
('Army Painter', 'Dragon''s Fury', 'contrast', NULL),
('Army Painter', 'Blood Moon', 'contrast', NULL),
('Army Painter', 'Vampiric Shadow', 'contrast', NULL),
('Army Painter', 'Spectral Hide', 'contrast', NULL),
('Army Painter', 'Mega Mouth', 'contrast', NULL),
('Army Painter', 'Royal Robes', 'contrast', NULL),
('Army Painter', 'Malignant Green', 'contrast', NULL),
('Army Painter', 'Runic Green', 'contrast', NULL),
('Army Painter', 'Forgotten Swamp', 'contrast', NULL),
('Army Painter', 'Templar Blue', 'contrast', NULL),
('Army Painter', 'Runic Grey', 'contrast', NULL),
('Army Painter', 'Crypt Wraith', 'contrast', NULL),
('Army Painter', 'Anima Grey', 'contrast', NULL),
('Army Painter', 'Plague Bed', 'contrast', NULL),
('Army Painter', 'Dark Wood', 'contrast', NULL)
ON CONFLICT (brand, name, type) DO NOTHING;

-- Link new Army Painter shades to Citadel equivalents
INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Biel-Tan Green' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Green Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Drakenhof Nightshade' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Blue Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Druchii Violet' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Purple Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Carroburg Crimson' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Red Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Seraphim Sepia' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Light Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Reikland Fleshshade' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Flesh Wash' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

-- Link Army Painter metallics to Citadel equivalents
INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Stormhost Silver' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Shining Silver' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Leadbelcher' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Gun Metal' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Balthasar Gold' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Weapon Bronze', 'True Copper') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Iron Hands Steel' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Plate Mail Metal', 'Chainmail Silver') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Retributor Armour' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Greedy Gold', 'Bright Gold', 'Polished Gold') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Iron Warriors' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Rough Iron', 'Dark Silver') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;
