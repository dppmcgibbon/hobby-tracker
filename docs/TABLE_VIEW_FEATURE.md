# Table View Feature

## Overview

Added a toggle button to switch between grid (card) view and table (minimal) view on the miniatures collection page. The table view provides a more compact, data-focused layout without photos.

## Features

### View Toggle Button
- Located in the top-right section of the page
- Two-button toggle with icons:
  - **Grid icon** (3x3 grid) - Card view
  - **List icon** (horizontal lines) - Table view
- Active view highlighted with gold (Warhammer theme)
- State persists during the session (component state)

### Grid View (Default)
- Original card-based layout
- Shows miniature photos
- Responsive grid: 1-4 columns depending on screen size
- Hover effects and duplicate button overlay
- Visual badges and status indicators

### Table View (New)
- Compact, data-focused layout
- No photos displayed
- Columns displayed (left to right):
  1. **Select** (checkbox - only when in selection mode)
  2. **Name** (clickable link + badges for Based/Magnetised)
  3. **Faction** (faction name or "-")
  4. **Unit Type** (unit type or "-")
  5. **Qty** (quantity, centered, gold color)
  6. **Status** (status badge with color)
  7. **Added** (date in short format)
  8. **Actions** (duplicate and edit buttons)

## Visual Design

### Warhammer Theme Integration
- Table uses `warhammer-card` styling
- Column headers in uppercase with gold color
- Border colors match theme (primary/30, primary/20)
- Hover effects on rows (muted background)
- Gold-colored quantity column
- Action buttons styled consistently

### Table Features
- Sortable columns (inherits from existing filters)
- Responsive design (may need horizontal scroll on mobile)
- Alternating row hover states
- Inline badges for Based/Magnetised status
- Compact action buttons (icon-only)

## User Experience

### Switching Views
1. Click the grid icon (top-right) for card view
2. Click the list icon (top-right) for table view
3. View preference maintained during session
4. All features work in both views:
   - Selection mode
   - Batch operations
   - Duplicate
   - Edit
   - Status badges

### When to Use Each View

**Grid View:**
- Visual browsing
- Seeing photos is important
- Fewer miniatures (better for scrolling)
- Mobile/tablet viewing
- More casual browsing

**Table View:**
- Data entry/management
- Comparing multiple miniatures
- Large collections (more miniatures visible)
- Desktop workflows
- Quick scanning of details
- No need to see photos

## Technical Implementation

### Components

**1. MiniatureTableView** (`src/components/miniatures/miniature-table-view.tsx`)
- Client component
- Uses shadcn Table components
- Accepts same props as card view
- Supports selection mode
- Integrates duplicate and edit actions
- Responsive table design

**2. CollectionClient** (`src/app/dashboard/collection/collection-client.tsx`)
- Added `viewMode` state ("grid" | "table")
- Toggle button group with icons
- Conditional rendering based on viewMode
- Maintains all existing functionality

### Data Flow
- Same data source for both views
- No additional API calls required
- Filtering works identically
- Selection mode compatible with both views

## Code Changes

### Files Modified
1. `src/app/dashboard/collection/collection-client.tsx`
   - Added view mode state
   - Added toggle buttons
   - Conditional rendering logic

### Files Created
2. `src/components/miniatures/miniature-table-view.tsx`
   - New table view component
   - Complete miniature listing with actions

## Benefits

1. **Flexibility** - Users can choose their preferred view
2. **Efficiency** - Table view shows more miniatures at once
3. **Data Focus** - Easier to scan details without photos
4. **Consistency** - All features work in both views
5. **Professional** - Table view feels more "business-like"

## Future Enhancements

Potential improvements:
- [ ] Persist view preference in localStorage
- [ ] Add column visibility toggles
- [ ] Column resizing
- [ ] Click column headers to sort
- [ ] Export table to CSV
- [ ] Compact/comfortable/spacious density options
- [ ] Custom column order
- [ ] Hide/show specific columns

## Accessibility

- Table has proper semantic HTML
- Column headers clearly labeled
- Keyboard navigation supported
- Focus states maintained
- Screen reader friendly structure

## Mobile Considerations

- Grid view recommended for mobile
- Table view may require horizontal scroll
- Toggle buttons are touch-friendly
- Consider detecting screen size for default view
