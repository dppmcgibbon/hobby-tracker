# Games System - Quick Start

## What Was Added

A complete Games management system that allows you to:
- Organize miniatures by game system, edition, and expansion
- Manage games (Warhammer 40K, Kill Team, etc.)
- Track editions (10th Edition, 2021, etc.)
- Track expansions (Starter Set, Hivestorm, etc.)
- Link miniatures to specific games/editions/expansions

## Files Created

### Database
- `supabase/migrations/20240101000012_create_games.sql` - Complete schema with initial data

### Backend
- `src/lib/validations/game.ts` - Input validation schemas
- `src/app/actions/games.ts` - Server actions for CRUD operations

### Frontend Pages
- `src/app/dashboard/games/page.tsx` - Games list page
- `src/app/dashboard/games/[id]/page.tsx` - Game detail page

### Frontend Components
- `src/components/games/game-form-dialog.tsx` - Create/edit games
- `src/components/games/game-card.tsx` - Display game cards
- `src/components/games/edition-form-dialog.tsx` - Create/edit editions
- `src/components/games/expansion-form-dialog.tsx` - Create/edit expansions
- `src/components/games/game-selector.tsx` - Cascading game selector
- `src/components/games/game-link-manager.tsx` - Link miniatures to games

### Updated Files
- `src/app/dashboard/layout.tsx` - Added Games navigation link
- `src/app/dashboard/collection/[id]/page.tsx` - Added game links display
- `src/types/index.ts` - Added Game, Edition, Expansion types

## Setup Steps

### 1. Run Migration
```bash
npm run supabase:push
```

### 2. Regenerate Types
```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

### 3. Restart Dev Server
```bash
npm run dev
```

## Initial Data Included

The migration includes:

### Warhammer 40,000
- 10 editions (Rogue Trader → 10th Edition)

### Combat Patrol
- 10th edition

### Kill Team
- 5 editions (2013, 2016, 2018, 2021, 2024)
- **2021 Edition** - 14 expansions:
  - Starter Set, Chalnath, Nachmund, Moroch, Into the Dark, Annual 2022, Shadowvaults, Soulshackle, Gallowfall, Annual 2023, Ashes of Faith, Salvation, Nightmare, Termination
- **2024 Edition** - 8 expansions:
  - Starter Set, Hivestorm, Brutal and Cunning, Blood and Zeal, Typhon, Tomb World, Dead Silence, Warhammer Heroes

## Quick Usage

### View Games
1. Navigate to **Games** in the top menu
2. See all games with edition counts
3. Use search to find specific games

### Manage Game Details
1. Click on any game card
2. View all editions and expansions
3. Click "Add Edition" to add new editions
4. Expand an edition and click "Add Expansion"
5. Use edit/delete icons for modifications

### Link Miniatures to Games
1. Go to any miniature detail page
2. Scroll to the "Linked Games" section
3. Click "Link Game"
4. Select game, then optionally edition and expansion
5. Click "Link Game" to save

### View Linked Games
On miniature detail pages, you'll see:
- All linked games
- Edition badges (if linked)
- Expansion badges (if linked)
- Quick unlink option

## Features

✅ Full CRUD for games, editions, expansions
✅ Hierarchical organization (Game → Edition → Expansion)
✅ Link miniatures to games with optional edition/expansion
✅ Cascading deletes (delete game → removes editions → removes expansions)
✅ Search games by name
✅ Collapsible edition views
✅ Sequence-based ordering
✅ Optional year tracking
✅ Responsive design
✅ Form validation
✅ Error handling
✅ Loading states

## Navigation

Top menu now includes:
- Home
- Miniatures
- Collections
- Tags
- **Games** ← NEW!
- Recipes
- Paints
- 3D Printing

## Database Structure

```
games
├── editions
│   └── expansions
└── miniature_games (junction)
    └── links to miniatures
```

## Common Tasks

### Add a New Game
1. Games page → "Add Game" button
2. Enter name (required), publisher, description
3. Save

### Add an Edition
1. Game detail page → "Add Edition" button
2. Enter name, sequence, optional year
3. Save

### Add an Expansion
1. Game detail → Expand an edition
2. "Add Expansion" button
3. Enter name, sequence, optional year
4. Save

### Link Miniature to Game
1. Miniature detail → "Link Game" button
2. Select game (required)
3. Select edition (optional)
4. Select expansion (optional)
5. Save

## Troubleshooting

**Type errors?**
→ Regenerate types: `npx supabase gen types typescript --local > src/types/database.types.ts`

**No games showing?**
→ Check migration ran successfully: `npm run supabase:push`

**Changes not appearing?**
→ Refresh the page or restart dev server

## Next Steps

After setup, you can:
1. Browse the pre-loaded games (Warhammer 40K, Kill Team, etc.)
2. Add your own games
3. Start linking your miniatures to games
4. Use this for better organization and future filtering

## Documentation

Full documentation: `docs/GAMES_SYSTEM_COMPLETE.md`

## Summary

Total files created: **13**
- 1 migration
- 2 backend files (validations + actions)
- 2 pages
- 6 components
- 2 updated files
- 2 documentation files

This is a complete, production-ready implementation of the Games system!
