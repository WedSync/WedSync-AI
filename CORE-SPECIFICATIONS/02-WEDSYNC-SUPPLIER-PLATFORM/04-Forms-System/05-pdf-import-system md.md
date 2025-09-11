# 05-pdf-import-system.md

## What to Build

AI-powered PDF form analyzer that extracts form fields from existing PDFs and converts them into WedSync forms.

## Key Technical Requirements

### PDF Processing Pipeline

```
interface PDFImporter {
  upload: File
  extraction: {
    method: 'pypdfium2' | 'pdfplumber'
    pages: PDFPage[]
    images: Base64String[] // For Vision API
  }
  analysis: {
    provider: 'openai-vision'
    model: 'gpt-4-vision-preview'
    extraction: ExtractedField[]
  }
}
```

### Field Detection Logic

```
const detectFieldFromPDF = async (image: string) => {
  const analysis = await [openai.vision](http://openai.vision)({
    prompt: `Extract form fields: labels, types, required status, layout`,
    image: image
  })
  
  return [analysis.fields.map](http://analysis.fields.map)(field => ({
    label: field.text,
    type: inferFieldType(field.label),
    required: field.hasAsterisk,
    position: { x: field.x, y: field.y }
  }))
}
```

## Critical Implementation Notes

- Use `pdf-to-image` conversion for Vision API (PDFs not directly supported)
- Cache extracted templates to avoid re-processing
- Implement confidence scoring for field detection
- Support multi-page form detection

## Database Structure

```
CREATE TABLE pdf_imports (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  original_pdf TEXT, -- S3 URL
  extracted_fields JSONB,
  confidence_score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```