# Favicon and App Icons

## Overview
The Hobby Tracker app now has a custom favicon and complete set of app icons featuring a paintbrush crossed with a miniature figure on a dark background with gold/brass metallic tones, matching the Warhammer-inspired aesthetic of the app.

## Files Created

### Favicon
- `/public/favicon.ico` - Main favicon (browser tab icon)

### Standard Web Icons
- `/public/icons/icon-16x16.png` - 16x16px (browser favicon)
- `/public/icons/icon-32x32.png` - 32x32px (browser favicon)

### PWA Icons (Progressive Web App)
- `/public/icons/icon-72x72.png` - 72x72px
- `/public/icons/icon-96x96.png` - 96x96px
- `/public/icons/icon-128x128.png` - 128x128px
- `/public/icons/icon-144x144.png` - 144x144px
- `/public/icons/icon-152x152.png` - 152x152px
- `/public/icons/icon-192x192.png` - 192x192px
- `/public/icons/icon-384x384.png` - 384x384px
- `/public/icons/icon-512x512.png` - 512x512px

### Apple/iOS Icons
- `/public/apple-touch-icon.png` - 180x180px (iOS home screen)

## Design Details

**Theme:** Miniature hobby/painting tracker
**Style:** Flat, minimalist design with high contrast
**Colors:** 
- Background: Dark (#1a1a1a to match app theme)
- Icon: Gold/brass metallic gradient (Imperial gold aesthetic)

**Elements:**
- Paintbrush crossed with armored miniature figure silhouette
- Clean, recognizable design that works at all sizes
- Matches the Warhammer-inspired theme of the app

## Implementation

### Metadata Configuration
The favicon is configured in `/src/app/layout.tsx` using Next.js metadata API:

```typescript
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  // ... other metadata
};
```

### PWA Manifest
All PWA icons are referenced in `/public/manifest.json` for Progressive Web App functionality.

## Browser Support

The icon set provides comprehensive coverage for:

✅ **Modern Browsers**
- Chrome, Firefox, Safari, Edge (via favicon.ico and PNG variants)

✅ **iOS/Safari**
- iPhone/iPad home screen icons (apple-touch-icon.png)
- Multiple sizes for different device resolutions

✅ **Android/Chrome**
- PWA installation icons from 72x72 to 512x512
- Home screen shortcuts

✅ **Windows**
- PWA tile icons

## Usage

### Development
The favicon will automatically appear in:
- Browser tabs when running the app
- Bookmarks
- Browser history
- PWA install prompts

### Production
When deployed, users will see the favicon in:
- Browser tabs
- Search results (some search engines)
- Social media link previews (with proper Open Graph tags)
- Mobile home screens when installed as PWA

## Updating the Favicon

If you need to update the favicon design:

1. Replace the source image at `/Users/daithi/.cursor/projects/Users-daithi-Development-hobby-db-hobby-tracker/assets/favicon.png`

2. Regenerate all sizes using macOS `sips` command:

```bash
cd public/icons

# Standard sizes
sips -z 16 16 source.png --out icon-16x16.png
sips -z 32 32 source.png --out icon-32x32.png

# PWA sizes
for size in 72 96 128 144 152 192 384 512; do
  sips -z $size $size source.png --out icon-${size}x${size}.png
done

# Apple touch icon
cd ../
sips -z 180 180 source.png --out apple-touch-icon.png

# Favicon.ico
cp source.png favicon.ico
```

3. Clear browser cache and restart dev server to see changes

## Technical Notes

- Icons use PNG format for better quality and alpha channel support
- All icons are square (1:1 aspect ratio) as per web standards
- Icons are optimized for display at small sizes with clear, bold shapes
- The design maintains visibility and recognition even at 16x16 pixels

## Related Files

- **Layout:** `/src/app/layout.tsx` - Favicon metadata configuration
- **Manifest:** `/public/manifest.json` - PWA icon definitions
- **Assets:** `/Users/daithi/.cursor/projects/Users-daithi-Development-hobby-db-hobby-tracker/assets/favicon.png` - Source image

## Testing

To verify the favicon is working:

1. **Browser Tab:** Check if the icon appears in browser tabs
2. **Bookmark:** Bookmark the page and check the icon
3. **PWA Install:** Test PWA installation on mobile device
4. **iOS Home Screen:** Add to home screen on iOS device
5. **Android Home Screen:** Install as PWA on Android device

All icons should display correctly across these scenarios.
