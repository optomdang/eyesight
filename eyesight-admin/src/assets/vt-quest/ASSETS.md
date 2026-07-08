# VT Quest — Asset Style Guide

## Asset Inventory

| File | World | Description |
|------|-------|-------------|
| `planets/planet-gabor.png` | Gabor (Hành tinh Sáng) | Golden/orange planet with rings and sparkles |
| `planets/planet-vernier.png` | Vernier (Hành tinh Chính xác) | Teal/cyan planet with glowing ring and light beams |
| `planets/planet-crowding.png` | Crowding (Hành tinh Đám đông) | Purple planet with swirls, smile, and ring |
| `mascot/astronaut.png` | Global | Cute robot astronaut with blue eyes, waving |

## Regeneration Prompts

### Gabor Planet (planet-gabor.png)
```
Cute cartoon planet for kids vision therapy game, space theme, soft 3D sphere with glowing rings.
The planet has warm golden yellow and orange gradient surface with swirling patterns, sparkle stars
around it, flat vector art style, vibrant pastel colors, friendly and welcoming look for children
aged 6-12. Simple ring tilted at 15 degrees. No text, no characters, no copyrighted designs.
White/transparent background. 512x512, clean edges.
```

### Vernier Planet (planet-vernier.png)
```
Cute cartoon planet for kids vision therapy game, space theme. Teal and cyan colored sphere with
ocean-like surface patterns, glowing ring around it, sparkle stars and light beams around edges.
Soft 3D flat vector art style for children. Clean simple design, friendly and bright.
Blue-green gradient, no text, no characters, transparent background, 512x512.
```

### Crowding Planet (planet-crowding.png)
```
Cute cartoon planet for kids vision therapy game, space theme. Purple and violet colored sphere
with cosmic nebula swirl patterns on surface, glowing purple ring around it, sparkle stars around.
Soft 3D flat vector art style for children aged 6-12. Vibrant purple-violet gradient, friendly look,
no text, no copyrighted characters, transparent white background, 512x512.
```

### Mascot Astronaut (mascot/astronaut.png)
```
Cute friendly cartoon astronaut robot mascot for kids vision eye therapy game. Small round helmet
with big visor showing happy eyes, compact chubby space suit in white and blue, little rocket boots,
waving hello. Flat vector style illustration, no text, original design not resembling any copyrighted
characters, white transparent background, 512x512.
```

## Style Guide

- **Style**: Flat vector / soft 3D, glossy sheen, cartoon children's book style
- **Palette**: Pastel cosmic — gold `#FFD93D`, teal `#4ECDC4`, purple `#6C5CE7`, white accents
- **No text**: All UI text is added via React/CSS — images are text-free
- **No IP**: Must not resemble Disney, Nintendo, Pixar, or other copyrighted characters
- **Background**: Transparent PNG for all assets (white checkerboard = transparent)
- **Size**: 512×512px original; displayed at 80–120px in UI (CSS scales cleanly)

## Post-processing (required after AI generation)

AI images often export as **RGB with a painted checkerboard** (not real transparency).
Run this once after adding/replacing PNGs:

```bash
cd eyesight-admin
python3 scripts/process-vt-assets.py
```

Requires: `pip install pillow numpy` (usually already available on macOS).

## Usage in Code

```tsx
import planetGabor from 'src/assets/vt-quest/planets/planet-gabor.png';
import planetVernier from 'src/assets/vt-quest/planets/planet-vernier.png';
import planetCrowding from 'src/assets/vt-quest/planets/planet-crowding.png';
import mascotAstronaut from 'src/assets/vt-quest/mascot/astronaut.png';
```
