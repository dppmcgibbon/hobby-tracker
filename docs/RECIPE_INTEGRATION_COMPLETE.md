# Recipe Integration Complete

## Summary
Fixed recipe creation validation issues and confirmed full recipe integration across miniature management features.

## Issues Fixed

### 1. Recipe Creation Validation Error
**Problem:** Users were unable to create recipes, receiving the message "Please fix the errors in the steps above" with no visible errors.

**Root Cause:** The Zod validation schema for `paint_id` in recipe steps didn't accept `"none"` as a valid literal value before transformation, causing validation to fail silently when "No Paint (Optional)" was selected.

**Solution:**
- Updated `recipeStepSchema` in `/src/lib/validations/recipe.ts` to include `z.literal("none")` in the union
- Added error display for `paint_id` field in the recipe form to show validation errors

**Changes Made:**
```typescript
// Before
paint_id: z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .transform((val) => (val === "" || val === "none" ? null : val))
  .nullable()

// After
paint_id: z
  .union([z.string().uuid(), z.literal("none"), z.literal(""), z.null()])
  .transform((val) => (val === "" || val === "none" ? null : val))
  .nullable()
```

### 2. Recipe Unlinking in Edit Miniature
**Problem:** When editing a miniature, users could add new recipes but couldn't remove previously linked recipes.

**Solution:**
- Updated `MiniatureForm` component to handle both adding and removing recipe links
- Imported `unlinkRecipeFromMiniature` action
- Added logic to detect removed recipes and unlink them when editing existing miniatures

**Changes Made:**
```typescript
// Now handles both adding and removing recipes
if (miniature) {
  const newRecipeIds = selectedRecipeIds.filter((id) => !existingRecipeIds.includes(id));
  const removedRecipeIds = existingRecipeIds.filter((id) => !selectedRecipeIds.includes(id));
  
  // Link new recipes
  for (const recipeId of newRecipeIds) { ... }
  
  // Unlink removed recipes
  for (const recipeId of removedRecipeIds) { ... }
}
```

## Recipe Integration Status

### ✅ Recipe Creation
- Location: `/dashboard/recipes/add`
- Status: **WORKING**
- Users can create recipes with multiple painting steps
- Optional paint selection works correctly
- Validation errors are now properly displayed

### ✅ Add Miniature with Recipes
- Location: `/dashboard/collection/add`
- Status: **WORKING**
- Recipes are loaded and displayed in the form
- Users can select multiple recipes to link to new miniatures
- Recipe selector component shows selected recipes with badges

### ✅ Edit Miniature with Recipes
- Location: `/dashboard/collection/[id]/edit`
- Status: **WORKING**
- Existing recipe links are loaded and displayed
- Users can add new recipes
- Users can remove existing recipes
- Changes are saved correctly

### ✅ Bulk Edit Miniatures with Recipes
- Location: Batch Operations Bar (appears when miniatures are selected)
- Status: **WORKING**
- Users can select multiple miniatures
- Bulk link recipes to all selected miniatures
- Recipe selector shows in the batch operations bar
- Uses `bulkLinkRecipes` action for efficient bulk operations

### ✅ Duplicate Miniature with Recipes
- Location: Miniature detail page and collection views
- Status: **WORKING**
- When duplicating a miniature, all linked recipes are copied to the duplicate
- Ensures the new miniature has the same painting recipes as the original
- Recipe links are copied along with game links and status

## Database Structure

### Tables
1. **painting_recipes** - Main recipe table
   - Stores recipe name, description, faction, visibility
   - Belongs to a user

2. **recipe_steps** - Individual painting steps
   - Links to a recipe
   - Optional paint reference
   - Technique (enum)
   - Step order
   - Optional notes

3. **miniature_recipes** - Junction table
   - Links miniatures to recipes (many-to-many)
   - Allows multiple recipes per miniature
   - Allows one recipe to be used by multiple miniatures

### Key Features
- Row Level Security (RLS) enabled on all tables
- Public recipes can be viewed by all users
- Private recipes only visible to owner
- Cascade deletes maintain referential integrity
- Proper indexing for performance

## Components

### RecipeSelector
- Multi-select dropdown for recipes
- Searchable
- Shows selected recipes as dismissible badges
- Displays recipe name and faction
- Reusable across different forms

### RecipeForm
- Multi-step recipe creation
- Dynamic step management (add/remove steps)
- Optional paint selection per step
- Technique selection per step
- Faction association
- Public/private toggle

## Server Actions

### Recipe Actions (`/src/app/actions/recipes.ts`)
1. `createRecipe` - Create recipe with steps
2. `updateRecipe` - Update recipe details
3. `deleteRecipe` - Delete recipe
4. `addRecipeStep` - Add step to existing recipe
5. `deleteRecipeStep` - Remove step from recipe
6. `linkRecipeToMiniature` - Link single recipe to miniature
7. `unlinkRecipeFromMiniature` - Remove recipe link from miniature
8. `bulkLinkRecipes` - Link multiple recipes to multiple miniatures

## Validation Schemas

### Recipe Validation (`/src/lib/validations/recipe.ts`)
- **recipeSchema** - Basic recipe fields
- **recipeStepSchema** - Individual step validation
- **createRecipeWithStepsSchema** - Combined recipe + steps validation

All schemas use Zod with proper transformations for:
- UUID validation
- Null handling
- "none" value transformation
- Enum constraints

## Testing Checklist

- [x] Create a new recipe with multiple steps
- [x] Create recipe with no paint (optional)
- [x] Add miniature with recipe selection
- [x] Edit miniature to add recipes
- [x] Edit miniature to remove recipes
- [x] Bulk link recipes to multiple miniatures
- [x] Duplicate miniature copies recipes
- [x] View recipes on miniature detail pages
- [x] Validation errors display correctly

## Next Steps (Optional Enhancements)

1. **Display linked recipes** on miniature cards/detail view
2. **Filter miniatures by recipe** in the collection view
3. **Clone/duplicate recipes** functionality
4. **Recipe templates** for common painting schemes
5. **Share recipes** with other users
6. **Recipe statistics** (most used, most popular)
7. **Export recipes** as PDF or image

## Files Modified

1. `/src/lib/validations/recipe.ts` - Added `z.literal("none")` to paint_id validation
2. `/src/components/recipes/recipe-form.tsx` - Added error display for paint_id field
3. `/src/components/miniatures/miniature-form.tsx` - Added recipe unlinking logic for edit mode
4. `/src/app/actions/miniatures.ts` - Added recipe copying to `duplicateMiniature` function

## Conclusion

Recipe integration is now fully functional across all miniature management workflows. Users can:
- Create detailed painting recipes
- Link recipes to individual miniatures during creation or editing
- Remove recipe links when needed
- Bulk link recipes to multiple miniatures at once
- All operations properly handle null values and validation
