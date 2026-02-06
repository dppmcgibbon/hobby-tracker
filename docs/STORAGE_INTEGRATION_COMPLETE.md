# Storage Box Integration with Miniatures

## Summary
Storage boxes are now fully integrated with miniatures, allowing users to track where each miniature is stored. The feature is accessible through individual miniature forms and bulk operations.

## Database Changes

### Migration: `20240101000014_add_storage_to_miniatures.sql`
- Added `storage_box_id` column to `miniatures` table
- Added foreign key relationship to `storage_boxes` table
- Added index for efficient queries
- Storage box deletion sets miniature's `storage_box_id` to NULL (cascading)

## Features Added

### 1. Individual Miniature Management
**Files Updated:**
- `src/lib/validations/miniature.ts` - Added `storage_box_id` field to schema
- `src/components/miniatures/miniature-form.tsx` - Added storage box dropdown selector
- `src/lib/queries/miniatures.ts` - Added `getStorageBoxes()` helper function
- `src/app/dashboard/collection/add/page.tsx` - Fetches and passes storage boxes
- `src/app/dashboard/collection/[id]/edit/page.tsx` - Fetches and passes storage boxes

**Features:**
- Storage box selector appears in the form below the Faction selector
- Shows storage box name and location (if available)
- Option to select "No storage box" to clear the field
- Works for both creating new miniatures and editing existing ones

### 2. Bulk Operations
**Files Updated:**
- `src/app/actions/miniatures.ts` - Added `bulkUpdateStorageBox()` server action
- `src/components/miniatures/batch-operations-bar.tsx` - Added storage box bulk update UI
- `src/app/dashboard/collection/collection-client.tsx` - Passes storage boxes to batch bar
- `src/app/dashboard/collection/page.tsx` - Fetches storage boxes for batch operations

**Features:**
- New storage box selector in the batch operations bar
- Archive icon button to apply storage location to multiple miniatures
- Option to select "No storage box" to clear storage from selected miniatures
- Only appears when storage boxes exist

### 3. Backup Integration
**File Updated:**
- `src/app/actions/backup.ts` - Added `storage_boxes` table to backup process

**Features:**
- Storage boxes are now included in database backups
- Miniature records include their `storage_box_id` in backups

## Usage

### Setting Storage for Individual Miniatures
1. Navigate to add/edit miniature page
2. Select a storage box from the "Storage Location" dropdown
3. Dropdown shows: `Storage Box Name (Location)` if location is set
4. Select "No storage box" to remove storage assignment
5. Save the miniature

### Bulk Storage Assignment
1. Select multiple miniatures on the collection page
2. In the batch operations bar, click the storage dropdown
3. Select a storage box or "No storage box"
4. Click the Archive icon button to apply
5. Toast notification confirms the update

### Managing Storage Boxes
- Navigate to Admin → Storage Management
- Create, edit, and delete storage boxes
- When a storage box is deleted, miniatures are automatically unlinked (storage_box_id set to NULL)

## Admin Page Changes
The Admin page provides centralized access to:
- **Games Management** - Game systems, editions, expansions
- **Tags Management** - Custom tags for organization
- **Storage Management** - Storage boxes for physical organization

Navigation has been streamlined with Storage, Tags, and Games moved under the Admin section.

## Technical Details

### Database Schema
```sql
-- miniatures table now includes:
storage_box_id UUID REFERENCES storage_boxes(id) ON DELETE SET NULL
```

### Validation Schema
```typescript
export const miniatureSchema = z.object({
  // ... other fields
  storage_box_id: z.string().uuid("Invalid storage box").optional().nullable(),
});
```

### Server Actions
- `bulkUpdateStorageBox(miniatureIds, storageBoxId)` - Bulk assign storage box to miniatures
- Validates user ownership of both miniatures and storage boxes
- Supports null value to clear storage assignment

## Testing Checklist
- ✅ Create miniature with storage box
- ✅ Edit miniature to change storage box
- ✅ Remove storage box from miniature
- ✅ Bulk assign storage box to multiple miniatures
- ✅ Bulk remove storage box from multiple miniatures
- ✅ Storage boxes appear in database backups
- ✅ Storage box deletion properly unlinks miniatures
