# Recipe Duplication Feature

## Overview
When duplicating a miniature, all linked painting recipes are now automatically copied to the duplicate miniature.

## Implementation

### Changes Made

**File:** `/src/app/actions/miniatures.ts`

**Function:** `duplicateMiniature(id: string)`

### Code Changes

Added recipe link fetching:
```typescript
// Get the original recipe links
const { data: originalRecipes } = await supabase
  .from("miniature_recipes")
  .select("recipe_id")
  .eq("miniature_id", id);
```

Added recipe link copying:
```typescript
// Copy recipe links if any exist
if (originalRecipes && originalRecipes.length > 0) {
  const recipeLinks = originalRecipes.map((link) => ({
    miniature_id: duplicate.id,
    recipe_id: link.recipe_id,
  }));

  const { error: recipesError } = await supabase
    .from("miniature_recipes")
    .insert(recipeLinks);

  if (recipesError) {
    console.error("Error copying recipe links:", recipesError);
    // Don't throw - we still want the duplicate to succeed even if recipe links fail
  }
}
```

## Behavior

When you duplicate a miniature, the following data is now copied:

1. ✅ **Miniature Data** - Name (with "(Copy)" suffix), faction, unit type, quantity, material, base size, sculptor, year, notes, storage location
2. ✅ **Status** - Status (backlog/assembled/primed/painting/completed), magnetised flag, based flag
3. ✅ **Game Links** - Game, edition, and expansion associations
4. ✅ **Recipe Links** - All painting recipes linked to the original miniature

## Error Handling

The recipe copying is non-blocking. If recipe links fail to copy:
- The error is logged to the console
- The duplication still succeeds
- The user is not blocked from creating the duplicate
- This matches the behavior of game link copying

## User Experience

1. User clicks "Duplicate" button on a miniature
2. System creates a duplicate with all associated data including recipes
3. User is redirected to the edit page of the new duplicate
4. All recipes from the original are already linked to the duplicate
5. User can add or remove recipes as needed

## Testing

To test the feature:
1. Create or select a miniature with linked recipes
2. Click the "Duplicate" button
3. Check that the duplicate has all the same recipes linked
4. Verify you can edit the duplicate independently

## Benefits

- **Consistency** - Duplicates maintain all the painting information from the original
- **Efficiency** - No need to manually re-link recipes after duplication
- **Workflow** - Useful when creating multiple miniatures with the same paint scheme
- **Time Saving** - Especially valuable for batch painting projects

## Example Use Cases

1. **Army Building** - Duplicate a fully configured Space Marine to create a squad with the same paint scheme
2. **Batch Painting** - Create multiple miniatures with identical recipes for efficient batch painting
3. **Variants** - Duplicate a miniature to create a variant with the same base paint scheme
4. **Templates** - Use duplicates as starting points for similar miniatures

## Related Features

This complements other duplication features:
- Status copying (backlog/assembled/primed/painting/completed)
- Game link copying (game, edition, expansion)
- Storage location copying
- Metadata copying (faction, unit type, etc.)

## Future Enhancements

Possible future improvements:
- Option to duplicate without certain associations (e.g., duplicate without recipes)
- Bulk duplicate with recipe linking
- Recipe template application during duplication
- Copy photos option
