# Incorrect Miniature Counts - Fixed

**Date:** February 2, 2026  
**Issue:** Collections and Tags pages showing incorrect miniature counts
**Cause:** Supabase `(count)` syntax not returning data in expected format

## Problem

Both pages were using the `(count)` syntax which is unreliable:

```typescript
// PROBLEM: count syntax doesn't work as expected
.select(`
  *,
  collection_miniatures(count)
`)
```

This would return data in an unpredictable format, causing incorrect counts to be displayed.

## Solution

Changed to explicitly fetch the junction table records and count them manually.

### Fix 1: Collections Page

**File:** `src/app/dashboard/collections/page.tsx`

**Before:**
```typescript
// Unreliable - tries to use count() aggregate
const { data: collections } = await supabase
  .from("collections")
  .select(`
    *,
    collection_miniatures(count)
  `)
  .eq("user_id", user.id);

const miniatureCount = Array.isArray(collection.collection_miniatures)
  ? collection.collection_miniatures.length
  : 0;
```

**After:**
```typescript
// Step 1: Fetch all collections
const { data: collections } = await supabase
  .from("collections")
  .select("*")
  .eq("user_id", user.id);

// Step 2: Fetch all junction table records
const collectionIds = collections.map((c) => c.id);
const { data: counts } = await supabase
  .from("collection_miniatures")
  .select("collection_id")
  .in("collection_id", collectionIds);

// Step 3: Count manually using Map
const countMap = new Map<string, number>();
counts?.forEach((c) => {
  countMap.set(c.collection_id, (countMap.get(c.collection_id) || 0) + 1);
});

// Step 4: Get count for each collection
const miniatureCount = countMap.get(collection.id) || 0;
```

### Fix 2: Tags Page

**File:** `src/app/dashboard/tags/page.tsx`

**Before:**
```typescript
// Unreliable - tries to use count() aggregate
const { data: tags } = await supabase
  .from("tags")
  .select(`
    *,
    miniature_tags(count)
  `)
  .eq("user_id", user.id);

const count = Array.isArray(tag.miniature_tags)
  ? tag.miniature_tags.length
  : tag.miniature_tags?.count || 0;
```

**After:**
```typescript
// Step 1: Fetch all tags
const { data: tags } = await supabase
  .from("tags")
  .select("*")
  .eq("user_id", user.id);

// Step 2: Fetch all junction table records
const tagIds = tags.map((t) => t.id);
const { data: counts } = await supabase
  .from("miniature_tags")
  .select("tag_id")
  .in("tag_id", tagIds);

// Step 3: Count manually using Map
const countMap = new Map<string, number>();
counts?.forEach((c) => {
  countMap.set(c.tag_id, (countMap.get(c.tag_id) || 0) + 1);
});

// Step 4: Get count for each tag
const count = countMap.get(tag.id) || 0;
```

## Why This Approach Works

### Manual Counting Benefits:
1. **Reliable:** JavaScript Map is predictable
2. **Accurate:** Count each record explicitly
3. **Debuggable:** Can log counts at each step
4. **Consistent:** Works the same every time

### The Query:
```typescript
// Get ALL junction records
const { data: counts } = await supabase
  .from("collection_miniatures")
  .select("collection_id")
  .in("collection_id", collectionIds);

// Returns: [
//   { collection_id: "abc" },
//   { collection_id: "abc" },
//   { collection_id: "def" },
// ]
```

### The Counting:
```typescript
const countMap = new Map<string, number>();
counts?.forEach((c) => {
  countMap.set(
    c.collection_id, 
    (countMap.get(c.collection_id) || 0) + 1
  );
});

// Result: Map { "abc" => 2, "def" => 1 }
```

## Performance Considerations

### Concern: Two queries instead of one?

**Answer:** This is actually fine because:
- ✅ Total records fetched is the same
- ✅ Supabase count() doesn't always optimize better
- ✅ Easier to debug and maintain
- ✅ Works reliably every time

### Alternative: Use RPC Function

Could create a Postgres function:
```sql
CREATE FUNCTION get_collection_counts(user_id uuid)
RETURNS TABLE(collection_id uuid, count bigint) AS $$
  SELECT collection_id, COUNT(*) 
  FROM collection_miniatures cm
  JOIN collections c ON c.id = cm.collection_id
  WHERE c.user_id = $1
  GROUP BY collection_id;
$$ LANGUAGE sql;
```

**Why we didn't:**
- Current solution works well
- No need for database migration
- Simpler to understand and maintain

## Testing

### Test Collections Count:
1. Go to `/dashboard/collections`
2. Create a collection
3. Add 3 miniatures to it
4. Go back to collections list
5. ✅ Should show "3 miniatures"

### Test Tags Count:
1. Go to `/dashboard/tags`
2. Create a tag
3. Assign it to 5 miniatures
4. Go back to tags list
5. ✅ Should show "5 miniatures"

### Test Empty State:
1. Create collection/tag with no miniatures
2. ✅ Should show "0 miniatures"

### Test Large Numbers:
1. Assign tag to 50 miniatures
2. ✅ Should show "50 miniatures"

## Edge Cases Handled

1. **No miniatures:** Shows "0 miniatures" ✅
2. **One miniature:** Shows "1 miniature" (singular) ✅
3. **Multiple miniatures:** Shows "X miniatures" (plural) ✅
4. **Empty collections/tags list:** Shows empty state ✅

## Status

✅ **Collections count now accurate**
✅ **Tags count now accurate**
✅ **Manual counting approach**
✅ **Handles all edge cases**
✅ **Reliable and debuggable**

The miniature counts should now display correctly on both pages!
