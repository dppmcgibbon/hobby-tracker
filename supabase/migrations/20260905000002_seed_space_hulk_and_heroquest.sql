-- Seed Universes (if not already present)
INSERT INTO public.universes (id, name) VALUES 
  ('d2aa2425-da7f-4642-b0e9-dda3ed772f55', 'Heroquest'),
  ('46006364-bd4d-40d4-99fe-621195696c54', 'Warhammer 40,000')
ON CONFLICT (id) DO NOTHING;

-- Seed Games (Space Hulk and Heroquest)
INSERT INTO public.games (id, name, universe_id) VALUES 
  ('ef34b7d4-6fa0-4fae-ba31-edced12c87ad', 'Space Hulk', '46006364-bd4d-40d4-99fe-621195696c54'),
  ('6376d4ef-ebaf-4f28-b6d6-1999ed888ecf', 'Heroquest', 'd2aa2425-da7f-4642-b0e9-dda3ed772f55')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, universe_id = EXCLUDED.universe_id;

-- Seed Editions
INSERT INTO public.editions (id, game_id, name, sequence, year) VALUES 
  ('b1e96e93-2ec6-472c-9eb1-dd6f79c9f8e6', '6376d4ef-ebaf-4f28-b6d6-1999ed888ecf', '1989', 1, 1989),
  ('c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'ef34b7d4-6fa0-4fae-ba31-edced12c87ad', '1st Edition', 1, 1989),
  ('163ed94f-e868-4f12-b728-aea2b0870b49', '6376d4ef-ebaf-4f28-b6d6-1999ed888ecf', 'Advanced Heroquest', 2, 1989),
  ('228c10cd-6208-4d4c-b956-4f2ae80682bd', 'ef34b7d4-6fa0-4fae-ba31-edced12c87ad', '2nd Edtion', 2, 1996),
  ('c181129e-0030-4a69-99e1-047ee915a73b', '6376d4ef-ebaf-4f28-b6d6-1999ed888ecf', 'Advanced Quest', 2, 1990),
  ('38c90c03-f5a4-4e5c-9b93-863b01a58a66', '6376d4ef-ebaf-4f28-b6d6-1999ed888ecf', '2021', 3, 2021),
  ('478b19cc-fd6b-4640-ad38-b1e754ee0c42', 'ef34b7d4-6fa0-4fae-ba31-edced12c87ad', '3rd Edition', 3, 2009),
  ('570243b5-7e89-4e9c-bb60-42c4dbaa1d31', 'ef34b7d4-6fa0-4fae-ba31-edced12c87ad', '4th Edition', 4, 2014)
ON CONFLICT (id) DO NOTHING;

-- Seed Expansions
INSERT INTO public.expansions (id, edition_id, name, sequence, year) VALUES 
  ('6d2d9b21-0e28-406e-8ce7-b823b5ce6f36', 'b1e96e93-2ec6-472c-9eb1-dd6f79c9f8e6', 'Core Game', 1, 1989),
  ('f071ed2b-3d76-4d42-9422-69f05800ae53', 'c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'Core Game', 1, 1989),
  ('1e52d384-e33e-4916-a13f-9e93f2d5930f', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Core Game', 1, 2021),
  ('a41c96e5-d58c-4a2d-b036-3fd09bf2e025', 'c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'Deathwing', 2, 1990),
  ('8dc760ed-d2dd-45ca-bec2-49ab798741e4', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Commander of the Guardian Knights', 2, NULL),
  ('08002dbf-213d-4187-b0de-14ab5e831b4f', 'b1e96e93-2ec6-472c-9eb1-dd6f79c9f8e6', 'Keller''s Keep', 2, 1989),
  ('04e42922-d080-4fe4-938f-0624c8a42ccc', 'c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'Genestealer', 3, 1990),
  ('d326c130-4b10-4108-9d51-3d49b958fa3b', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Kellers Keep', 3, NULL),
  ('719a9de9-14bc-4cd2-a848-486ef39dc78d', 'b1e96e93-2ec6-472c-9eb1-dd6f79c9f8e6', 'Return of the Witch Lord', 3, 1989),
  ('b618146b-f82d-4919-b76a-3ae4084ee03f', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Return of the Witch Lord', 4, NULL),
  ('5f1ded90-9fc6-4fcf-982f-5e1e6636efa5', 'b1e96e93-2ec6-472c-9eb1-dd6f79c9f8e6', 'Against the Ogre Horde', 4, 1990),
  ('827bed2e-b261-4d13-a154-8d4bdea1dc04', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'The Frozen Horror', 5, NULL),
  ('e95b285b-bc8e-4d84-a464-4c832604cf62', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'The Rogue Heir of Elethorn', 6, NULL),
  ('c1cc52e3-7260-4687-9b4a-2ce1aeff4c81', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'The Mage of the Mirror', 7, NULL),
  ('05d4a6c8-c166-4648-b925-3e4087d64279', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Rise of the Dread Moon', 8, NULL),
  ('520977aa-0b48-4893-a002-7339893168f5', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'The Path of the Wandering Monk', 9, NULL),
  ('16dcc87f-34e8-419c-8c17-119f358a1cbc', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Prophecy of Telor', 10, NULL),
  ('e7294e48-900d-46d9-8a27-607e3b199e15', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'The Spirit Queens Torment', 11, NULL),
  ('6ff3cef6-ab84-47e4-a139-eff315db4ca7', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Against the Ogre Horde', 12, NULL),
  ('46a17321-81c3-47de-824b-6cbd269fc771', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Jungles of Dethrak', 13, NULL),
  ('7e9194f7-b752-4d94-a09d-755d51de0678', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'First Light', 14, NULL),
  ('13029f3b-6a7c-48a8-8857-3813ef964414', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'The Crypt of Perpetual Darkness', 15, NULL),
  ('922baefa-c07f-4d81-ac55-c1c2b1ffc317', '38c90c03-f5a4-4e5c-9b93-863b01a58a66', 'Wizards of Morcar', 16, 2026),
  ('f071ed2b-3d76-4d42-9422-69f05800ae53', 'c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'Core Game', 1, 1989),
  ('a41c96e5-d58c-4a2d-b036-3fd09bf2e025', 'c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'Deathwing', 2, 1990),
  ('04e42922-d080-4fe4-938f-0624c8a42ccc', 'c11eee1b-7a69-4b92-b34e-45a7f0ae50f8', 'Genestealer', 3, 1990)
ON CONFLICT (id) DO NOTHING;

-- Seed Saved Filters for Space Hulk and HeroQuest
INSERT INTO public.saved_filters (id, name, is_starred, logo_url, filters) VALUES 
  ('4d7b3bbd-f473-478a-a21d-9ac6fb65a1bf', 'Space Hulk 1st Edition', true, 'https://www.orderofgamers.com/wordpress/wp-content/uploads/2013/04/spacehulk.jpg', '{"based": "all", "tagId": "all", "gameId": "ef34b7d4-6fa0-4fae-ba31-edced12c87ad", "search": "", "status": "all", "baseSize": "all", "unitType": "all", "editionId": "c11eee1b-7a69-4b92-b34e-45a7f0ae50f8", "factionId": "all", "hasPhotos": "all", "magnetised": "all", "universeId": "46006364-bd4d-40d4-99fe-621195696c54", "expansionId": "f071ed2b-3d76-4d42-9422-69f05800ae53", "storageBoxId": "all"}'::jsonb),
  ('106d7725-c92a-42ad-8eed-c8b58f291619', 'HeroQuest 1989', true, '/logos/heroquest.png', '{"based": "all", "tagId": "all", "gameId": "6376d4ef-ebaf-4f28-b6d6-1999ed888ecf", "search": "", "status": "all", "baseSize": "all", "unitType": "all", "editionId": "b1e96e93-2ec6-472c-9eb1-dd6f79c9f8e6", "factionId": "all", "hasPhotos": "all", "magnetised": "all", "universeId": "d2aa2425-da7f-4642-b0e9-dda3ed772f55", "expansionId": "6d2d9b21-0e28-406e-8ce7-b823b5ce6f36", "storageBoxId": "all"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET is_starred = EXCLUDED.is_starred, logo_url = EXCLUDED.logo_url, filters = EXCLUDED.filters;
