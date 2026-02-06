-- Seed factions table with Warhammer 40K factions

INSERT INTO public.factions (name, army_type, description, color_hex) VALUES
-- Imperium
('Space Marines', 'imperium', 'The Emperor''s finest warriors, genetically enhanced super-soldiers', '#0066CC'),
('Adeptus Custodes', 'imperium', 'The Emperor''s personal guard, the greatest warriors in the Imperium', '#FFD700'),
('Adeptus Mechanicus', 'imperium', 'The tech-priests of Mars, keepers of ancient technology', '#8B0000'),
('Astra Militarum', 'imperium', 'The Imperial Guard, countless soldiers defending humanity', '#556B2F'),
('Imperial Knights', 'imperium', 'Noble houses piloting towering war machines', '#4169E1'),
('Grey Knights', 'imperium', 'Elite daemon-hunting Space Marines', '#C0C0C0'),
('Adepta Sororitas', 'imperium', 'The Sisters of Battle, faithful warriors of the Ecclesiarchy', '#8B0000'),

-- Space Marine Chapters
('Ultramarines', 'loyalist', 'The exemplar chapter, masters of the Codex Astartes', '#0066CC'),
('Blood Angels', 'loyalist', 'Noble warriors cursed with a thirst for blood', '#DC143C'),
('Dark Angels', 'loyalist', 'First Legion, keepers of terrible secrets', '#006400'),
('Space Wolves', 'loyalist', 'Fierce warriors from the ice world of Fenris', '#708090'),
('Imperial Fists', 'loyalist', 'Stoic defenders and master siege warriors', '#FFD700'),
('Salamanders', 'loyalist', 'Compassionate warriors who forge their own wargear', '#228B22'),
('Raven Guard', 'loyalist', 'Masters of stealth and lightning strikes', '#2F4F4F'),
('White Scars', 'loyalist', 'Swift raiders who strike like lightning', '#FFFFFF'),
('Iron Hands', 'loyalist', 'Cybernetic warriors who embrace the machine', '#696969'),
('Black Templars', 'loyalist', 'Zealous crusaders who never cease their eternal war', '#000000'),

-- Chaos
('Chaos Space Marines', 'chaos', 'Traitor Astartes who turned from the Emperor''s light', '#8B0000'),
('Death Guard', 'traitor', 'Plague Marines dedicated to Nurgle', '#2F4F2F'),
('Thousand Sons', 'traitor', 'Sorcerous warriors bound to Tzeentch', '#4169E1'),
('World Eaters', 'traitor', 'Berserkers devoted to Khorne', '#8B0000'),
('Emperor''s Children', 'traitor', 'Hedonistic warriors serving Slaanesh', '#FF00FF'),
('Chaos Daemons', 'chaos', 'Entities from the Warp given form', '#800080'),
('Chaos Knights', 'chaos', 'Corrupted war machines serving dark masters', '#4B0082'),

-- Xenos
('Orks', 'xenos', 'Green-skinned marauders who live for war', '#228B22'),
('Tyranids', 'xenos', 'Extragalactic bio-horrors that devour all life', '#800080'),
('Aeldari', 'xenos', 'Ancient alien race with powerful psychic abilities', '#00BFFF'),
('Craftworld Aeldari', 'xenos', 'Survivors on vast craftworlds', '#00BFFF'),
('Drukhari', 'xenos', 'Dark Eldar, sadistic raiders from Commorragh', '#4B0082'),
('Harlequins', 'xenos', 'Enigmatic warrior-performers serving the Laughing God', '#FF1493'),
('T''au Empire', 'xenos', 'Advanced aliens united for the Greater Good', '#4682B4'),
('Necrons', 'xenos', 'Ancient undying machines awakening from aeons of slumber', '#C0C0C0'),
('Genestealer Cults', 'xenos', 'Insidious hybrid cults preparing the way for Tyranids', '#9370DB'),
('Leagues of Votann', 'xenos', 'Resilient clone warriors mining the galaxy', '#DAA520')
ON CONFLICT (name) DO NOTHING;
