const sharp = require('sharp');
const fs = require('fs');

// 1920x1080 wallpaper
const width = 1920;
const height = 1080;

// Create base gradient - very light gray/white
const gradientBase = Buffer.alloc(width * height * 4);
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        // Light gradient from top-left to bottom-right
        const t = (x / width + y / height) / 2;
        gradientBase[i] = 248 - t * 15;     // R
        gradientBase[i + 1] = 250 - t * 15; // G
        gradientBase[i + 2] = 252 - t * 15; // B
        gradientBase[i + 3] = 255;          // A
    }
}

// Create an SVG overlay with geometric elements
const svgOverlay = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft blur filters -->
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="60" />
    </filter>
    <filter id="blur2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
    </filter>
    <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="80" />
    </filter>
    
    <!-- Grid pattern -->
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(59,130,246,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  
  <!-- Grid background -->
  <rect width="100%" height="100%" fill="url(#grid)" />
  
  <!-- Large soft orbs -->
  <circle cx="1700" cy="200" r="350" fill="rgba(59,130,246,0.06)" filter="url(#blur3)" />
  <circle cx="200" cy="900" r="300" fill="rgba(249,115,22,0.05)" filter="url(#blur3)" />
  <circle cx="960" cy="540" r="250" fill="rgba(16,185,129,0.04)" filter="url(#blur2)" />
  
  <!-- Geometric accents -->
  <rect x="1400" y="150" width="180" height="180" rx="20" 
        fill="none" stroke="rgba(59,130,246,0.12)" stroke-width="2" 
        transform="rotate(15 1490 240)" />
  
  <circle cx="250" cy="750" r="90" 
          fill="none" stroke="rgba(249,115,22,0.1)" stroke-width="2" />
  
  <rect x="1600" y="600" width="70" height="70" 
        fill="none" stroke="rgba(16,185,129,0.08)" stroke-width="2" 
        transform="rotate(45 1635 635)" />
  
  <!-- Small dots scattered -->
  <circle cx="300" cy="300" r="3" fill="rgba(148,163,184,0.4)" />
  <circle cx="500" cy="200" r="2" fill="rgba(148,163,184,0.35)" />
  <circle cx="700" cy="400" r="4" fill="rgba(148,163,184,0.3)" />
  <circle cx="900" cy="250" r="2" fill="rgba(148,163,184,0.4)" />
  <circle cx="1100" cy="350" r="3" fill="rgba(148,163,184,0.35)" />
  <circle cx="1300" cy="200" r="2" fill="rgba(148,163,184,0.3)" />
  <circle cx="1500" cy="450" r="3" fill="rgba(148,163,184,0.4)" />
  <circle cx="1700" cy="350" r="2" fill="rgba(148,163,184,0.35)" />
  <circle cx="1800" cy="500" r="4" fill="rgba(148,163,184,0.3)" />
  <circle cx="200" cy="500" r="3" fill="rgba(148,163,184,0.4)" />
  <circle cx="400" cy="600" r="2" fill="rgba(148,163,184,0.35)" />
  <circle cx="600" cy="700" r="3" fill="rgba(148,163,184,0.3)" />
  <circle cx="800" cy="800" r="2" fill="rgba(148,163,184,0.4)" />
  <circle cx="1000" cy="650" r="4" fill="rgba(148,163,184,0.35)" />
  <circle cx="1200" cy="750" r="3" fill="rgba(148,163,184,0.3)" />
  <circle cx="1400" cy="850" r="2" fill="rgba(148,163,184,0.4)" />
  <circle cx="1600" cy="700" r="3" fill="rgba(148,163,184,0.35)" />
  <circle cx="1800" cy="800" r="2" fill="rgba(148,163,184,0.3)" />
  <circle cx="100" cy="700" r="3" fill="rgba(148,163,184,0.4)" />
  <circle cx="300" cy="850" r="2" fill="rgba(148,163,184,0.35)" />
  <circle cx="500" cy="950" r="4" fill="rgba(148,163,184,0.3)" />
  <circle cx="700" cy="1000" r="2" fill="rgba(148,163,184,0.4)" />
  <circle cx="900" cy="900" r="3" fill="rgba(148,163,184,0.35)" />
  <circle cx="1100" cy="950" r="2" fill="rgba(148,163,184,0.3)" />
  <circle cx="1300" cy="1000" r="3" fill="rgba(148,163,184,0.4)" />
  <circle cx="1500" cy="950" r="2" fill="rgba(148,163,184,0.35)" />
  
  <!-- Subtle lines -->
  <line x1="0" y1="200" x2="400" y2="200" stroke="rgba(59,130,246,0.05)" stroke-width="1" />
  <line x1="1500" y1="800" x2="1920" y2="800" stroke="rgba(249,115,22,0.04)" stroke-width="1" />
  <line x1="600" y1="0" x2="600" y2="300" stroke="rgba(16,185,129,0.04)" stroke-width="1" />
</svg>
`;

// Composite the base with the SVG overlay
sharp(gradientBase, { raw: { width, height, channels: 4 } })
    .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
    }])
    .png({ compressionLevel: 9 })
    .toFile('walt-wallpaper.png')
    .then(() => {
        console.log('Wallpaper created: walt-wallpaper.png (1920x1080)');
        console.log('Location: C:\\Users\\Walt\\Desktop\\BlueCollarClaw\\walt-wallpaper.png');
    })
    .catch(err => {
        console.error('Error:', err);
    });
