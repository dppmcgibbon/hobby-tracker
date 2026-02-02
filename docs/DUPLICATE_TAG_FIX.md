# Duplicate Tag Assignment Error - Fixed

**Date:** February 2, 2026  
**Error:** `duplicate key value violates unique constraint "miniature_tags_pkey"`
**Cause:** Attempting to assign the same tag to a miniature that already has it

## Problem

The database has a PRIMARY KEY constraint on `(miniature_id, tag_id)` in the `miniature_tags` table. This prevents duplicate tag assignments, which is correct behavior.

However, the code didn't check for existing assignments before inserting, causing errors when:
1. User tries to tag a miniature that already has that tag
2. Bulk tagging includes miniatures that already have the tag

## Solution

### 1. Fixed `bulkAddTags` Function

**File:** `src/app/actions/tags.ts`

**Changes:**
- ✅ Query existing tag assignments before inserting
- ✅ Filter out miniatures that already have the tag
- ✅ Only insert new assignments
- ✅ Return detailed information about what was done

**New behavior:**
```typescript
{
  success: true,
  message: "Tagged 3 miniature(s), skipped 2 already tagged",
  added: 3,      // Number of new tag assignments
  skipped: 2     // Number already had the tag
}
```

**Logic:**
1. Get all miniatures that already have this tag
2. Filter the input list to only include new assignments
3. If all already have the tag → return success with "already tagged" message
4. Insert only the new assignments
5. Return counts of added vs skipped

### 2. Fixed `addTagToMiniature` Function

**File:** `src/app/actions/tags.ts`

**Changes:**
- ✅ Check if tag is already assigned before inserting
- ✅ If already assigned, return success (idempotent operation)
- ✅ Prevents error when clicking same tag twice

**New behavior:**
```typescript
{
  success: true,
  alreadyExists: true  // or false if newly added
}
```

### 3. Updated Batch Operations Bar

**File:** `src/components/miniatures/batch-operations-bar.tsx`

**Changes:**
- ✅ Show custom message if some were skipped
- ✅ Display "Tagged X, skipped Y already tagged"
- ✅ Gives user feedback about what happened

## Examples

### Scenario 1: All New Tag Assignments
**Action:** Bulk tag 5 miniatures with "WIP" tag (none have it yet)
**Result:** 
```
✅ "Tagged 5 miniature(s)"
```

### Scenario 2: Some Already Tagged
**Action:** Bulk tag 5 miniatures with "WIP" tag (2 already have it)
**Result:**
```
✅ "Tagged 3 miniature(s), skipped 2 already tagged"
```

### Scenario 3: All Already Tagged
**Action:** Bulk tag 5 miniatures with "WIP" tag (all 5 already have it)
**Result:**
```
✅ "All selected miniatures already have this tag"
```

### Scenario 4: Single Miniature Toggle
**Action:** Click tag on miniature detail page (already has tag)
**Result:**
- No error
- Tag remains selected
- Operation succeeds silently

## Technical Details

### Database Constraint
```sql
PRIMARY KEY (miniature_id, tag_id)
```
This ensures each miniature can only have each tag once.

### Query to Check Existing
```typescript
const { data: existingTags } = await supabase
  .from("miniature_tags")
  .select("miniature_id")
  .in("miniature_id", miniatureIds)
  .eq("tag_id", tagId);
```

### Filtering Logic
```typescript
const existingMiniatureIds = new Set(existingTags?.map((t) => t.miniature_id) || []);
const newMiniatureIds = miniatureIds.filter((id) => !existingMiniatureIds.has(id));
```

## Benefits

1. **No More Errors:** Operations succeed even if tag already assigned
2. **Better UX:** User sees exactly what happened
3. **Idempotent:** Same operation can be run multiple times safely
4. **Informative:** Tells user how many were added vs skipped
5. **Efficient:** Only inserts what's needed

## Testing

To verify the fix:

1. **Test Single Tag Assignment:**
   - Go to miniature detail page
   - Click a tag to assign it
   - Click the same tag again → Should work without error

2. **Test Bulk Tagging:**
   - Select 5 miniatures
   - Assign tag "Test" to all
   - Select the same 5 again
   - Try assigning "Test" again → Should show "already have this tag"

3. **Test Mixed Scenario:**
   - Select 5 miniatures (2 already have tag "WIP", 3 don't)
   - Assign "WIP" tag
   - Should show "Tagged 3, skipped 2 already tagged"

## Status

✅ **Duplicate key error fixed**
✅ **Bulk tagging handles existing assignments**
✅ **Single tag assignment is idempotent**
✅ **User feedback improved**

The error should no longer occur when assigning tags!
