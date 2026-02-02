-- Seed Common Tabletop Wargame Factions
-- This file seeds some example factions from Warhammer 40K
-- Feel free to modify or add your own factions for other game systems
INSERT INTO public.factions (name, army_type, description, color_hex) VALUES
  -- Space Marines (Loyalist)
  ('Ultramarines', 'loyalist', 'The greatest of all Space Marine Chapters', '#0055AA'),
  ('Blood Angels', 'loyalist', 'Sons of Sanguinius, noble but cursed', '#AA0000'),
  ('Dark Angels', 'loyalist', 'The First Legion, keepers of dark secrets', '#004400'),
  ('Space Wolves', 'loyalist', 'Savage warriors from Fenris', '#6B8E99'),
  ('Imperial Fists', 'loyalist', 'Masters of siege warfare', '#FFCC00'),
  ('Salamanders', 'loyalist', 'Humanitarian warriors from Nocturne', '#116B00'),
  ('Raven Guard', 'loyalist', 'Masters of stealth and shadow', '#1A1A1A'),
  ('Iron Hands', 'loyalist', 'Servants of the machine', '#2C2C2C'),
  ('White Scars', 'loyalist', 'Lightning-fast warriors of Chogoris', '#FFFFFF'),
  
  -- Traitor Legions
  ('Black Legion', 'traitor', 'The chosen of Abaddon the Despoiler', '#000000'),
  ('Word Bearers', 'chaos', 'First to fall to Chaos worship', '#8B0000'),
  ('World Eaters', 'chaos', 'Bloodthirsty berserkers of Khorne', '#CC0000'),
  ('Death Guard', 'chaos', 'Plague-ridden servants of Nurgle', '#6B8E23'),
  ('Thousand Sons', 'chaos', 'Sorcerers bound to Tzeentch', '#4169E1'),
  ('Emperor''s Children', 'chaos', 'Hedonistic followers of Slaanesh', '#9932CC'),
  ('Night Lords', 'chaos', 'Masters of terror and fear', '#191970'),
  ('Iron Warriors', 'chaos', 'Cold siege masters', '#708090'),
  ('Alpha Legion', 'chaos', 'Masters of subterfuge', '#008080'),
  
  -- Xenos
  ('Aeldari', 'xenos', 'Ancient and dwindling craftworld eldar', '#FFA500'),
  ('Drukhari', 'xenos', 'Dark eldar raiders from Commorragh', '#4B0082'),
  ('Orks', 'xenos', 'Green-skinned fungal warriors', '#228B22'),
  ('Necrons', 'xenos', 'Ancient robotic dynasty awakened', '#00CED1'),
  ('Tyranids', 'xenos', 'All-consuming hive fleets', '#800080'),
  ('T''au Empire', 'xenos', 'Technologically advanced Greater Good', '#87CEEB'),
  ('Genestealer Cults', 'xenos', 'Hybrid insurgents', '#8B4789'),
  
  -- Imperium
  ('Astra Militarum', 'imperium', 'The Imperial Guard', '#8B7355'),
  ('Adeptus Mechanicus', 'imperium', 'Tech-priests of Mars', '#DC143C'),
  ('Adepta Sororitas', 'imperium', 'The Sisters of Battle', '#B22222'),
  ('Grey Knights', 'imperium', 'Daemon-hunting Space Marines', '#C0C0C0'),
  ('Adeptus Custodes', 'imperium', 'The Emperor''s personal guard', '#FFD700')
ON CONFLICT (name) DO NOTHING;