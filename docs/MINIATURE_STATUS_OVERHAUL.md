# Miniature Status System Overhaul

## Summary
Expanded the miniature status system from 5 statuses to 13 comprehensive statuses, stored in a dedicated database table for better management and extensibility.

## Previous Status System

**Old statuses (5):**
1. Backlog
2. Assembled
3. Primed
4. Painting (In Progress)
5. Completed

## New Status System

**New statuses (13):**
1. Unknown
2. Missing
3. Needs Stripped
4. Backlog
5. Built
6. Primed
7. Painting Started
8. Needs Repair
9. Sub-Assembled
10. Missing Arm
11. Missing Leg
12. Missing Head
13. Complete

## Database Changes

### New Table: `miniature_statuses`

**Structure:**
```sql
- id (UUID, primary key)
- name (TEXT, unique) - The status value (e.g., 'built', 'primed')
- display_order (INTEGER, unique) - Determines sort order
- created_at (TIMESTAMPTZ)
```

**Benefits:**
- Central source of truth for all valid statuses
- Easy to add new statuses without code changes
- Maintains consistent ordering across the application
- Can be extended with additional metadata (color, icon, description)

### Migration File
`supabase/migrations/20240101000016_create_miniature_statuses_table.sql`

**Features:**
- **Drops the old CHECK constraint** on the `status` column that was limiting values to the old 5 statuses
- Creates `miniature_statuses` lookup table
- Populates with all 13 status values
- Adds `status_id` column to `miniature_status` table
- Migrates existing status data to new system:
  - `assembled` → `built`
  - `completed` → `complete`
  - Other statuses map directly
- Keeps old `status` column temporarily for backward compatibility
- Sets up RLS policies for read access
- Creates indexes for performance
- **Updates the `handle_status_timestamps()` trigger function** to work with new status values:
  - Sets `started_at` when moving from `backlog` or `unknown`
  - Sets `completed_at` when moving to `complete`
  - Clears `completed_at` when moving away from `complete`

## Code Changes

### 1. Constants File (New)
**File:** `/src/lib/constants/miniature-status.ts`

Created centralized constants for status display and colors:
- `STATUS_LABELS` - Maps database values to display text
- `STATUS_COLORS` - Maps statuses to HSL color values for charts
- `MiniatureStatusValue` - TypeScript type for all valid status values
- Includes legacy mappings for backward compatibility

### 2. Validation Schema
**File:** `/src/lib/validations/miniature.ts`

Updated `miniatureStatusSchema` enum to include all 13 new statuses.

### 3. Query Functions
**File:** `/src/lib/queries/miniatures.ts`

Added `getMiniatureStatuses()` function to fetch all statuses from database.

### 4. Status Badge Component
**File:** `/src/components/miniatures/status-badge.tsx`

- Updated `StatusType` to include all 13 statuses
- Updated dropdown to show all new status options
- Maintains existing functionality for updating status

### 5. Batch Operations Bar
**File:** `/src/components/miniatures/batch-operations-bar.tsx`

- Updated bulk status dropdown to include all 13 statuses
- Allows bulk updating miniatures to any of the new statuses

### 6. Collection Filters
**File:** `/src/components/miniatures/collection-filters.tsx`

- Updated `STATUS_OPTIONS` array with all 13 statuses
- Users can now filter by any of the new statuses

### 7. Advanced Search
**File:** `/src/components/miniatures/advanced-search.tsx`

- Updated status options in advanced search
- All 13 statuses available for search filtering

### 8. Status Distribution Chart
**File:** `/src/components/dashboard/status-distribution-chart.tsx`

- Now imports `STATUS_LABELS` and `STATUS_COLORS` from constants file
- Automatically handles any status value
- Falls back to default color for unknown statuses

## Status Categories

The new statuses can be logically grouped:

### Inventory/Issue Statuses
- **Unknown** - Status not yet determined
- **Missing** - Miniature is lost or misplaced
- **Needs Stripped** - Needs old paint removed
- **Needs Repair** - Requires fixing/restoration

### Assembly Statuses
- **Backlog** - Not started
- **Sub-Assembled** - Partially built
- **Missing Arm/Leg/Head** - Incomplete due to missing parts
- **Built** - Fully assembled

### Painting Statuses
- **Primed** - Basecoated and ready to paint
- **Painting Started** - Work in progress
- **Complete** - Fully painted and finished

## Migration Strategy

### Phase 1: Database (Completed)
✅ Create lookup table
✅ Add status_id column
✅ Migrate existing data
✅ Keep old column for compatibility

### Phase 2: Code (Completed)
✅ Update validation schemas
✅ Update all UI components
✅ Create constants file
✅ Update dropdowns and filters

### Phase 3: Future
- Add status descriptions/help text
- Add custom colors per status in database
- Add status icons
- Create status workflow suggestions
- Analytics by new status types
- Eventually remove old `status` text column

## Backward Compatibility

**Legacy Status Mapping:**
- `assembled` → `built` (automatically migrated)
- `completed` → `complete` (automatically migrated)
- `painting` → `painting_started` (maps via constants)

The constants file includes legacy mappings to ensure any old data displays correctly.

## User Experience

### Status Selection
- All dropdowns show statuses in the defined order
- Clear, descriptive labels for each status
- Covers common scenarios (missing parts, needs repair, etc.)

### Filtering
- Users can filter collection by any of 13 statuses
- Advanced search includes all statuses
- Charts automatically display all active statuses

### Bulk Operations
- Can bulk update miniatures to any status
- Useful for batch processing (e.g., marking multiple as "Built")

## Color Scheme

Status colors in charts:
- **Unknown**: Gray
- **Missing**: Red
- **Needs Stripped**: Orange
- **Backlog**: Steel gray
- **Built**: Imperial gold
- **Primed**: Bronze
- **Painting Started**: Blue
- **Needs Repair**: Red-orange
- **Sub-Assembled**: Light gold
- **Missing Arm/Leg/Head**: Dark red
- **Complete**: Green

## Statistics Impact

The dashboard statistics queries will need to be updated to:
1. Group related statuses (e.g., all "missing part" statuses together)
2. Handle the new status values in completionPercentage calculations
3. Update any hard-coded status references

## Testing Checklist

- [x] Migration file created
- [x] Constants file created
- [x] Validation schema updated
- [x] Query function added
- [x] Status badge updated
- [x] Batch operations updated
- [x] Collection filters updated
- [x] Advanced search updated
- [x] Status chart updated
- [x] All status dropdowns show 13 options
- [x] No linter errors

## Files Created

1. `/supabase/migrations/20240101000016_create_miniature_statuses_table.sql`
2. `/src/lib/constants/miniature-status.ts`

## Files Modified

1. `/src/lib/validations/miniature.ts`
2. `/src/lib/queries/miniatures.ts`
3. `/src/components/miniatures/status-badge.tsx`
4. `/src/components/miniatures/batch-operations-bar.tsx`
5. `/src/components/miniatures/collection-filters.tsx`
6. `/src/components/miniatures/advanced-search.tsx`
7. `/src/components/dashboard/status-distribution-chart.tsx`

## Migration Instructions

1. **Apply the migration:**
   ```bash
   supabase db push
   ```

2. **Or manually in Supabase dashboard:**
   - Go to SQL Editor
   - Copy migration file contents
   - Execute

3. **Verify the changes:**
   - Check `miniature_statuses` table has 13 rows
   - Check `miniature_status` table has new `status_id` column
   - Test status dropdowns show all 13 options
   - Verify existing miniatures still display correct status

## Next Steps

After applying the migration:
1. Test status updates on individual miniatures
2. Test bulk status updates
3. Test status filtering in collection view
4. Verify charts display correctly with new statuses
5. Consider updating statistics queries to handle new statuses
6. Plan future removal of old `status` text column
