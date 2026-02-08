    SELECT 
    m.miniature,
    f.faction,
    m.unit,
    m.amount,
    "Plastic",
    b.base,
    "Games Workshop",
    "2016",
    "",
    s.storage,
    ms.status,
    g.game,
    ed.edition,
    ex.expansion
    FROM hdb_miniatures m
    INNER JOIN hdb_factions f ON m.faction_id = f.id
    INNER JOIN hdb_bases b ON m.base_id = b.id
    INNER JOIN hdb_storage s ON m.storage_id = s.id
    INNER JOIN hdb_miniature_status ms ON m.miniature_status_id = ms.id
    INNER JOIN hdb_games g ON m.game_id = g.id
    INNER JOIN hdb_editions ed ON m.edition_id = ed.id
    INNER JOIN hdb_expansions ex ON m.expansion_id = ex.id
    WHERE m.game_id = 30