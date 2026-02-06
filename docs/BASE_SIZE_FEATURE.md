# Base Size Feature Implementation

## Summary
Replaced the free-text `base_size` field with structured dropdown selectors for Base, Base Shape, and Base Type, allowing for better data consistency and filtering.

## Database Changes

### New Tables Created

1. **bases** - Contains base sizes (e.g., 20mm, 32mm, 25x50mm)
2. **base_shapes** - Contains base shapes (Round, Square, Oval, Rectangle)
3. **base_types** - Contains base types (Flying, Legions Imperialis)

### Migration File
`supabase/migrations/20240101000015_create_base_tables.sql`

**Features:**
- Creates three new tables with UUID primary keys
- Populates tables with data from provided CSV files
- Adds foreign key columns to `miniatures` table:
  - `base_id` - References `bases`
  - `base_shape_id` - References `base_shapes`
  - `base_type_id` - References `base_types`
- All three fields are nullable (optional)
- Creates indexes for performance
- Enables Row Level Security with read access for all authenticated users
- Keeps existing `base_size` field for backward compatibility

### Data Populated

**Bases (24 entries):**
- Round bases: 20mm, 25mm, 28mm, 28.5mm, 32mm, 40mm, 50mm, 60mm, 65mm, 80mm, 90mm, 100mm, 105mm, 120mm, 130mm
- Rectangular bases: 25x50mm, 30x60mm, 40x60mm, 50x100mm, 60x35mm, 75x46mm, 100x60mm, 105x70mm, 120x92mm

**Base Shapes (4 entries):**
- Round
- Square
- Oval
- Rectangle

**Base Types (2 entries):**
- Flying
- Legions Imperialis

## Code Changes

### 1. Validation Schema
**File:** `/src/lib/validations/miniature.ts`

Added three new optional fields:
```typescript
base_id: z.string().uuid("Invalid base").optional().nullable(),
base_shape_id: z.string().uuid("Invalid base shape").optional().nullable(),
base_type_id: z.string().uuid("Invalid base type").optional().nullable(),
```

### 2. Query Functions
**File:** `/src/lib/queries/miniatures.ts`

Added three new query functions:
- `getBases()` - Fetches all bases ordered by name
- `getBaseShapes()` - Fetches all base shapes ordered by name
- `getBaseTypes()` - Fetches all base types ordered by name

### 3. Miniature Form Component
**File:** `/src/components/miniatures/miniature-form.tsx`

**Changes:**
- Added interfaces for `Base`, `BaseShape`, and `BaseType`
- Updated `MiniatureFormProps` to include arrays for each base type
- Added three new watched fields: `baseId`, `baseShapeId`, `baseTypeId`
- Updated default values to include base fields when editing
- Replaced single "Base Size" text input with three dropdown selects
- Each dropdown has a "No [type]" option to allow null values
- Dropdowns are in a 3-column grid layout

**UI Layout:**
Row 1: Quantity, Material (removed base_size from this row)
Row 2: Base (dropdown), Base Shape (dropdown), Base Type (dropdown)

### 4. Add Miniature Page
**File:** `/src/app/dashboard/collection/add/page.tsx`

- Added imports for `getBases`, `getBaseShapes`, `getBaseTypes`
- Fetches all three base data sets in parallel with other data
- Passes `bases`, `baseShapes`, and `baseTypes` props to `MiniatureForm`

### 5. Edit Miniature Page
**File:** `/src/app/dashboard/collection/[id]/edit/page.tsx`

- Added imports for `getBases`, `getBaseShapes`, `getBaseTypes`
- Fetches all three base data sets in parallel with other data
- Passes `bases`, `baseShapes`, and `baseTypes` props to `MiniatureForm`
- Existing base field values are loaded and displayed in dropdowns

## User Experience

### When Adding a Miniature
1. Users see three separate dropdowns: Base, Base Shape, Base Type
2. All three are optional (can be set to "No [type]")
3. Dropdowns are populated with predefined values from the database
4. Each dropdown is searchable and shows a clean list of options

### When Editing a Miniature
1. Existing base selections are pre-populated in the dropdowns
2. Users can change any or all of the three base fields
3. Users can clear selections by choosing "No [type]"

### Benefits
- **Data consistency**: No more typos or variant spellings
- **Easier filtering**: Can filter miniatures by exact base size
- **Better organization**: Structured data instead of free text
- **Searchable**: Dropdowns are searchable for quick selection
- **Flexible**: All three fields are optional

## Backward Compatibility

The old `base_size` text field is kept in the database for backward compatibility. Existing miniatures with text-based base sizes will still have that data, but new/edited miniatures will use the structured fields.

## Future Enhancements

Possible improvements:
1. Add migration script to parse existing `base_size` text values and populate the new fields
2. Add filtering in collection view by base size, shape, and type
3. Display base information in miniature cards and table view
4. Add base statistics (most common base sizes, etc.)
5. Allow admins to add new base sizes, shapes, and types through UI
6. Eventually deprecate the `base_size` field once all data is migrated

## Testing Checklist

- [x] Migration file created with proper schema
- [x] All CSV data imported correctly
- [x] Validation schema updated
- [x] Query functions created
- [x] Miniature form updated with dropdowns
- [x] Add miniature page includes base dropdowns
- [x] Edit miniature page includes base dropdowns
- [x] All dropdowns allow null values
- [x] No linter errors

## Files Modified

1. `/supabase/migrations/20240101000015_create_base_tables.sql` - New migration
2. `/src/lib/validations/miniature.ts` - Added base field validation
3. `/src/lib/queries/miniatures.ts` - Added base query functions
4. `/src/components/miniatures/miniature-form.tsx` - Updated UI with dropdowns
5. `/src/app/dashboard/collection/add/page.tsx` - Fetch and pass base data
6. `/src/app/dashboard/collection/[id]/edit/page.tsx` - Fetch and pass base data

## Migration Instructions

To apply the changes:

1. **Run the migration** (if using Supabase CLI):
   ```bash
   supabase db push
   ```

2. **Or manually apply the migration** in Supabase dashboard:
   - Go to SQL Editor
   - Copy contents of migration file
   - Run the SQL

3. **Verify the data**:
   - Check that all three tables are populated
   - Verify miniatures table has new columns
   - Test adding/editing miniatures with the new dropdowns

## Notes

- The three base fields are completely independent - users can set any combination
- Example: A miniature could have Base="32mm", Shape="Round", Type=null
- The order in forms is: Base → Base Shape → Base Type
- All dropdowns show options alphabetically by name
