# Storage Box Display and Persistence Fix

## Issue
Storage box assignments were not being persisted or displayed on miniature cards and details after updating them individually or in bulk.

## Root Cause
The database queries were not fetching the `storage_box` relationship data, even though the `storage_box_id` foreign key was being updated correctly in the database.

## Changes Made

### 1. **Updated Query Functions** (`src/lib/queries/miniatures.ts`)
- Added `storage_box:storage_boxes(*)` to the `getMiniatureById` query
- This ensures storage box details are fetched along with miniature data

### 2. **Updated Collection Page Query** (`src/app/dashboard/collection/page.tsx`)
- Added `storage_box_id` and `storage_box:storage_boxes (id, name, location)` to the miniatures query
- Now fetches storage box information for all miniatures in the collection list

### 3. **Updated Miniature Detail Page** (`src/app/dashboard/collection/[id]/page.tsx`)
- Added Storage Location section displaying:
  - Storage box name
  - Storage box location (if set)
  - Clickable link to storage box detail page
- Positioned between "Quantity" and "Base Size" fields

### 4. **Updated Miniature Card** (`src/components/miniatures/miniature-card.tsx`)
- Added `storage_box` to the TypeScript interface
- Displays storage box badge below status badge
- Shows box name with 📦 icon
- Badge format: "📦 Box Name"

### 5. **Updated Table View** (`src/components/miniatures/miniature-table-view.tsx`)
- Added `storage_box` to the TypeScript interface
- Added "Storage" column to the table
- Displays storage box name as clickable link
- Shows "-" when no storage box assigned
- Links directly to storage box detail page

## Display Locations

### Miniature Card View
- Storage box shown as a badge below the status badge
- Format: `📦 Box Name`

### Miniature Table View  
- Dedicated "Storage" column
- Shows box name as clickable link or "-" if unassigned

### Miniature Detail Page
- "Storage Location" field in the details section
- Shows: `Box Name (Location)` as a clickable link
- Positioned prominently in the miniature details

## How It Works Now

1. **Individual Updates**: When you edit a miniature and select a storage box, it saves correctly and displays on:
   - The miniature card (as a badge)
   - The miniature table view (as a column)
   - The miniature detail page (as a linked field)

2. **Bulk Updates**: When you select multiple miniatures and assign a storage box via the batch operations bar:
   - All selected miniatures are updated
   - Changes appear immediately after refresh
   - Storage boxes display on cards, tables, and detail pages

3. **Navigation**: Clicking on any storage box name/link takes you to:
   - Storage box detail page showing all miniatures in that box
   - Full box information (name, location, description)
   - Statistics about miniatures stored there

## Testing Checklist
✅ Individual miniature storage assignment displays on card
✅ Individual miniature storage assignment displays on detail page  
✅ Individual miniature storage assignment displays in table view
✅ Bulk storage assignment displays on all cards
✅ Bulk storage assignment displays on all detail pages
✅ Bulk storage assignment displays in table view
✅ Storage box links navigate correctly
✅ Clearing storage box (setting to null) works and displays correctly
