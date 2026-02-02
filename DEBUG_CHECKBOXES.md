# Debugging: Checkboxes Not Visible

## Current Status

I've added extensive debugging and made the checkboxes MUCH more visible. Here's what to check:

## Step 1: Open Browser Console

1. Open your browser to `/dashboard/collection`
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Keep it open

## Step 2: Click "Select Multiple"

Click the "Select Multiple" button and look for these console logs:

### Expected Console Output:

```
🔄 TOGGLING SELECTION MODE: { from: false, to: true }
📦 CollectionClient render: { selectionMode: true, selectedIdsCount: 0, miniaturesCount: 2 }
MiniatureCard abc123: { selectable: true, selected: false }
MiniatureCard def456: { selectable: true, selected: false }
```

## Step 3: Visual Indicators

After clicking "Select Multiple", you should see:

### 1. Button Changes
- ✅ Button text changes to "Cancel Selection"
- ✅ Button style changes (becomes filled/solid)

### 2. Cards Show "Selectable" Badge
- ✅ Each card should show a **"Selectable"** badge in the **top-right corner**
- ✅ This is a DEBUG indicator to prove selectable=true

### 3. Checkboxes Appear
- ✅ **Top-left corner** of each card
- ✅ **White background** (or dark gray in dark mode)
- ✅ **Blue border** (primary color)
- ✅ **Shadow** around the checkbox
- ✅ **Larger padding** (p-2) - easier to see

## Step 4: Test Checkbox

1. Click on the checkbox (NOT the card)
2. Console should show:
   ```
   Checkbox wrapper clicked
   Checkbox changed: { miniatureId: 'abc123', checked: true }
   ```
3. Checkbox should become checked
4. Bottom bar should appear with "1 selected"

## Troubleshooting

### Issue 1: No Console Logs at All

**Problem:** Console is empty when you click "Select Multiple"

**Solutions:**
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
2. Clear cache and hard reload
3. Check if JavaScript is enabled
4. Try incognito/private window

### Issue 2: Console Shows selectionMode: false

**Problem:** Logs show `selectionMode: false` even after clicking

**Check:**
```
📦 CollectionClient render: { selectionMode: false, ... }
```

**Solutions:**
1. The button click handler might not be working
2. Check if there's a JavaScript error above in console
3. Check if button is actually clickable (not covered by something)

### Issue 3: Console Shows selectionMode: true but No "Selectable" Badge

**Problem:** Mode is true but cards don't update

**Check:**
- Do you see `MiniatureCard xyz: { selectable: true, ... }` logs?
- If NO → The prop isn't being passed correctly
- If YES → The component is rendering but checkbox not visible

**Solutions:**
1. Inspect element on a card
2. Look for a div with class "Selectable" in top-right
3. Look for a div with class "absolute top-2 left-2" in top-left

### Issue 4: "Selectable" Badge Visible but No Checkbox

**Problem:** You see "Selectable" but no checkbox

**This means:**
- ✅ Selection mode IS working
- ✅ Props ARE being passed
- ❌ Checkbox rendering has an issue

**Solutions:**
1. Inspect element on the top-left corner
2. Check if the checkbox div exists in HTML
3. Check computed styles (might be hidden)
4. Check z-index conflicts

### Issue 5: Checkbox Exists in HTML but Not Visible

**Check DevTools Elements:**
1. Right-click on top-left of card → Inspect
2. Look for: `<div class="absolute top-2 left-2 z-50 bg-white..."`
3. If it exists but not visible:
   - Check if it has `display: none`
   - Check if it has `opacity: 0`
   - Check if it's positioned off-screen
   - Check if another element covers it

## What I Changed

### 1. Made Checkbox MUCH More Visible
```tsx
// OLD
className="absolute top-2 left-2 z-20 bg-background rounded-md p-1 shadow-md"

// NEW - More visible
className="absolute top-2 left-2 z-50 bg-white dark:bg-gray-800 rounded-md p-2 shadow-lg border-2 border-primary"
```

Changes:
- ✅ z-50 instead of z-20 (higher priority)
- ✅ bg-white instead of bg-background (explicit color)
- ✅ p-2 instead of p-1 (larger padding)
- ✅ shadow-lg instead of shadow-md (more prominent)
- ✅ border-2 border-primary (blue border)

### 2. Added "Selectable" Debug Badge
```tsx
{selectable && (
  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl z-40">
    Selectable
  </div>
)}
```

This badge appears in the **top-right** of each card when selection mode is active.

### 3. Added Console Logs Everywhere
- When selection mode toggles
- When CollectionClient renders
- When each MiniatureCard renders
- When checkbox wrapper is clicked
- When checkbox value changes

## Next Steps

1. **Open browser console**
2. **Click "Select Multiple"**
3. **Copy ALL console output**
4. **Take screenshot showing:**
   - The button state
   - The cards (showing if "Selectable" badge appears)
   - Where you expect checkboxes to be
5. **Share the console output and screenshot**

This will help me understand exactly what's happening!
