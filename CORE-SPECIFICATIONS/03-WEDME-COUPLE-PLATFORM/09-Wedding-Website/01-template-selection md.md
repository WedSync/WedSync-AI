# 01-template-selection.md

## What to Build

Template gallery interface where couples choose from 5-10 pre-designed wedding website themes with live preview and instant customization.

## Key Technical Requirements

### Template Structure

```
interface WebsiteTemplate {
  id: string
  name: string
  preview_url: string
  thumbnail: string
  category: 'classic' | 'modern' | 'rustic' | 'elegant' | 'fun'
  color_schemes: ColorScheme[]
  layout_options: LayoutConfig
  default_sections: string[]
}

interface TemplateSelection {
  couple_id: string
  template_id: string
  customizations: {
    primary_color: string
    secondary_color: string
    font_family: string
    layout_style: string
  }
}
```

### API Endpoints

```
// GET /api/wedme/website/templates
// Returns all available templates with previews

// POST /api/wedme/website/select-template
// Body: { template_id, initial_customizations }
```

### React Component

```
const TemplateGallery = () => {
  const [preview, setPreview] = useState(null)
  const [customizing, setCustomizing] = useState(false)
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {[templates.map](http://templates.map)(template => (
        <TemplateCard
          key={[template.id](http://template.id)}
          onPreview={() => setPreview(template)}
          onSelect={() => applyTemplate(template)}
        />
      ))}
    </div>
  )
}
```

## Critical Implementation Notes

1. **Lazy load template previews** using Intersection Observer
2. **Cache template assets** in browser storage
3. **Show live preview** in iframe with instant color changes
4. **Mobile-first responsive** previews
5. **Include starter content** relevant to wedding type