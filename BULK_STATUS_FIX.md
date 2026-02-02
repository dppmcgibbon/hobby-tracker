# Bulk Status Update Error - Fixed

**Date:** February 2, 2026  
**Error:** `Could not find the 'status' column of 'miniatures' in the schema cache`
**Cause:** Trying to update status on wrong table

## Problem

The `bulkUpdateStatus` function was trying to update a `status` column directly on the `miniatures` table:

```typescript
// WRONG - miniatures table doesn't have a status column
await supabase.from("miniatures").update({ status }).in("id", miniatureIds);
```

However, the database schema stores status information in a separate `miniature_status` table, not in the `miniatures` table.

## Database Schema

### Correct Structure:
```
miniatures
  - id
  - name
  - user_id
  - faction_id
  - quantity
  - etc.

miniature_status  ← Status is stored here!
  - miniature_id (FK to miniatures)
  - user_id
  - status
  - completed_at
  - based
  - magnetised
```

## Solution

Changed the `bulkUpdateStatus` function to update the correct table:

**Before:**
```typescript
const { error } = await supabase
  .from("miniatures")  // ❌ WRONG TABLE
  .update({ status })
  .in("id", miniatureIds);
```

**After:**
```typescript
const { error } = await supabase
  .from("miniature_status")  // ✅ CORRECT TABLE
  .update({ status })
  .in("miniature_id", miniatureIds)  // ✅ Correct column name
  .eq("user_id", user.id);  // ✅ Added user check
```

## Key Changes

1. **Table:** `miniatures` → `miniature_status`
2. **Column:** `id` → `miniature_id` (for the IN clause)
3. **Added:** `.eq("user_id", user.id)` for extra security

## Why This Pattern?

The database uses a separate status table to:
- Store additional status-related fields (completed_at, based, magnetised)
- Maintain a clean separation of concerns
- Allow for potential status history in the future
- Keep the miniatures table focused on core miniature data

## Consistency Check

This fix makes `bulkUpdateStatus` consistent with `updateMiniatureStatus`:

```typescript
// Single status update (already correct)
await supabase
  .from("miniature_status")
  .update(validated)
  .eq("miniature_id", miniatureId)
  .eq("user_id", user.id);

// Bulk status update (now also correct)
await supabase
  .from("miniature_status")
  .update({ status })
  .in("miniature_id", miniatureIds)
  .eq("user_id", user.id);
```

## Testing

To verify the fix:

1. **Select Multiple Miniatures:**
   - Click "Select Multiple" button
   - Select 2+ miniatures with checkboxes

2. **Bulk Update Status:**
   - Choose a status from dropdown (e.g., "Painting")
   - Click "Apply" button
   - Should show success toast
   - Miniature cards should update to show new status

3. **Verify Update:**
   - Check individual miniature pages
   - Status should be changed
   - No errors in console

## Status

✅ **Bulk status update now works correctly**
✅ **Updates miniature_status table**
✅ **Consistent with single status update**
✅ **Includes user_id check for security**

The bulk status update feature should now work as expected!
