# PWA Icons Setup

## Missing Icons

The PWA manifest (`public/manifest.json`) references icon files that need to be created:

### Required Icons (in `/public/icons/` directory):
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Screenshots (in `/public/screenshots/` directory):
- desktop-1.png (1280x720)
- mobile-1.png (750x1334)

## How to Generate Icons

### Option 1: Using a PWA Icon Generator
1. Create a base icon (512x512 PNG recommended)
2. Use a tool like:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
   - https://favicon.io/

### Option 2: Manual Creation
1. Create a 512x512 base icon with your app logo
2. Use an image editor (Photoshop, GIMP, etc.) to resize to each required size
3. Ensure icons have appropriate padding for "maskable" purpose

### Option 3: Using Next.js favicon.ico
You can temporarily use the existing favicon.ico by converting it to PNG format at different sizes.

## Temporary Workaround

Until icons are created, the PWA will still work but:
- May show default browser icon
- Install prompt might not show ideal icon
- Home screen icon may be generic

The core PWA functionality (offline caching, standalone mode) will work regardless of icon availability.

## Current Status

✅ Manifest configured (`public/manifest.json`)
✅ Service worker implemented (`public/sw.js`)
✅ PWA metadata in layout (`src/app/layout.tsx`)
❌ Icon files need to be created
❌ Screenshot files optional (for enhanced install prompt)

## Next Steps

1. Design an app icon (512x512 recommended size)
2. Generate all required sizes
3. Place in `/public/icons/` directory
4. Optionally add screenshots for better PWA install experience
