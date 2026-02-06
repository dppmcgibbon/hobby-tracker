-- Verify seeded data
SELECT 'Factions Count:' as info, COUNT(*) as count FROM factions
UNION ALL
SELECT 'Paints Count:' as info, COUNT(*) as count FROM paints;

-- Show sample factions
SELECT name, army_type FROM factions ORDER BY army_type, name LIMIT 10;

-- Show sample paints by type
SELECT type, COUNT(*) as count FROM paints GROUP BY type ORDER BY type;
