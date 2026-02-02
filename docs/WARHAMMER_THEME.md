# Warhammer-Inspired Theme Implementation

## Overview

The Hobby Tracker has been transformed with a professional, grimdark Warhammer-inspired aesthetic that reflects the militaristic and gothic nature of the Warhammer universe.

## Design Philosophy

### Color Palette

**Primary Colors:**
- **Imperial Gold** (`hsl(43, 96%, 56%)`) - Used for primary actions, highlights, and important elements
- **Deep Black** (`hsl(0, 0%, 7%)`) - Background color for that grimdark atmosphere
- **Blood Red** (`hsl(0, 65%, 35%)`) - Secondary accent for warnings and critical elements
- **Bronze/Brass** (`hsl(30, 50%, 45%)`) - Tertiary accent for complementary highlights
- **Steel Gray** (`hsl(0, 0%, 45%)`) - Muted elements and borders

**Semantic Colors:**
- Borders use subtle metallic tones with transparency
- Cards have a battle-worn, metallic appearance
- Text uses warm off-white for better contrast on dark backgrounds

### Typography

**Style Guidelines:**
- All headings use **uppercase** with increased **letter spacing** (tracking)
- Bold, heavy font weights for militaristic feel
- "Command Center" instead of "Dashboard"
- "Army" instead of "Miniatures"
- "Legions" instead of "Collections"
- "Arsenal" instead of "Paints"
- "Codex" instead of "Recipes"
- "Systems" instead of "Games"

### Visual Elements

**Cards:**
- Dark, metallic gradient backgrounds
- Subtle shadow effects for depth
- Border glows on hover (gold accent)
- Sharp corners (minimal border radius)

**Buttons:**
- Imperial gold primary buttons with black text
- Uppercase text with letter spacing
- Shadow and glow effects on hover
- Metallic gradient backgrounds

**Navigation:**
- Sticky header with backdrop blur
- Gold accent on logo with shadow glow
- Hover states with gold borders and background tint
- Square avatar with gold gradient

**Charts:**
- Warhammer-themed color scheme
- Dark backgrounds with gold accents
- Styled tooltips matching theme
- Bold, uppercase labels

### Special Effects

**Background Texture:**
- Subtle repeating line pattern for texture
- Applied via `.warhammer-bg` class

**Gold Glow:**
- Text shadow effect for important headings
- Applied via `.gold-glow` class

**Metallic Cards:**
- Pre-built card styling with `.warhammer-card` class
- Includes gradient, borders, and shadows

**Imperial Dividers:**
- Decorative dividers with sword icons
- Gold gradient line
- Applied via `.imperial-divider` class

## Component Updates

### Pages Updated:
- ✅ Root Layout (`src/app/layout.tsx`) - Dark mode enabled, Warhammer background
- ✅ Dashboard Layout (`src/app/dashboard/layout.tsx`) - Gothic header, renamed navigation
- ✅ Dashboard Page (`src/app/dashboard/page.tsx`) - Battle-themed stats and terminology
- ✅ Login Page (`src/app/auth/login/page.tsx`) - Styled auth cards
- ✅ Signup Page (`src/app/auth/signup/page.tsx`) - Styled auth cards
- ✅ Auth Layout (`src/app/auth/layout.tsx`) - Atmospheric background with decorative corners

### Components Updated:
- ✅ Recent Activity (`src/components/dashboard/recent-activity.tsx`) - Warhammer styling
- ✅ Status Distribution Chart (`src/components/dashboard/status-distribution-chart.tsx`) - Theme colors
- ✅ Faction Breakdown Chart (`src/components/dashboard/faction-breakdown-chart.tsx`) - Theme colors
- ✅ Completion Chart (`src/components/dashboard/completion-chart.tsx`) - Theme colors

### Configuration Files:
- ✅ Global CSS (`src/app/globals.css`) - Complete color system, custom classes
- ✅ Tailwind Config (`tailwind.config.ts`) - Custom shadows, gradients, utilities

## CSS Classes Reference

### Utility Classes

```css
/* Background texture */
.warhammer-bg

/* Gold glow effect on text */
.gold-glow

/* Pre-styled card */
.warhammer-card

/* Imperial divider with sword icons */
.imperial-divider

/* Metallic border effect */
.metallic-border

/* Primary button styling */
.btn-warhammer-primary
```

### Custom Shadows

```css
shadow-warhammer      /* Standard card shadow */
shadow-warhammer-lg   /* Larger card shadow */
shadow-gold           /* Gold glow effect */
shadow-gold-strong    /* Stronger gold glow */
```

### Custom Gradients

```css
bg-metallic-gradient  /* Steel metallic gradient */
bg-gold-gradient      /* Imperial gold gradient */
bg-steel-gradient     /* Dark steel gradient */
```

## Terminology Changes

| Old Term | New Term | Context |
|----------|----------|---------|
| Dashboard | Command Center | Main page title |
| Miniatures | Army | Collection items |
| Collections | Legions | Grouped collections |
| Paints | Arsenal | Paint inventory |
| Recipes | Codex | Painting recipes |
| Games | Systems | Game systems |
| Total Miniatures | Total Forces | Stats card |
| Completed | Battle Ready | Stats card |
| Collection Progress | Campaign Progress | Progress section |
| Recent Activity | Recent Activity | Activity feed (kept same) |
| Status Distribution | Force Composition | Chart title |
| Faction Breakdown | Army Distribution | Chart title |
| Progress Over Time | Campaign Progress | Chart title |

## Design Principles

1. **Professional & Military** - Bold, confident, authoritative
2. **Gothic & Dark** - Deep shadows, metallic accents
3. **Imperial Aesthetic** - Gold as the mark of honor and achievement
4. **Battle-Worn** - Subtle textures, layered shadows
5. **Grimdark Atmosphere** - Dark backgrounds, dramatic lighting

## Future Enhancements

Potential additions to enhance the Warhammer theme further:

- [ ] Custom fonts (e.g., more gothic/military typefaces)
- [ ] Animated backgrounds (subtle particle effects)
- [ ] More elaborate decorative elements (skulls, eagles, iconography)
- [ ] Sound effects for button clicks (optional)
- [ ] Loading animations with Imperial symbols
- [ ] Battle damage overlays on cards
- [ ] Faction-specific color themes
- [ ] Parchment texture for recipe/codex pages

## Accessibility Notes

While the theme is dark and atmospheric:
- Text maintains WCAG AA contrast ratios
- Gold primary color is bright enough for visibility
- Interactive elements have clear hover states
- Focus states maintain visibility
- Color is not the only indicator of state

## Browser Support

Theme uses modern CSS features:
- CSS custom properties (CSS variables)
- backdrop-filter for blur effects
- HSL color space
- CSS gradients
- Modern box-shadow syntax

Fully supported in all modern browsers (Chrome, Firefox, Safari, Edge).
