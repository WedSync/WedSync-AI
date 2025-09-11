# 04-design-customization.md

## What to Build

Visual customization interface for colors, fonts, layouts, and styling without requiring CSS knowledge.

## Key Technical Requirements

### Customization Schema

```
interface WebsiteDesign {
  couple_id: string
  theme: {
    primary_color: string
    secondary_color: string
    accent_color: string
    background_color: string
    text_color: string
  }
  typography: {
    heading_font: string
    body_font: string
    font_size_scale: number
  }
  layout: {
    header_style: 'centered' | 'left' | 'hero'
    navigation_position: 'top' | 'side'
    content_width: 'narrow' | 'medium' | 'wide'
  }
  custom_css?: string
}
```

### Style Editor Component

```
const DesignCustomizer = () => {
  const [design, setDesign] = useState(defaultDesign)
  const [preview, setPreview] = useState(true)
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1">
        <ColorPicker
          label="Primary Color"
          value={design.theme.primary_color}
          onChange={(color) => updateTheme('primary_color', color)}
        />
        <FontSelector
          options={googleFonts}
          value={design.typography.heading_font}
          onChange={(font) => updateTypography('heading_font', font)}
        />
      </div>
      <div className="col-span-2">
        <LivePreview design={design} />
      </div>
    </div>
  )
}
```

### CSS Generation

```
function generateCSS(design: WebsiteDesign): string {
  return `
    :root {
      --primary: ${design.theme.primary_color};
      --secondary: ${design.theme.secondary_color};
      --font-heading: '${design.typography.heading_font}';
      --font-body: '${design.typography.body_font}';
    }
  `
}
```

## Critical Implementation Notes

1. **Live preview updates** using CSS variables
2. **Google Fonts integration** with performance budgeting
3. **Preset color palettes** for quick selection
4. **Responsive preview** for mobile/tablet/desktop
5. **Undo/redo functionality** for design changes