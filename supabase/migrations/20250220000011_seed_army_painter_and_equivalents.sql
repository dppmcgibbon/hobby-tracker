-- Army Painter Warpaints + links to Citadel equivalents (from Red Grimm color matching chart)

INSERT INTO public.paints (brand, name, type, color_hex) VALUES
('Army Painter', 'Matt Black', 'base', NULL),
('Army Painter', 'Matt White', 'base', NULL),
('Army Painter', 'Pure Red', 'layer', NULL),
('Army Painter', 'Dragon Red', 'layer', NULL),
('Army Painter', 'Lava Orange', 'layer', NULL),
('Army Painter', 'Daemonic Yellow', 'layer', NULL),
('Army Painter', 'Necrotic Flesh', 'layer', NULL),
('Army Painter', 'Goblin Green', 'layer', NULL),
('Army Painter', 'Army Green', 'layer', NULL),
('Army Painter', 'Greenskin', 'layer', NULL),
('Army Painter', 'Angel Green', 'layer', NULL),
('Army Painter', 'Electric Blue', 'layer', NULL),
('Army Painter', 'Crystal Blue', 'layer', NULL),
('Army Painter', 'Ultramarine Blue', 'layer', NULL),
('Army Painter', 'Deep Blue', 'layer', NULL),
('Army Painter', 'Ash Grey', 'layer', NULL),
('Army Painter', 'Uniform Grey', 'layer', NULL),
('Army Painter', 'Wolf Grey', 'layer', NULL),
('Army Painter', 'Monster Brown', 'layer', NULL),
('Army Painter', 'Desert Yellow', 'layer', NULL),
('Army Painter', 'Fur Brown', 'layer', NULL),
('Army Painter', 'Leather Brown', 'layer', NULL),
('Army Painter', 'Oak Brown', 'layer', NULL),
('Army Painter', 'Skeleton Bone', 'layer', NULL),
('Army Painter', 'Barbarian Flesh', 'layer', NULL),
('Army Painter', 'Tanned Flesh', 'layer', NULL),
('Army Painter', 'Alien Purple', 'layer', NULL),
('Army Painter', 'Hydra Turquoise', 'layer', NULL),
('Army Painter', 'Chaotic Red', 'layer', NULL),
('Army Painter', 'Dark Tone', 'shade', NULL),
('Army Painter', 'Strong Tone', 'shade', NULL),
('Army Painter', 'Soft Tone', 'shade', NULL),
('Army Painter', 'Babe Blonde', 'layer', NULL),
('Army Painter', 'Drake Tooth', 'layer', NULL),
('Army Painter', 'Filthy Cape', 'layer', NULL),
('Army Painter', 'Combat Fatigue', 'layer', NULL),
('Army Painter', 'Corpse Pale', 'layer', NULL),
('Army Painter', 'Cultist Robe', 'layer', NULL),
('Army Painter', 'Dark Sky', 'layer', NULL),
('Army Painter', 'Dungeon Grey', 'layer', NULL),
('Army Painter', 'Elemental Bolt', 'layer', NULL),
('Army Painter', 'Fire Lizard', 'layer', NULL),
('Army Painter', 'Fog Grey', 'layer', NULL),
('Army Painter', 'Griffon Blue', 'layer', NULL),
('Army Painter', 'Hardened Carapace', 'layer', NULL),
('Army Painter', 'Ice Storm', 'layer', NULL),
('Army Painter', 'Jungle Green', 'layer', NULL),
('Army Painter', 'Mars Red', 'layer', NULL),
('Army Painter', 'Mouldy Clothes', 'layer', NULL),
('Army Painter', 'Mummy Robes', 'layer', NULL),
('Army Painter', 'Mythical Orange', 'layer', NULL),
('Army Painter', 'Necromance Cloak', 'layer', NULL),
('Army Painter', 'Oozing Purple', 'layer', NULL),
('Army Painter', 'Phoenix Flames', 'layer', NULL),
('Army Painter', 'Royal Cloak', 'layer', NULL),
('Army Painter', 'Scaly Hide', 'layer', NULL),
('Army Painter', 'Snake Scales', 'layer', NULL),
('Army Painter', 'Stone Golem', 'layer', NULL),
('Army Painter', 'Toxic Mist', 'layer', NULL),
('Army Painter', 'Troll Claws', 'layer', NULL),
('Army Painter', 'Vampire Red', 'layer', NULL),
('Army Painter', 'Venom Wyrm', 'layer', NULL),
('Army Painter', 'Viking Blue', 'layer', NULL),
('Army Painter', 'Voidshield Blue', 'layer', NULL),
('Army Painter', 'Werewolf Fur', 'layer', NULL),
('Army Painter', 'Witch Brew', 'layer', NULL),
('Army Painter', 'Warlock Purple', 'layer', NULL),
('Army Painter', 'Scar Tissue', 'layer', NULL),
('Army Painter', 'Field Grey', 'layer', NULL),
('Army Painter', 'Dark Stone', 'layer', NULL),
('Army Painter', 'Banshee Brown', 'layer', NULL),
('Army Painter', 'Basilisk Brown', 'layer', NULL),
('Army Painter', 'Brainmatter Beige', 'layer', NULL),
('Army Painter', 'Crypt Wraith', 'layer', NULL),
('Army Painter', 'Hemp Rope', 'layer', NULL),
('Army Painter', 'Kobold Skin', 'layer', NULL),
('Army Painter', 'Kraken Skin', 'layer', NULL),
('Army Painter', 'Sulphide Ochre', 'layer', NULL),
('Army Painter', 'Troglodyte Blue', 'layer', NULL),
('Army Painter', 'Spaceship Exterior', 'layer', NULL),
('Army Painter', 'Commando Green', 'layer', NULL),
('Army Painter', 'Elf Green', 'layer', NULL),
('Army Painter', 'Dirt Spatter', 'layer', NULL),
('Army Painter', 'Arid Earth', 'layer', NULL),
('Army Painter', 'Abomination Gore', 'layer', NULL),
('Army Painter', 'Centaur Skin', 'layer', NULL),
('Army Painter', 'Crusted Sore', 'layer', NULL),
('Army Painter', 'Gorgon Hide', 'layer', NULL),
('Army Painter', 'Grimoire Purple', 'layer', NULL),
('Army Painter', 'Moon Dust', 'layer', NULL),
('Army Painter', 'Mutant Hue', 'layer', NULL),
('Army Painter', 'Pixie Pink', 'layer', NULL),
('Army Painter', 'Poisonous Cloud', 'layer', NULL),
('Army Painter', 'Toxic Boils', 'layer', NULL),
('Army Painter', 'Wasteland Soil', 'layer', NULL),
('Army Painter', 'Wizards Orb', 'layer', NULL),
('Army Painter', 'Castle Grey', 'layer', NULL)
ON CONFLICT (brand, name, type) DO NOTHING;

-- Link Army Painter paints to Citadel equivalents
INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Abaddon Black' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Matt Black' AND ap.type = 'base'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Corax White' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Matt White' AND ap.type = 'base'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Wild Rider Red' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Pure Red' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Mephiston Red' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Dragon Red' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Troll Slayer Orange' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Lava Orange' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Yriel Yellow' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Daemonic Yellow' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Krieg Khaki' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Necrotic Flesh' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Warboss Green' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Goblin Green' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Deathworld Forest' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Army Green' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Waaagh! Flesh' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Greenskin' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Caliban Green' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Angel Green' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Hoeth Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Electric Blue', 'Crystal Blue') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Alaitoc Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Ultramarine Blue', 'Griffon Blue') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Stegadon Scale Green' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Deep Blue', 'Dark Sky') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Administratum Grey' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Ash Grey' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Warpfiend Grey' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Uniform Grey', 'Dungeon Grey') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Russ Grey' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Wolf Grey' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'XV-88' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Monster Brown', 'Leather Brown') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Karak Stone' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Desert Yellow', 'Kobold Skin') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Squig Orange' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Fur Brown', 'Mars Red', 'Warlock Purple') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Dryad Bark' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Oak Brown', 'Necromance Cloak') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Screaming Skull' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Skeleton Bone', 'Drake Tooth', 'Stone Golem', 'Poisonous Cloud') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Bestigor Flesh' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Barbarian Flesh', 'Troll Claws') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Deathclaw Brown' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Tanned Flesh' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Xereus Purple' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Alien Purple' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Ahriman Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Hydra Turquoise' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Mournfang Brown' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Chaotic Red', 'Abomination Gore') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Nuln Oil' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Dark Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Agrax Earthshade' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Strong Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Reikland Fleshshade' AND c.type = 'shade'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Soft Tone' AND ap.type = 'shade'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Yriel Yellow' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Babe Blonde' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Pallid Wych Flesh' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Corpse Pale', 'Mummy Robes') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Dawnstone' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Filthy Cape', 'Field Grey') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Ogryn Camo' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Combat Fatigue', 'Jungle Green', 'Snake Scales') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Stormvermin Fur' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Cultist Robe' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Temple Guard Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Elemental Bolt', 'Royal Cloak') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Troll Slayer Orange' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Fire Lizard' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Fenrisian Grey' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Fog Grey', 'Ice Storm') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Skavenblight Dinge' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Hardened Carapace' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Warpstone Glow' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Mouldy Clothes' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Jokaero Orange' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Mythical Orange' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Dechala Lilac' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Oozing Purple' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Zamesi Desert' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Phoenix Flames' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Nurgling Green' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Scaly Hide' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Baharroth Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Toxic Mist' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Tuskgor Fur' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Vampire Red' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Steel Legion Drab' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Venom Wyrm' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Caledor Sky' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Viking Blue' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Lothern Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Voidshield Blue' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Hoeth Blue' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Troglodyte Blue' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Ulthuan Grey' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Spaceship Exterior' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Gorthor Brown' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Werewolf Fur', 'Grimoire Purple', 'Wasteland Soil') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Elysian Green' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Witch Brew', 'Commando Green') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Castellan Green' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Elf Green' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Rhinox Hide' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Dirt Spatter' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Rakarth Flesh' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Banshee Brown' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Tau Light Ochre' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name IN ('Basilisk Brown', 'Sulphide Ochre') AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Baneblade Brown' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Hemp Rope' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Gauss Blaster Green' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Kraken Skin' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Celestra Grey' AND c.type = 'base'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Stone Golem' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Eshin Grey' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Dark Stone' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Stormvermin Fur' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Crypt Wraith' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;

INSERT INTO public.paint_equivalents (paint_id, equivalent_paint_id)
SELECT ap.id, c.id FROM paints ap
JOIN paints c ON c.brand = 'Citadel' AND c.name = 'Cadian Fleshtone' AND c.type = 'layer'
WHERE ap.brand = 'Army Painter' AND ap.name = 'Scar Tissue' AND ap.type = 'layer'
ON CONFLICT (paint_id, equivalent_paint_id) DO NOTHING;
