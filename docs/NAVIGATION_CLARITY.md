# Navigation Naming Clarity - Fixed

**Date:** February 2, 2026  
**Issue:** Navigation had both "Collection" and "Collections" which was confusing
**Solution:** Renamed "Collection" to "Miniatures" for clarity

## Problem

The navigation menu showed:
- 📦 **Collection**
- 📁 **Collections**

This was confusing because:
- Similar names, unclear distinction
- Hard to remember which is which
- Not immediately obvious what each does

## Solution

Renamed "Collection" to "Miniatures" to make the purpose clear.

**File:** `src/app/dashboard/layout.tsx`

### Navigation Menu Now:

1. 🏠 **Dashboard** - Overview and statistics
2. 📦 **Miniatures** ← **RENAMED** (was "Collection")
3. 📁 **Collections** - Organized groups
4. 📖 **Recipes** - Paint recipes
5. 🎨 **Paints** - Paint inventory

## Clear Purpose of Each Section

### 📦 Miniatures (`/dashboard/collection`)
**Purpose:** Browse and manage ALL your miniatures
- View your entire collection
- Search and filter
- Add new miniatures
- Edit/delete miniatures
- Batch operations (select multiple)
- Tag management

### 📁 Collections (`/dashboard/collections`)
**Purpose:** Organize miniatures into groups
- Create organized collections (like playlists)
- Group by army, project, status, etc.
- Add/remove miniatures from collections
- View collection details
- Color-coded for easy recognition

## Analogy

Think of it like a music app:
- **Miniatures** = Your entire music library
- **Collections** = Playlists you create

Or a file system:
- **Miniatures** = All your files
- **Collections** = Folders you organize them into

## User Flow

### Typical Usage:

1. **Add miniatures** via Miniatures page
2. **Create collections** for organization (e.g., "Tournament Army 2026")
3. **Assign miniatures** to collections
4. **View by collection** when you want to see a specific group
5. **View all miniatures** when you want to browse everything

## Benefits of New Naming

### Before (Confusing):
- ❓ "Is Collection my full collection or a specific collection?"
- ❓ "What's the difference between Collection and Collections?"
- ❓ "Which one should I click?"

### After (Clear):
- ✅ "Miniatures = view all my miniatures"
- ✅ "Collections = view my organized groups"
- ✅ "Dashboard = see overview stats"
- ✅ Clear, distinct purposes

## Alternative Names Considered

### For "All Miniatures" Page:
- ❌ "Collection" - Too similar to "Collections"
- ✅ **"Miniatures"** - Clear and specific ← **CHOSEN**
- ⚠️ "Library" - Less common in hobby context
- ⚠️ "Catalog" - Sounds read-only

### For "Organized Groups" Page:
- ❌ "Groups" - Too generic
- ❌ "Sets" - Ambiguous
- ✅ **"Collections"** - Clear purpose ← **KEPT**
- ⚠️ "Folders" - Too file-system-like

## No Breaking Changes

- ✅ URLs remain the same
- ✅ `/dashboard/collection` still works
- ✅ `/dashboard/collections` still works
- ✅ Only display name changed
- ✅ All functionality preserved

## Status

✅ **Navigation naming clarified**
✅ **"Collection" renamed to "Miniatures"**
✅ **Clear distinction between pages**
✅ **Better user experience**

The navigation is now clear and intuitive!
