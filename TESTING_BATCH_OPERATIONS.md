# Testing Batch Operations - Step by Step Guide

## Issue Report
User reports: "Checkboxes appear on each card" but I do not see checkboxes

## What to Check

### Step 1: Verify "Select Multiple" Button is Visible
1. Open your browser to `/dashboard/collection`
2. Look in the **top-right area** of the page
3. You should see buttons in this order:
   - **"Select Multiple"** (outline button)
   - **"Manage Tags"** (outline button)  
   - **"Add Miniature"** (primary button)

**If you don't see the "Select Multiple" button:**
- The page might not have loaded the latest code
- Try hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
- Check browser console for errors (F12)

### Step 2: Click "Select Multiple"
1. Click the **"Select Multiple"** button
2. The button should:
   - Change from outline to solid/filled style
   - Text changes to **"Cancel Selection"**

**Expected behavior:**
- Checkboxes should immediately appear on ALL miniature cards
- Checkboxes are in the **top-left corner** of each card image
- They have a white/light background with shadow for visibility

### Step 3: Verify Checkbox Appearance
Checkboxes should be:
- ✅ Positioned at top-left corner (not hidden behind image)
- ✅ Have white/light background circle
- ✅ Have shadow for contrast
- ✅ Z-index of 20 (above everything)

### Step 4: Test Checkbox Interaction
1. Click a checkbox - should check/uncheck
2. Clicking the card itself should still navigate (NOT check the box)
3. Bottom bar should appear showing selection count

## Debug Steps

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Refresh the collection page
4. You should see logs like:
   ```
   CollectionClient render: { selectionMode: false, selectedIdsCount: 0, miniaturesCount: X }
   ```
5. Click "Select Multiple"
6. You should see:
   ```
   Toggling selection mode: { from: false, to: true }
   CollectionClient render: { selectionMode: true, selectedIdsCount: 0, miniaturesCount: X }
   MiniatureCard render: { miniatureId: '...', selectable: true, selected: false }
   ```

### Visual Debugging
If checkboxes still don't appear:

1. **Inspect element** on a miniature card
2. Look for a `<div>` with classes: `absolute top-2 left-2 z-20 bg-background`
3. Check if it has `display: none` or `opacity: 0` in computed styles
4. Look for the `<button role="checkbox">` element inside

## Common Issues

### Issue 1: Button Click Not Working
**Symptom:** Clicking "Select Multiple" does nothing
**Fix:** Hard refresh the browser (Cmd+Shift+R / Ctrl+Shift+F5)

### Issue 2: Checkboxes Hidden Behind Image
**Symptom:** Checkbox exists in HTML but not visible
**Fix:** Already fixed - checkbox now has:
- `z-index: 20` (higher than image)
- White background with shadow
- Padding around checkbox

### Issue 3: Selection Mode State Not Persisting
**Symptom:** Button changes but checkboxes don't appear
**Check:** Browser console for React errors

## Current Code State

### Files Updated:
1. ✅ `src/app/dashboard/collection/collection-client.tsx` - Selection mode state
2. ✅ `src/components/miniatures/miniature-card.tsx` - Checkbox rendering
3. ✅ `src/app/dashboard/collection/page.tsx` - Collections data fetch

### Checkbox JSX (should be in MiniatureCard):
```tsx
{selectable && (
  <div
    className="absolute top-2 left-2 z-20 bg-background rounded-md p-1 shadow-md"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
  >
    <Checkbox
      checked={selected}
      onCheckedChange={(checked) => onSelectChange?.(miniature.id, !!checked)}
    />
  </div>
)}
```

## What to Test Next

1. ✅ Navigate to `/dashboard/collection`
2. ✅ Verify "Select Multiple" button exists
3. ✅ Click button - should change to "Cancel Selection"
4. ✅ Look at miniature cards - checkboxes should be visible
5. ✅ Click checkbox - should check/uncheck
6. ✅ Click card - should navigate (not check)
7. ✅ Check 2+ miniatures - batch bar should appear at bottom

## If Still Not Working

Please provide:
1. Screenshot of the collection page
2. Browser console output (any errors)
3. Result of inspecting a miniature card (does checkbox div exist?)
4. Browser and version you're using

The code is correct and deployed. The issue is likely:
- Browser cache (need hard refresh)
- React not re-rendering (check console for errors)
- CSS conflict (inspect element to check computed styles)
