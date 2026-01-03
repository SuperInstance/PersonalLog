# Icon Generation Guide

PersonalLog uses a single SVG source file (`public/icon.svg`) to generate all required PWA icons and favicons.

## Quick Start

```bash
# Install sharp dependency (first time only)
npm install --save-dev sharp

# Generate all icons
npm run generate-icons
```

## Generated Icons

The script generates the following icon sizes:

- **PWA Icons**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- **Favicon sizes**: 16x16, 32x32, 48x48

All icons are generated from `public/icon.svg` and saved to the `public/` directory.

## Icon Sources

1. **SVG Source**: `public/icon.svg` - Edit this to change the icon design
2. **PNG Icons**: `public/icon-{size}x{size}.png` - Generated for PWA
3. **Favicons**: `public/favicon-{size}x{size}.png` - Generated for browsers

## Platform Support

### iOS
- Uses `/icon-192x192.png` as apple-touch-icon
- Specified in `src/app/layout.tsx`

### Android
- PWA manifest includes all icon sizes
- Supports both "any" and "maskable" purposes
- Maskable icons (192x192, 512x512) for adaptive icons

### Desktop Browsers
- SVG favicon for modern browsers: `/icon.svg`
- PNG favicons as fallback: `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`

## Updating Icons

1. Edit `public/icon.svg` with your design
2. Run `npm run generate-icons`
3. Test icons in different browsers
4. Commit the changes

## Icon Design

Current icon features:
- Modern chat bubble design
- Blue gradient background (#3b82f6 to #2563eb)
- White chat bubble with three blue dots (AI conversation)
- Subtle sparkle accents for "AI" feel
- Rounded corners (115px radius) for friendly look

## Troubleshooting

### sharp not found
```bash
npm install --save-dev sharp
```

### Icons not displaying
1. Clear browser cache
2. Check file paths in `public/manifest.json`
3. Verify icon metadata in `src/app/layout.tsx`
4. Run `npm run build` to regenerate assets

### Large file sizes
The generated icons should be under 500KB total. If larger:
- Check SVG complexity in `icon.svg`
- Optimize PNG compression
- Reduce color palette in SVG

## PWA Manifest

Icons are referenced in `public/manifest.json`:
- All sizes use `"purpose": "any"`
- 192x192 and 512x512 also use `"purpose": "maskable"` for Android adaptive icons

## Next Steps

After generating icons:
1. Test PWA installation on mobile devices
2. Verify icons in browser tab
3. Check home screen icons on iOS/Android
4. Validate manifest with [PWA Validator](https://www.pwabuilder.com/)
