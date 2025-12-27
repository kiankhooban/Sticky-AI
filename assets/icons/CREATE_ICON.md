# How to Create Your Menu Bar Icon

## Specifications:
- **Format:** PNG
- **Size:** 22x22 pixels (base) and 44x44 pixels (for retina @2x)
- **Colors:** Black shapes on transparent background
- **Style:** Simple, monochrome

## Using Figma/Sketch/Photoshop:
1. Create 22x22px canvas with transparent background
2. Draw a simple sticky note icon in BLACK
3. Keep it simple - a rounded rectangle with a folded corner works great
4. Export as PNG: `tray-icon.png` (22x22) and `tray-icon@2x.png` (44x44)

## Using Online Tools:
1. Go to https://www.photopea.com (free Photoshop alternative)
2. File → New → 22x22 pixels, transparent background
3. Draw black sticky note shape
4. Export as PNG

## Quick Design Ideas:
```
Simple sticky note shapes that work well:

1. Rectangle with folded corner:
   ■■■■■■■■■■■■■■■■■■■
   ■                ▢
   ■                 
   ■    NOTES        
   ■                 
   ■■■■■■■■■■■■■■■■■

2. Simple document icon:
   ■■■■■■■■■■■■■■
   ■            ■
   ■  ========  ■
   ■  ========  ■
   ■  ========  ■
   ■            ■
   ■■■■■■■■■■■■■■

3. Stack of notes:
   ■■■■■■■■■■■■■
    ■■■■■■■■■■■■
     ■■■■■■■■■■■
```

## Important:
- Use BLACK (#000000) for the icon shapes
- Use TRANSPARENT background
- Keep design simple - menu bar icons are tiny!
- Avoid thin lines (they disappear at 22x22)
- Test in both light and dark mode

## Save Location:
Save your icon as:
- `assets/icons/tray-icon.png` (22x22)
- `assets/icons/tray-icon@2x.png` (44x44) - optional but recommended for retina

## After Creating:
The app will automatically detect and use your PNG icon. Just restart:
```bash
npm start
```

You should see in the console:
```
[Menu Bar] Loaded icon from: /path/to/tray-icon.png
```

## Still Not Working?
If the icon doesn't appear:
1. Check file exists: `ls -la assets/icons/tray-icon.png`
2. Check file size: Should be ~500-2000 bytes for 22x22 PNG
3. Open the PNG in Preview to verify it has transparent background
4. Try removing template mode (edit menu-bar.js line with setTemplateImage)
