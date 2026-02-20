-- Insert the 3 paints missing due to spelling/casing mismatch with migration 000018
-- (Canonical CSV spellings; 000018 had "Death World Forest", "Gore-grunta Fur", etc.)
-- ON CONFLICT skips any that already exist

INSERT INTO public.paints (brand, name, type, color_hex) VALUES
('Citadel', 'Blood For The Blood God', 'technical', NULL),
('Citadel', 'Deathworld Forest', 'base', NULL),
('Citadel', 'Gore-Grunta Fur', 'contrast', NULL),
('Citadel', 'Gryph-Hound Orange', 'contrast', NULL)
ON CONFLICT (brand, name, type) DO NOTHING;
