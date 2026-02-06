# Bulk Game Linking Feature

## Overview

Added the ability to bulk link multiple miniatures to a game, edition, and expansion simultaneously. This feature integrates with the existing batch operations bar that appears when miniatures are selected.

## Features

### Bulk Game Linking
When miniatures are selected in the collection view, you can now:
- Link all selected miniatures to a game
- Optionally specify an edition
- Optionally specify an expansion
- Link in one operation instead of individually

### User Interface

**Location:** Batch Operations Bar (appears at bottom of screen when miniatures selected)

**Components:**
1. **Game Selector** - Dropdown to choose game
2. **Edition Selector** - Appears when game selected (if editions exist)
3. **Expansion Selector** - Appears when edition selected (if expansions exist)
4. **Link Button** - Gamepad icon to execute the bulk link

### How It Works

1. Select multiple miniatures using "Select Multiple" mode
2. Batch operations bar appears at bottom
3. Choose a game from the "Link to game..." dropdown
4. Optionally choose edition (if applicable)
5. Optionally choose expansion (if applicable)
6. Click the Gamepad icon button to link all selected miniatures
7. Success toast confirms the operation
8. Selection is cleared automatically

## Implementation Details

### Server Action

Added `bulkLinkMinaturesToGame()` in `/src/app/actions/games.ts`:

```typescript
export async function bulkLinkMinaturesToGame(
  miniatureIds: string[],
  gameId: string,
  editionId?: string | null,
  expansionId?: string | null
)
```

**Features:**
- Verifies all miniatures belong to the user
- Creates game links for all miniatures
- Uses `upsert` to handle existing links (updates if already linked)
- Returns count of linked miniatures
- Revalidates the collection page

### UI Component Updates

**BatchOperationsBar** (`/src/components/miniatures/batch-operations-bar.tsx`):
- Added game, edition, expansion state management
- Added filtered editions/expansions based on selection
- Added game link handler
- Conditionally shows edition/expansion selectors
- Gamepad2 icon for the link button

**CollectionClient** (`/src/app/dashboard/collection/collection-client.tsx`):
- Passes games, editions, expansions data to batch operations bar
- Data already available from page query

## User Experience

### Workflow Example

**Scenario:** Linking 10 Space Marine miniatures to Warhammer 40K, 10th Edition

1. Enter selection mode
2. Select 10 miniatures
3. In batch operations bar:
   - Choose "Warhammer 40,000" from game dropdown
   - Choose "10th Edition" from edition dropdown
   - Click Gamepad icon
4. Toast: "Linked 10 miniature(s) to game"
5. All 10 miniatures now linked to the game

**Time saved:** Instead of opening each miniature individually and linking, bulk link all at once!

## Integration Points

### Existing Features
- Works seamlessly with existing batch operations (status, tags, collections)
- Uses same selection mode mechanism
- Consistent UI patterns
- Same floating bar design

### Database
- Uses existing `miniature_games` table
- No schema changes required
- Supports upsert (updates existing links)
- Maintains referential integrity

## Benefits

1. **Time Saving** - Link multiple miniatures at once
2. **Consistency** - Ensure all units from same army linked to same game
3. **Efficiency** - Reduce repetitive clicking
4. **Flexibility** - Can specify edition/expansion or just game
5. **Safety** - Upsert prevents duplicate links

## UI Design

### Visual Elements
- Gamepad2 icon for game linking (matches Games page)
- Consistent with other batch operations
- Progressive disclosure (edition/expansion only when needed)
- Clear visual separation with dividers

### Responsive Behavior
- May need to scroll on smaller screens
- Bar grows horizontally to accommodate options
- Fixed position at bottom of viewport
- Always accessible during selection mode

## Validation & Error Handling

### Validation
- Requires at least one miniature selected
- Requires game selection (edition/expansion optional)
- Verifies user owns all selected miniatures
- Validates game/edition/expansion exist

### Error Handling
- Toast notification on error
- Graceful failure messages
- Selection remains active on error
- Transaction safety (all or nothing)

## Future Enhancements

Potential improvements:
- [ ] Bulk unlink from games
- [ ] Update existing game links in bulk
- [ ] Preview which miniatures already linked
- [ ] Confirmation dialog before linking
- [ ] Show count of already-linked miniatures
- [ ] Bulk copy game links from one miniature to others
- [ ] Link to multiple games at once

## Technical Notes

### Upsert Behavior
The function uses `upsert` with conflict on `miniature_id,game_id`:
- If link exists: Updates edition/expansion
- If link doesn't exist: Creates new link
- Prevents duplicate game links for same miniature

### Performance
- Single database operation for all links
- Efficient bulk insert
- Minimal network requests
- Fast operation even with many miniatures

## Testing Checklist

- [ ] Link single miniature to game
- [ ] Link multiple miniatures to game
- [ ] Link with edition specified
- [ ] Link with edition and expansion specified
- [ ] Update existing links (upsert behavior)
- [ ] Error handling for invalid game ID
- [ ] Error handling for miniatures not owned by user
- [ ] UI updates after linking
- [ ] Toast notifications appear correctly
- [ ] Selection clears after successful link
