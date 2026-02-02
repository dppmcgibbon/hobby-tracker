# Duplicate Miniature Feature

## Overview

Added the ability to duplicate miniatures with a single click. When duplicated, the miniature will have all the same properties except:
- Name will have " (Copy)" appended
- No photos will be attached (photos are unique to each miniature)
- A new UUID will be generated
- Status will be copied but completion date will be reset

## Changes Made

### 1. Server Action (`src/app/actions/miniatures.ts`)

Added `duplicateMiniature(id: string)` function:
- Fetches the original miniature data
- Copies all properties except ID, timestamps, and user_id
- Appends " (Copy)" to the name
- Creates a new miniature entry
- Copies the status (backlog, assembled, primed, painting, completed)
- Does NOT copy photos (intentional design decision)
- Redirects to the collection page after duplication

### 2. Duplicate Button Component (`src/components/miniatures/duplicate-miniature-button.tsx`)

New client component with:
- Copy icon from lucide-react
- Loading state during duplication
- Toast notifications for success/error
- Configurable variant and size props
- Optional label display
- Redirects to edit page after successful duplication

### 3. Miniature Detail Page (`src/app/dashboard/collection/[id]/page.tsx`)

- Added duplicate button to the header actions
- Positioned between "Back" and "Edit" buttons
- Uses outline variant for visual consistency

### 4. Miniature Card Component (`src/components/miniatures/miniature-card.tsx`)

- Added hover-activated duplicate button
- Appears in top-right corner on card hover
- Icon-only button (no label) to save space
- Prevents click propagation to avoid navigating when clicking duplicate
- Uses Warhammer theme styling

## User Experience

### From Collection List
1. Hover over any miniature card
2. Duplicate icon button appears in top-right corner
3. Click to duplicate
4. Toast notification confirms success
5. Redirected to edit page of the new copy to modify the name

### From Detail Page
1. View any miniature detail page
2. Click "Duplicate" button in header
3. Toast notification confirms success
4. Redirected to edit page of the new copy

## Technical Details

### Data Copied
- Name (with " (Copy)" suffix)
- Faction ID
- Unit type
- Quantity
- Material
- Base size
- Sculptor
- Year
- Notes
- Status (backlog/assembled/primed/painting/completed)
- Magnetised flag
- Based flag

### Data NOT Copied
- ID (new UUID generated)
- User ID (current user)
- Created/Updated timestamps (new timestamps)
- Photos (intentionally excluded)
- Completion date (reset even if status is "completed")

## Benefits

1. **Quick Entry**: Easily create multiple similar miniatures
2. **Consistency**: Maintain consistent data across similar units
3. **Time Saving**: No need to re-enter faction, unit type, etc.
4. **Flexibility**: Can edit the name and other details after duplication

## Use Cases

- Duplicating squad members (e.g., "Space Marine Tactical Marine 1", "Space Marine Tactical Marine 2")
- Creating variations of the same miniature with different paint schemes
- Adding more units to an existing army with similar properties
- Batch creating miniatures that share most attributes

## Future Enhancements

Potential improvements:
- [ ] Bulk duplicate with quantity selector
- [ ] Option to copy photos as well
- [ ] Duplicate with custom name in a dialog
- [ ] Duplicate into a specific collection
- [ ] Template system for common miniature types
