-- Insert the 13 paint type-variants that were deduplicated under UNIQUE(brand, name)
-- (Same colour name in multiple types: Base+Spray, Layer+Dry, etc.)
-- Run after 20250220000000 constraint change. ON CONFLICT skips any already present.

INSERT INTO public.paints (brand, name, type, color_hex) VALUES
('Citadel', 'Dawnstone', 'dry', NULL),
('Citadel', 'Death Guard Green', 'spray', NULL),
('Citadel', 'Grey Seer', 'spray', NULL),
('Citadel', 'Hoeth Blue', 'dry', NULL),
('Citadel', 'Leadbelcher', 'spray', NULL),
('Citadel', 'Macragge Blue', 'spray', NULL),
('Citadel', 'Mechanicus Standard Grey', 'spray', NULL),
('Citadel', 'Mephiston Red', 'spray', NULL),
('Citadel', 'Nurgling Green', 'dry', NULL),
('Citadel', 'Retributor Armour', 'spray', NULL),
('Citadel', 'White Scar', 'spray', NULL),
('Citadel', 'Wraithbone', 'spray', NULL),
('Citadel', 'Zandri Dust', 'spray', NULL)
ON CONFLICT (brand, name, type) DO NOTHING;
