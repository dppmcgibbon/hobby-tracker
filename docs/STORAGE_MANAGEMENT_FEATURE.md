# Storage Management Feature

## Overview

Added a Storage Management system to help users organize their miniatures by physical storage location. This allows tracking of storage boxes, shelves, and other physical containers.

## Features

### Navigation
- New "Storage" link in top navigation (between Collections and Tags)
- Uses Archive icon from lucide-react
- Follows Warhammer theme styling

### Storage Page (`/dashboard/storage`)
- Lists all storage boxes for the user
- Grid layout showing storage box cards
- Each card displays:
  - Box name (with Archive icon)
  - Location (optional)
  - Description (optional)
  - View Details and Edit buttons
- Empty state with call-to-action to create first box
- "Add Storage Box" button in header

### Add Storage Box (`/dashboard/storage/add`)
- Form to create new storage box with fields:
  - **Name** (required) - e.g., "Box A", "Shelf 1"
  - **Location** (optional) - e.g., "Garage shelf", "Closet"
  - **Description** (optional) - Additional notes
- Warhammer-themed form styling
- Success toast notification
- Redirects to storage list after creation

## Database Schema

### `storage_boxes` Table

```sql
CREATE TABLE storage_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes
- `storage_boxes_user_id_idx` - For efficient user queries
- `storage_boxes_name_idx` - For sorting by name

### Row Level Security
- Users can only view, create, update, and delete their own storage boxes
- Policies enforce user_id matching

## Files Created

### Pages
1. `/src/app/dashboard/storage/page.tsx` - Main storage list page
2. `/src/app/dashboard/storage/add/page.tsx` - Add storage box form

### Actions
3. `/src/app/actions/storage.ts` - Server actions for CRUD operations
   - `createStorageBox(data)`
   - `updateStorageBox(id, data)`
   - `deleteStorageBox(id)`

### Database
4. `/supabase/migrations/create_storage_boxes.sql` - Database migration

### Updated Files
5. `/src/app/dashboard/layout.tsx` - Added Storage navigation link

## Usage

### Creating a Storage Box
1. Navigate to Storage from top nav
2. Click "Add Storage Box"
3. Enter box name (required)
4. Optionally add location and description
5. Click "Create Storage Box"

### Viewing Storage Boxes
- Grid layout shows all boxes
- Click "View Details" to see full information
- Click "Edit" to modify box details

## Future Enhancements

Potential improvements:
- [ ] Assign miniatures to storage boxes
- [ ] Track capacity (number of miniatures per box)
- [ ] Search and filter storage boxes
- [ ] QR code labels for physical boxes
- [ ] Photos of storage boxes
- [ ] Compartment/section tracking within boxes
- [ ] Storage location hierarchy (Room > Shelf > Box)
- [ ] Export storage inventory
- [ ] Barcode scanning integration
- [ ] Color coding for different box types

## Integration Points

### Miniatures
Future integration will allow:
- Assigning miniatures to storage boxes
- Filtering miniatures by storage location
- Moving miniatures between boxes
- Tracking which box a miniature is in

### Collections
Collections could be linked to storage:
- Store entire collections in specific boxes
- Track which boxes contain which collections

## Styling

- Follows Warhammer theme with gold accents
- Uses `warhammer-card` styling for cards
- Archive icon represents storage concept
- Uppercase headers with tracking
- Gold glow effects on titles

## Database Migration

To apply the migration:

```bash
# If using Supabase CLI
supabase db push

# Or apply manually in Supabase dashboard SQL editor
# Run the contents of create_storage_boxes.sql
```

## Validation

Input validation:
- Name: 1-100 characters (required)
- Location: 0-200 characters (optional)
- Description: 0-500 characters (optional)

All validation handled by Zod schema in both client and server.

## Security

- Row Level Security enabled
- Users can only access their own storage boxes
- User ID automatically set from authenticated session
- Cascade delete when user account deleted
