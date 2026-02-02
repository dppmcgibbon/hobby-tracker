# Games System - Complete Implementation

## Overview
The Games system allows you to organize miniatures by game systems, editions, and expansions. This provides better organization and filtering capabilities for your miniature collection.

## Database Structure

### Tables

#### `games`
Main game systems (e.g., Warhammer 40,000, Kill Team)
- `id` - UUID primary key
- `name` - Game name (required)
- `description` - Optional description
- `publisher` - Publisher name
- `created_at`, `updated_at` - Timestamps

#### `editions`
Game editions (e.g., 10th Edition, 2021)
- `id` - UUID primary key
- `game_id` - Foreign key to games
- `name` - Edition name (required)
- `sequence` - Integer for ordering (required)
- `year` - Publication year (optional)
- `description` - Optional description
- `created_at`, `updated_at` - Timestamps

#### `expansions`
Edition expansions (e.g., Starter Set, Hivestorm)
- `id` - UUID primary key
- `edition_id` - Foreign key to editions
- `name` - Expansion name (required)
- `sequence` - Integer for ordering (required)
- `year` - Publication year (optional)
- `description` - Optional description
- `created_at`, `updated_at` - Timestamps

#### `miniature_games` (Junction Table)
Links miniatures to games with optional edition and expansion
- `miniature_id` - Foreign key to miniatures
- `game_id` - Foreign key to games
- `edition_id` - Foreign key to editions (nullable)
- `expansion_id` - Foreign key to expansions (nullable)
- Primary key: (miniature_id, game_id)

### Relationships
- Games → Editions (one-to-many, cascade delete)
- Editions → Expansions (one-to-many, cascade delete)
- Miniatures ↔ Games (many-to-many through miniature_games)

## Initial Data Loaded

### Games
1. **Warhammer 40,000**
   - 10 editions (Rogue Trader through 10th Edition)

2. **Combat Patrol**
   - 10th edition

3. **Kill Team**
   - 5 editions (2013, 2016, 2018, 2021, 2024)
   - 22 expansions across 2021 and 2024 editions

## Backend Implementation

### Files Created

#### Validation (`src/lib/validations/game.ts`)
- `gameSchema` - Validates game input
- `editionSchema` - Validates edition input
- `expansionSchema` - Validates expansion input
- `miniatureGameSchema` - Validates game-miniature links

#### Server Actions (`src/app/actions/games.ts`)

**Games:**
- `createGame(data)` - Create new game
- `updateGame(id, data)` - Update game details
- `deleteGame(id)` - Delete game (cascades to editions/expansions)

**Editions:**
- `createEdition(data)` - Create new edition
- `updateEdition(id, data)` - Update edition details
- `deleteEdition(id)` - Delete edition (cascades to expansions)

**Expansions:**
- `createExpansion(data)` - Create new expansion
- `updateExpansion(id, data)` - Update expansion details
- `deleteExpansion(id)` - Delete expansion

**Miniature Links:**
- `linkMiniatureToGame(data)` - Link miniature to game/edition/expansion
- `unlinkMiniatureFromGame(miniatureId, gameId)` - Remove link
- `updateMiniatureGame(miniatureId, gameId, data)` - Update link details

### Types
Added to `src/types/index.ts`:
- `Game` - Game table type
- `Edition` - Edition table type
- `Expansion` - Expansion table type
- `MiniatureGame` - Junction table type

## Frontend Implementation

### Pages

#### Games List (`/dashboard/games`)
**File:** `src/app/dashboard/games/page.tsx`

Features:
- Grid view of all games
- Search by game name
- Display edition count per game
- Create new game button
- Quick edit/delete for each game

#### Game Detail (`/dashboard/games/[id]`)
**File:** `src/app/dashboard/games/[id]/page.tsx`

Features:
- Game information display
- Edit game details
- List of editions (collapsible)
- Each edition shows its expansions
- Add/edit/delete editions
- Add/edit/delete expansions within editions
- Proper sequencing and year display

### Components

#### Game Components (`src/components/games/`)

1. **`game-form-dialog.tsx`**
   - Create/edit game form
   - Fields: name, publisher, description
   - Validation and error handling

2. **`game-card.tsx`**
   - Display game in grid/list
   - Shows name, publisher, description
   - Edition count badge
   - Quick edit/delete actions

3. **`edition-form-dialog.tsx`**
   - Create/edit edition form
   - Fields: name, sequence, year, description
   - Linked to specific game

4. **`expansion-form-dialog.tsx`**
   - Create/edit expansion form
   - Fields: name, sequence, year, description
   - Linked to specific edition

5. **`game-selector.tsx`**
   - Cascading dropdown selector
   - Select game → edition → expansion
   - Used for linking miniatures
   - Auto-loads editions when game selected
   - Auto-loads expansions when edition selected

6. **`game-link-manager.tsx`**
   - Manage game links on miniature detail page
   - Display current links with badges
   - Add new links via dialog
   - Remove links with confirmation

### Navigation
Updated `src/app/dashboard/layout.tsx`:
- Added "Games" link with Gamepad2 icon
- Positioned between Tags and Recipes

### Miniature Integration
Updated `src/app/dashboard/collection/[id]/page.tsx`:
- Added GameLinkManager component
- Fetches linked games with editions/expansions
- Displays in left column below main details

## User Workflows

### Managing Games

1. **Create a Game**
   - Navigate to Games page
   - Click "Add Game" button
   - Fill in name (required), publisher, description
   - Save

2. **View Game Details**
   - Click on any game card
   - See all editions and expansions
   - Editions are collapsible

3. **Add Edition**
   - On game detail page
   - Click "Add Edition"
   - Enter name, sequence, year (optional), description
   - Save

4. **Add Expansion**
   - Expand an edition
   - Click "Add Expansion"
   - Enter name, sequence, year (optional), description
   - Save

5. **Edit/Delete**
   - Use edit icon to modify details
   - Use trash icon to delete (with confirmation)
   - Deletions cascade appropriately

### Linking Miniatures to Games

1. **On Miniature Detail Page**
   - Scroll to "Linked Games" card
   - Click "Link Game" button
   - Select game from dropdown
   - Optionally select edition
   - Optionally select expansion
   - Click "Link Game"

2. **View Linked Games**
   - See all linked games with badges
   - Edition and expansion shown if linked
   - Click X to unlink

3. **Multiple Links**
   - A miniature can be linked to multiple games
   - Each link shows game → edition → expansion hierarchy

## Features

### Hierarchical Organization
- Games contain editions
- Editions contain expansions
- Clear parent-child relationships

### Smart Cascading
- Deleting a game removes all its editions and expansions
- Deleting an edition removes all its expansions
- Links are removed when parent is deleted

### Sequence Ordering
- Editions ordered by sequence number
- Expansions ordered by sequence number
- Allows for logical ordering (1st, 2nd, 3rd edition, etc.)

### Optional Year Tracking
- Track publication years for editions and expansions
- Useful for dating your collection

### Search and Filter
- Search games by name
- Future: Filter miniatures by game/edition/expansion

## Setup Instructions

### 1. Run Migration

```bash
# Push migration to database
npm run supabase:push
```

This will:
- Create all tables
- Set up relationships and indexes
- Load initial game/edition/expansion data

### 2. Regenerate Types

```bash
# Generate TypeScript types from database
npx supabase gen types typescript --local > src/types/database.types.ts
```

### 3. Restart Dev Server

```bash
# Restart to pick up all changes
npm run dev
```

### 4. Verify Installation

1. Navigate to `/dashboard/games`
2. You should see 3 games (Warhammer 40,000, Combat Patrol, Kill Team)
3. Click on Kill Team to see editions and expansions
4. Try adding a new game
5. Go to a miniature detail page
6. Try linking it to a game

## Troubleshooting

### Type Errors
If you see type errors about missing tables:
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Missing Data
If games don't appear after migration:
```bash
# Check migration status
npm run supabase:db reset
npm run supabase:push
```

### UI Not Updating
After linking/unlinking games:
- The page should auto-refresh
- If not, manually refresh the page

## File Structure

```
src/
├── app/
│   ├── actions/
│   │   └── games.ts                    # Server actions
│   └── dashboard/
│       └── games/
│           ├── page.tsx                # Games list
│           └── [id]/
│               └── page.tsx            # Game detail
├── components/
│   └── games/
│       ├── game-form-dialog.tsx        # Game CRUD dialog
│       ├── game-card.tsx               # Game display card
│       ├── edition-form-dialog.tsx     # Edition CRUD dialog
│       ├── expansion-form-dialog.tsx   # Expansion CRUD dialog
│       ├── game-selector.tsx           # Cascading selector
│       └── game-link-manager.tsx       # Miniature linking
├── lib/
│   └── validations/
│       └── game.ts                     # Zod schemas
└── types/
    └── index.ts                        # Type exports

supabase/
└── migrations/
    └── 20240101000012_create_games.sql # Database migration
```

## Database Queries Examples

### Get all games with edition counts
```sql
SELECT g.*, COUNT(e.id) as edition_count
FROM games g
LEFT JOIN editions e ON e.game_id = g.id
GROUP BY g.id
ORDER BY g.name;
```

### Get miniatures for a specific game
```sql
SELECT m.*
FROM miniatures m
JOIN miniature_games mg ON mg.miniature_id = m.id
WHERE mg.game_id = 'game-uuid';
```

### Get miniatures for a specific edition
```sql
SELECT m.*
FROM miniatures m
JOIN miniature_games mg ON mg.miniature_id = m.id
WHERE mg.edition_id = 'edition-uuid';
```

### Get complete game hierarchy
```sql
SELECT 
  g.name as game,
  e.name as edition,
  exp.name as expansion,
  COUNT(mg.miniature_id) as miniature_count
FROM games g
LEFT JOIN editions e ON e.game_id = g.id
LEFT JOIN expansions exp ON exp.edition_id = e.id
LEFT JOIN miniature_games mg ON mg.game_id = g.id 
  AND (mg.edition_id = e.id OR mg.edition_id IS NULL)
  AND (mg.expansion_id = exp.id OR mg.expansion_id IS NULL)
GROUP BY g.id, g.name, e.id, e.name, exp.id, exp.name
ORDER BY g.name, e.sequence, exp.sequence;
```

## Future Enhancements

### Phase 1 (Current) ✅
- Basic CRUD for games, editions, expansions
- Link miniatures to games
- Display links on miniature page

### Phase 2 (Future)
- Filter miniatures by game/edition/expansion on collection page
- Statistics by game (completion rates, status breakdown)
- Game system selector in miniature form (during creation/edit)

### Phase 3 (Future)
- Bulk operations (link multiple miniatures to game)
- Import/export game data
- Game-specific tags or attributes
- Timeline view by edition years

### Phase 4 (Future)
- Public game database/sharing
- Community editions and expansions
- Automatic suggestions based on miniature names

## Statistics Ideas

With the Games system, you can now track:
- Total miniatures per game
- Completion rate by game/edition
- Most collected game system
- Newest vs oldest editions in collection
- Expansion coverage per edition

## API Reference

See `src/app/actions/games.ts` for full server action signatures.

All actions:
- Validate input with Zod schemas
- Require authentication
- Return `{ success: boolean, error?: string }`
- Revalidate relevant paths
- Handle errors gracefully

## Contributing

To add new games to the initial data:
1. Edit `supabase/migrations/20240101000012_create_games.sql`
2. Add to the INSERT VALUES section
3. Re-run migration

## License

Part of the Hobby Tracker application.
