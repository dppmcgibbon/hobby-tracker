# Games System Implementation Plan

## Overview
Adding a comprehensive Games system with editions and expansions, allowing miniatures to be linked to specific games, editions, and expansions.

## Database Schema

### Tables Created (Migration: 20240101000012_create_games.sql)

1. **games**
   - id (UUID, PK)
   - name (TEXT, NOT NULL)
   - description (TEXT)
   - publisher (TEXT)
   - timestamps

2. **editions**
   - id (UUID, PK)
   - game_id (UUID, FK → games)
   - name (TEXT, NOT NULL)
   - sequence (INTEGER, NOT NULL) - for ordering
   - year (INTEGER)
   - description (TEXT)
   - timestamps

3. **expansions**
   - id (UUID, PK)
   - edition_id (UUID, FK → editions)
   - name (TEXT, NOT NULL)
   - sequence (INTEGER, NOT NULL) - for ordering
   - year (INTEGER)
   - description (TEXT)
   - timestamps

4. **miniature_games** (Junction Table)
   - miniature_id (UUID, FK → miniatures)
   - game_id (UUID, FK → games)
   - edition_id (UUID, FK → editions, nullable)
   - expansion_id (UUID, FK → expansions, nullable)
   - PK: (miniature_id, game_id)

### Initial Data Loaded
- Warhammer 40,000 (10 editions)
- Combat Patrol (1 edition)
- Kill Team (5 editions, 22 expansions for 2021 & 2024 editions)

## Backend Implementation

### Validations (`src/lib/validations/game.ts`)
- ✅ gameSchema
- ✅ editionSchema
- ✅ expansionSchema
- ✅ miniatureGameSchema

### Server Actions (`src/app/actions/games.ts`)
- ✅ createGame, updateGame, deleteGame
- ✅ createEdition, updateEdition, deleteEdition
- ✅ createExpansion, updateExpansion, deleteExpansion
- ✅ linkMiniatureToGame, unlinkMiniatureFromGame, updateMiniatureGame

### Types
- ✅ Added to `src/types/index.ts`

## Frontend Implementation

### Navigation
- ✅ Added "Games" link to top navigation with Gamepad2 icon

### Pages to Create

1. **Games List** (`/dashboard/games/page.tsx`)
   - Grid/list of all games
   - Show edition count
   - Create new game button
   - Search/filter

2. **Game Detail** (`/dashboard/games/[id]/page.tsx`)
   - Game information
   - List of editions (with expand/collapse)
   - Each edition shows its expansions
   - Add edition/expansion buttons
   - Edit/delete actions

3. **Game Edit** (`/dashboard/games/[id]/edit/page.tsx`)
   - Form to edit game details

### Components to Create

1. **Game Components** (`src/components/games/`)
   - `game-form-dialog.tsx` - Create/edit game
   - `game-card.tsx` - Display game in grid
   - `edition-form-dialog.tsx` - Create/edit edition
   - `expansion-form-dialog.tsx` - Create/edit expansion
   - `game-selector.tsx` - Select game/edition/expansion for miniatures

2. **Miniature Integration**
   - Add game selector to miniature form
   - Display linked games on miniature detail page
   - Show edition and expansion if linked

## User Workflows

### Managing Games
1. Navigate to Games
2. See all games with edition counts
3. Click game to view details
4. Add/edit/delete editions
5. Add/edit/delete expansions within editions

### Linking Miniatures
1. Edit miniature or add new miniature
2. Select game from dropdown
3. Optionally select edition
4. Optionally select expansion (filtered by selected edition)
5. Save miniature

### Viewing Linked Games
1. View miniature detail page
2. See linked game/edition/expansion
3. Quick link to game detail page

## Benefits

1. **Better Organization**: Group miniatures by game system
2. **Edition Tracking**: Know which edition a mini is from
3. **Expansion Tracking**: Track box sets and expansions
4. **Filtering**: Filter miniatures by game/edition/expansion
5. **Statistics**: See collection breakdown by game

## Next Steps

1. Create UI components
2. Create pages
3. Integrate with miniature form
4. Add filtering by game on collection page
5. Test workflows

## Migration Instructions

```bash
# Run the migration
npm run supabase:push

# Regenerate types
npx supabase gen types typescript --local > src/types/database.types.ts

# Verify
npm run type-check
npm run lint
```
