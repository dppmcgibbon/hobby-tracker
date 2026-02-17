    SELECT 
    m.miniature,
    m.unit,
    m.amount,
    "Plastic",
    b.base,
    "Avalon Hill",
    "2016"
    FROM hdb_miniatures m
    INNER JOIN hdb_bases b ON m.base_id = b.id
    WHERE m.game_id = 13