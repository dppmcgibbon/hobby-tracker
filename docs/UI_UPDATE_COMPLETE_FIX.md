# UI Not Updating After Bulk Operations - Complete Fix

**Date:** February 2, 2026  
**Issue:** Bulk operations complete but UI doesn't update until manual page refresh
**Root Cause:** Multiple issues with caching and component state management

## Problem Analysis

The issue had TWO root causes:

### Issue 1: Client Component State Not Syncing
The `StatusBadge` component maintained local state that was only initialized on mount:

```typescript
// ❌ PROBLEM: State initialized once, never updates
const [currentStatus, setCurrentStatus] = useState(status?.status || "backlog");
```

When props changed after bulk update, the component didn't re-sync its local state.

### Issue 2: Page Caching
Next.js was caching the collection page, even with `revalidatePath()` calls on the server.

## Complete Solution

### Fix 1: Add useEffect to Sync Props to State

**File:** `src/components/miniatures/status-badge.tsx`

Added `useEffect` to update local state when props change:

```typescript
import { useState, useEffect } from "react";

export function StatusBadge({ miniatureId, status }: StatusBadgeProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusType>(
    (status?.status as StatusType) || "backlog"
  );
  const [magnetised, setMagnetised] = useState(status?.magnetised || false);
  const [based, setBased] = useState(status?.based || false);

  // ✅ NEW: Sync local state with props when they change
  useEffect(() => {
    if (status) {
      setCurrentStatus((status.status as StatusType) || "backlog");
      setMagnetised(status.magnetised || false);
      setBased(status.based || false);
    }
  }, [status]); // Re-run when status prop changes
  
  // ... rest of component
}
```

**Why This Works:**
- When parent re-renders with new data, props change
- useEffect detects the prop change
- Local state updates to match new props
- UI reflects new status

### Fix 2: Force Dynamic Rendering

**File:** `src/app/dashboard/collection/page.tsx`

Added export declarations to prevent caching:

```typescript
// ✅ NEW: Force dynamic rendering - don't cache this page
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

**What These Do:**
- `dynamic = "force-dynamic"`: Disables static generation, always runs on server
- `revalidate = 0`: No caching, always fetch fresh data

### Fix 3: Add router.refresh() (Already Done)

**File:** `src/components/miniatures/batch-operations-bar.tsx`

Already added in previous fix:

```typescript
const router = useRouter();

await bulkUpdateStatus(selectedIds, selectedStatus);
router.refresh(); // Triggers re-fetch from server
```

## How It All Works Together

### Complete Flow After Bulk Update:

```
1. User selects miniatures and chooses new status
   ↓
2. BatchOperationsBar calls bulkUpdateStatus()
   ↓
3. Server action updates miniature_status table
   ↓
4. Server calls revalidatePath("/dashboard/collection")
   ↓
5. router.refresh() triggers client-side refresh
   ↓
6. Page re-fetches data (dynamic = "force-dynamic")
   ↓
7. New props passed to StatusBadge components
   ↓
8. useEffect detects prop change
   ↓
9. Local state updates
   ↓
10. UI shows new status ✅
```

## Why All Three Fixes Are Needed

### If we only had Fix 1 (useEffect):
- ✅ State would sync when props change
- ❌ But props might not change (cached page data)
- **Result:** Still wouldn't update

### If we only had Fix 2 (dynamic rendering):
- ✅ Fresh data fetched from server
- ❌ But local component state still stale
- **Result:** New data fetched but not displayed

### If we only had Fix 3 (router.refresh):
- ✅ Triggers a refresh
- ❌ But page might still be cached
- ❌ And component state might not sync
- **Result:** Inconsistent behavior

### With All Three:
- ✅ router.refresh() triggers the refresh
- ✅ Dynamic rendering ensures fresh data
- ✅ useEffect syncs component state
- **Result:** Complete, reliable updates! 🎉

## Testing

### Test 1: Bulk Status Update
1. Select 3 miniatures showing "Backlog"
2. Change to "Painting"
3. Click Apply
4. ✅ All 3 should immediately show "Painting" status

### Test 2: Multiple Bulk Updates
1. Select miniatures and set to "Assembled"
2. Verify update appears
3. Select same miniatures and set to "Primed"
4. ✅ Should update to "Primed" immediately

### Test 3: Mixed Statuses
1. Select miniatures with different statuses
2. Set all to "Completed"
3. ✅ All should show "Completed"

### Test 4: No Manual Refresh Needed
1. Perform any bulk operation
2. ✅ Changes should appear without pressing F5

## Technical Details

### StatusBadge Component Pattern

This is a common React pattern:

```typescript
// Controlled component with local state
const [localState, setLocalState] = useState(initialValue);

// Sync with external changes
useEffect(() => {
  setLocalState(propValue);
}, [propValue]);
```

**When to use:**
- Component needs local state for interactions
- But should also respond to external updates
- Common in form inputs, badges, toggles

### Next.js Caching Layers

Next.js has multiple cache layers:
1. **Static Generation** - Built at build time
2. **Data Cache** - Server-side fetch cache
3. **Full Route Cache** - Cached HTML/RSC
4. **Router Cache** - Client-side cache

Our fixes address:
- `dynamic = "force-dynamic"` → Disables Route Cache
- `revalidate = 0` → Disables Data Cache
- `router.refresh()` → Clears Router Cache

## Files Changed

1. ✅ `src/components/miniatures/status-badge.tsx`
   - Added `useEffect` import
   - Added effect to sync state with props

2. ✅ `src/app/dashboard/collection/page.tsx`
   - Added `export const dynamic = "force-dynamic"`
   - Added `export const revalidate = 0`

3. ✅ `src/components/miniatures/batch-operations-bar.tsx` (previous fix)
   - Added `router.refresh()` calls

## Performance Considerations

### Concern: Won't dynamic rendering be slower?

**Answer:** Minimal impact because:
- Collection page needs real-time data anyway
- User is actively managing their collection
- The page isn't shown to millions of users (personal collection)
- Trade-off: Slightly slower load for reliable updates is worth it

### Alternative: Optimistic Updates

Could implement optimistic updates:
```typescript
// Update UI immediately, revert if server fails
setCurrentStatus(newStatus);
try {
  await updateMiniatureStatus(...);
} catch {
  setCurrentStatus(oldStatus); // Revert
}
```

**Why we didn't:** 
- More complex
- Can cause UI flicker if reverted
- Our approach is simpler and reliable

## Status

✅ **UI now updates immediately after bulk operations**
✅ **StatusBadge syncs with prop changes**
✅ **Page always fetches fresh data**
✅ **All caching layers properly handled**
✅ **No manual refresh needed**

The combination of all three fixes ensures reliable, immediate UI updates after bulk operations!
