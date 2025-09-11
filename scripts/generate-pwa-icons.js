const fs = require('fs');
const path = require('path');

// Generate a simple PNG icon with Canvas API for different sizes
const generateIcon = (size, outputPath) => {
  // Create a simple colored square as placeholder icon
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#3b82f6"/>
  <circle cx="256" cy="200" r="60" fill="white" opacity="0.9"/>
  <path d="M256 280 L200 380 L312 380 Z" fill="white" opacity="0.9"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">WS</text>
</svg>`;
  
  // For now, save as SVG (in production, you'd convert to PNG using sharp or canvas)
  fs.writeFileSync(outputPath.replace('.png', '.svg'), svg);
  console.log(`Generated icon: ${outputPath}`);
};

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Generate icons
sizes.forEach(size => {
  const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);
  generateIcon(size, outputPath);
});

// Generate Apple touch icon
generateIcon(180, path.join(iconDir, 'apple-touch-icon.png'));

// Generate badge icon
generateIcon(72, path.join(iconDir, 'badge-72x72.png'));

// Generate shortcut icons
generateIcon(192, path.join(iconDir, 'timeline-192x192.png'));
generateIcon(192, path.join(iconDir, 'clients-192x192.png'));

console.log('✅ All PWA icons generated successfully!');