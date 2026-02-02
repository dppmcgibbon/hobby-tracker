# Game Filters for Miniatures Collection

## Overview

Added comprehensive game/edition/expansion filtering to the miniatures collection page, allowing you to filter your miniatures by:
- **Game** (e.g., Warhammer 40,000, Kill Team)
- **Edition** (e.g., 10th Edition, 2021) - only shown when a game is selected
- **Expansion** (e.g., Starter Set, Hivestorm) - only shown when an edition is selected

## Features

### Cascading Filters
- Select a game to see only miniatures linked to that game
- Select an edition to further filter by specific edition
- Select an expansion to narrow down to specific box sets/expansions

### Smart UI
- **Cascading Dropdowns**: Edition filter only appears when a game is selected, expansion filter only appears when an edition is selected
- **Auto-Reset**: Clearing a parent filter (game) automatically clears child filters (edition, expansion)
- **URL-Based**: All filters are reflected in the URL, allowing bookmarking and sharing
- **Active Filter Badges**: Visual badges show which filters are active with quick removal

### Desktop & Mobile
- **Desktop**: All filters displayed in a single row with horizontal scrolling if needed
- **Mobile**: Filters accessible via slide-out sheet with clear organization

## How It Works

### Server-Side Filtering

The collection page fetches miniatures that are linked to games via the `miniature_games` junction table:

```typescript
// In src/app/dashboard/collection/page.tsx

// Fetch games, editions, expansions
const { data: games } = await supabase.from("games").select("id, name").order("name");

// If game filter is active, fetch editions for that game
if (params.game && params.game !== "all") {
  const { data: editions } = await supabase
    .from("editions")
    .select("id, name, year")
    .eq("game_id", params.game)
    .order("sequence");
}

// If edition filter is active, fetch expansions for that edition
if (params.edition && params.edition !== "all") {
  const { data: expansions } = await supabase
    .from("expansions")
    .select("id, name, year")
    .eq("edition_id", params.edition)
    .order("sequence");
}

// Filter miniatures by game/edition/expansion
let gameQuery = supabase
  .from("miniature_games")
  .select("miniature_id")
  .eq("game_id", params.game);

if (params.edition !== "all") {
  gameQuery = gameQuery.eq("edition_id", params.edition);
}

if (params.expansion !== "all") {
  gameQuery = gameQuery.eq("expansion_id", params.expansion);
}

const { data: gameMiniatures } = await gameQuery;
```

### Client-Side Filter Management

The `CollectionFilters` component manages filter state and URL synchronization:

```typescript
// In src/components/miniatures/collection-filters.tsx

const [filters, setFilters] = useState<FilterState>({
  // ... other filters ...
  gameId: searchParams.get("game") || "all",
  editionId: searchParams.get("edition") || "all",
  expansionId: searchParams.get("expansion") || "all",
});

// Cascading logic
<Select
  value={filters.gameId}
  onValueChange={(v) => {
    updateFilter("gameId", v);
    if (v === "all") {
      // Clear child filters when parent is cleared
      updateFilter("editionId", "all");
      updateFilter("expansionId", "all");
    }
  }}
>
```

## Files Modified

### 1. Server Component
- `src/app/dashboard/collection/page.tsx`
  - Added game/edition/expansion fetching
  - Added game filtering logic
  - Passed games/editions/expansions to client component

### 2. Client Component
- `src/app/dashboard/collection/collection-client.tsx`
  - Updated props to accept games, editions, expansions
  - Passed to CollectionFilters component

### 3. Filter Component
- `src/components/miniatures/collection-filters.tsx`
  - Added game/edition/expansion filter state
  - Added cascading dropdown UI (desktop)
  - Added game filters to mobile sheet
  - Added active filter badges for games
  - Updated clear filters logic

## Usage

### Filtering by Game
1. Navigate to **Miniatures** page
2. Find the **Game** dropdown in the filter bar
3. Select a game (e.g., "Kill Team")
4. Only miniatures linked to that game will be shown

### Filtering by Edition
1. First select a game
2. The **Edition** dropdown will appear
3. Select an edition (e.g., "2021")
4. Results narrow to miniatures from that specific edition

### Filtering by Expansion
1. First select a game and edition
2. The **Expansion** dropdown will appear
3. Select an expansion (e.g., "Hivestorm")
4. Results show only miniatures from that expansion

### Combining Filters
You can combine game filters with other filters:
- **Game + Faction**: Show Kill Team miniatures from Space Marines
- **Game + Status**: Show completed miniatures from Warhammer 40,000
- **Game + Edition + Tag**: Show 10th Edition miniatures with "Priority" tag

### URL Parameters

Filters are reflected in the URL:
- `?game=uuid` - Filter by game
- `?game=uuid&edition=uuid` - Filter by game and edition
- `?game=uuid&edition=uuid&expansion=uuid` - Filter by all three

Example URL:
```
/dashboard/collection?game=123&edition=456&expansion=789&status=painting
```

## Active Filter Display

When game filters are active, badges appear showing:
- **Game**: Shows game name with X to clear (also clears edition/expansion)
- **Edition**: Shows edition name with X to clear (also clears expansion)
- **Expansion**: Shows expansion name with X to clear

Clicking the X on a parent filter automatically clears child filters.

## Mobile Experience

On mobile devices:
1. Tap the "Filters" button
2. Scroll through the filter sheet
3. Game/Edition/Expansion filters appear in sequence
4. Cascading logic still applies
5. Close sheet to see filtered results

## Performance

- **Lazy Loading**: Editions only load when a game is selected
- **Conditional Rendering**: Edition/expansion dropdowns only render when needed
- **URL-Based**: Filters persist across page reloads
- **Debounced Search**: Search input is debounced to avoid excessive API calls

## Benefits

1. **Better Organization**: Quickly find miniatures from specific games
2. **Edition Tracking**: See which edition your miniatures are from
3. **Expansion Tracking**: Identify miniatures from specific box sets
4. **Collection Planning**: Identify gaps in your collection per game/edition
5. **Inventory Management**: Track what you have from each release

## Future Enhancements

- Statistics by game/edition/expansion
- Game-specific sorting options
- Bulk operations filtered by game
- Export filtered results
- Save filter presets

## Testing

After setup, test these flows:

1. **Basic Filter**: Select a game, verify miniatures filter correctly
2. **Cascading**: Select game → edition → expansion, verify each narrows results
3. **Clear Parent**: Select game + edition, then clear game, verify edition also clears
4. **Combine Filters**: Combine game filter with faction/status/tag filters
5. **Mobile**: Test filter sheet on mobile device
6. **URL**: Copy filtered URL and open in new tab, verify filters persist
7. **Active Badges**: Verify badges appear and X buttons work correctly

## Troubleshooting

### No games appear in dropdown
- Ensure games migration has been run
- Check that games exist in database
- Verify `games` prop is being passed correctly

### Editions/expansions don't load
- Check that miniatures are actually linked to games
- Verify `game_id` in filters matches database
- Check console for errors

### Filters don't persist
- Verify URL parameters are being set correctly
- Check browser console for navigation errors
- Ensure router.replace is working

## Related Documentation

- [Games System Complete](./GAMES_SYSTEM_COMPLETE.md) - Full games system documentation
- [Games Quick Start](./GAMES_SYSTEM_QUICKSTART.md) - Quick setup guide
- [Games Implementation Summary](./GAMES_IMPLEMENTATION_SUMMARY.md) - Implementation details

## Summary

The game filter feature provides a powerful way to organize and filter your miniature collection by game system, edition, and expansion. The cascading filter design ensures a smooth user experience while the URL-based approach ensures filters are shareable and persistent.

Total additions:
- 3 new filter fields (game, edition, expansion)
- Cascading dropdown logic
- Mobile filter UI updates
- Active filter badges
- Server-side game filtering
- ~200 lines of code

This feature seamlessly integrates with the existing filter system and provides immediate value for collectors with miniatures from multiple games and editions.
