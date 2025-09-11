# 03-portfolio-management.md

## What to Build

A comprehensive portfolio management system for suppliers to showcase their work with smart organization and optimization.

## Key Technical Requirements

### Portfolio Structure

```
interface Portfolio {
  supplier_id: string;
  hero_gallery: GalleryImage[];
  featured_work: FeaturedWork[];
  categories: PortfolioCategory[];
  stats: PortfolioStats;
}

interface GalleryImage {
  id: string;
  original_url: string;
  optimized_urls: OptimizedImage[];
  alt_text: string;
  caption?: string;
  tags: string[];
  upload_date: Date;
  is_hero: boolean;
  sort_order: number;
  venue?: string;
  wedding_date?: Date;
  couple_names?: string;
}

interface FeaturedWork {
  id: string;
  title: string;
  description: string;
  images: GalleryImage[];
  venue_name: string;
  wedding_date: Date;
  style_tags: string[];
  is_featured: boolean;
}
```

### Smart Organization Features

1. **Auto-tagging System**
    - AI-powered image recognition
    - Venue detection from EXIF data
    - Style classification (modern, rustic, elegant)
    - Season detection from date/colors
2. **Gallery Categories**
    - Ceremony photos
    - Reception images
    - Portrait sessions
    - Detail shots
    - Venue-specific collections
3. **Performance Optimization**
    - WebP conversion with fallbacks
    - Lazy loading implementation
    - CDN distribution
    - Progressive image loading

## Critical Implementation Notes

### Image Processing Pipeline

```
export async function processPortfolioUpload(files: File[], supplierId: string) {
  const results = [];
  
  for (const file of files) {
    // Validate file
    if (!isValidImageFile(file)) continue;
    
    // Extract metadata
    const metadata = await extractImageMetadata(file);
    
    // Generate optimized versions
    const optimized = await generateOptimizedImages(file);
    
    // AI analysis for auto-tagging
    const aiTags = await analyzeImageContent(file);
    
    // Save to database
    const galleryImage = await saveGalleryImage({
      supplier_id: supplierId,
      original_url: optimized.original,
      optimized_urls: optimized.variants,
      alt_text: generateAltText(aiTags),
      tags: aiTags.tags,
      venue: metadata.venue,
      wedding_date: [metadata.date](http://metadata.date)
    });
    
    results.push(galleryImage);
  }
  
  return results;
}
```

### Drag & Drop Organization

```
// React component for portfolio management
export function PortfolioManager({ supplierId }: Props) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const reorderedImages = reorder(
      images,
      result.source.index,
      result.destination.index
    );
    
    setImages(reorderedImages);
    updateImageOrder(reorderedImages);
  }, [images]);
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="portfolio">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {[images.map](http://images.map)((image, index) => (
              <PortfolioImageCard
                key={[image.id](http://image.id)}
                image={image}
                index={index}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

### SEO Optimization

- Automatic alt text generation
- Structured data markup
- Image sitemaps
- Social media meta tags
- Caption optimization for keywords

### Storage & CDN

```
// Upload to CDN with multiple formats
export async function uploadToCloudinary(file: File): Promise<CloudinaryResult> {
  return cloudinary.uploader.upload(file, {
    folder: 'wedding-portfolios',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1200, height: 800, crop: 'limit' }
    ],
    eager: [
      { width: 300, height: 200, crop: 'thumb' },
      { width: 600, height: 400, crop: 'fill' },
      { width: 1200, height: 800, crop: 'limit' }
    ]
  });
}
```