# 02-content-pages.md

## What to Build

Create editable content sections for essential wedding information pages including Our Story, Event Details, Travel, and Registry.

## Key Technical Requirements

### Database Schema

```
interface WebsitePage {
  id: string
  couple_id: string
  page_type: 'story' | 'events' | 'travel' | 'registry' | 'custom'
  title: string
  slug: string
  content: ContentBlock[]
  is_published: boolean
  meta_description?: string
}

interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'gallery' | 'map' | 'timeline'
  content: any // JSON based on type
  order: number
}
```

### Page Editor Component

```
const PageEditor = ({ page }) => {
  const [blocks, setBlocks] = useState(page.content)
  
  return (
    <DndContext onDragEnd={handleReorder}>
      <SortableContext items={blocks}>
        {[blocks.map](http://blocks.map)(block => (
          <ContentBlockEditor
            key={[block.id](http://block.id)}
            block={block}
            onUpdate={updateBlock}
            onDelete={deleteBlock}
          />
        ))}
      </SortableContext>
      <AddBlockButton onAdd={addNewBlock} />
    </DndContext>
  )
}
```

### Content Types

```
const contentTypes = {
  story: ['heading', 'paragraph', 'image', 'timeline'],
  events: ['ceremony', 'reception', 'map', 'schedule'],
  travel: ['hotels', 'airports', 'directions', 'attractions'],
  registry: ['links', 'message', 'charity']
}
```

## Critical Implementation Notes

1. **Use Tiptap editor** for rich text editing
2. **Auto-save drafts** every 30 seconds
3. **Image optimization** on upload (max 1MB, WebP conversion)
4. **Import from Core Fields** for venue and date information
5. **Preview mode** shows exact guest view