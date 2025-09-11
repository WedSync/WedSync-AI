# 01-pdf-analysis.md

# PDF Analysis System

## What to Build

AI-powered PDF document analyzer that extracts form fields, layout structure, and validation rules from uploaded wedding supplier forms using OpenAI Vision API and document parsing libraries.

## Key Technical Requirements

### PDF Processing Pipeline

```
class PDFAnalyzer {
  async analyzePDF(file: File): Promise<FormAnalysis> {
    // Step 1: Convert PDF pages to images
    const pages = await this.pdfToImages(file)
    
    // Step 2: Extract text layer
    const textData = await this.extractText(file)
    
    // Step 3: Vision API analysis
    const visionAnalysis = await this.analyzeWithVision(pages)
    
    // Step 4: Merge and validate results
    return this.mergeAnalysis(textData, visionAnalysis)
  }
  
  private async pdfToImages(file: File): Promise<string[]> {
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise
    const images: string[] = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2.0 })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      await page.render({ canvasContext: context, viewport }).promise
      images.push(canvas.toDataURL('image/png'))
    }
    
    return images
  }
}
```

### Vision API Integration

```
class VisionAnalyzer {
  async analyzeFormLayout(imageData: string): Promise<VisionAnalysis> {
    const response = await [openai.chat](http://openai.chat).completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this wedding form and extract:
              1. All form fields with labels and types
              2. Field groupings and sections
              3. Required vs optional indicators
              4. Layout structure (columns, rows)
              5. Any conditional logic visible
              Output as structured JSON.`
          },
          {
            type: 'image_url',
            image_url: { url: imageData }
          }
        ]
      }],
      response_format: { type: 'json_object' }
    })
    
    return JSON.parse(response.choices[0].message.content)
  }
}
```

### Field Type Detection

```
class FieldTypeDetector {
  private patterns = {
    email: /email|e-?mail|contact/i,
    phone: /phone|mobile|cell|tel|contact.?number/i,
    date: /date|when|day|schedule/i,
    time: /time|hour|schedule|timeline/i,
    number: /count|number|quantity|guest|people|pax/i,
    currency: /price|cost|budget|fee|payment|\$|£|€/i,
    address: /address|location|venue|place|where/i,
    multiSelect: /select.?all|choose.?multiple|check.?all/i,
    textarea: /describe|details|notes|message|comments/i,
    // Wedding-specific patterns
    venue: /venue|ceremony|reception|location/i,
    guestCount: /guest.?count|attendees|people|pax/i,
    timeline: /timeline|schedule|itinerary|runsheet/i,
    dietary: /dietary|allergies|food|meal/i,
    photoList: /photo|shot.?list|family|group/i
  }
  
  detectType(label: string, context: string = ''): FieldType {
    const combined = `${label} ${context}`.toLowerCase()
    
    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(combined)) {
        return type as FieldType
      }
    }
    
    // Default based on common patterns
    if (combined.includes('?')) return 'text'
    if (combined.includes('[]')) return 'checkbox'
    if (combined.includes('()')) return 'radio'
    
    return 'text'
  }
}
```

## Critical Implementation Notes

### Database Schema

```
CREATE TABLE pdf_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  page_count INTEGER,
  analysis_status TEXT DEFAULT 'pending',
  extracted_fields JSONB,
  layout_structure JSONB,
  confidence_score DECIMAL,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE extracted_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES pdf_analysis_jobs(id),
  page_number INTEGER,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_name TEXT, -- Generated snake_case name
  required BOOLEAN DEFAULT false,
  options JSONB, -- For select/radio fields
  validation_rules JSONB,
  position JSONB, -- {x, y, width, height}
  confidence DECIMAL,
  is_core_field BOOLEAN DEFAULT false,
  core_field_id TEXT, -- Maps to WedMe core fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pdf_jobs_supplier ON pdf_analysis_jobs(supplier_id);
CREATE INDEX idx_pdf_jobs_status ON pdf_analysis_jobs(analysis_status);
```

### Processing Queue

```
class PDFProcessingQueue {
  async addToQueue(file: File, supplierId: string) {
    // Upload to storage
    const fileUrl = await this.uploadToStorage(file)
    
    // Create job record
    const job = await db.from('pdf_analysis_jobs').insert({
      supplier_id: supplierId,
      original_filename: [file.name](http://file.name),
      file_url: fileUrl,
      file_size: file.size,
      analysis_status: 'queued'
    }).select().single()
    
    // Queue for processing
    await this.queueJob('pdf-analysis', {
      jobId: [job.id](http://job.id),
      fileUrl: fileUrl,
      supplierId: supplierId
    })
    
    return job
  }
  
  async processJob(jobData: any) {
    const startTime = [Date.now](http://Date.now)()
    
    try {
      // Download and analyze
      const file = await this.downloadFile(jobData.fileUrl)
      const analysis = await this.analyzer.analyzePDF(file)
      
      // Store results
      await this.storeAnalysisResults(jobData.jobId, analysis)
      
      // Update job status
      await db.from('pdf_analysis_jobs').update({
        analysis_status: 'completed',
        confidence_score: analysis.confidence,
        processing_time_ms: [Date.now](http://Date.now)() - startTime,
        completed_at: new Date()
      }).eq('id', jobData.jobId)
      
    } catch (error) {
      await this.handleError(jobData.jobId, error)
    }
  }
}
```

### Confidence Scoring

```
class ConfidenceScorer {
  calculateFieldConfidence(field: ExtractedField): number {
    let score = 0.5 // Base score
    
    // Clear label increases confidence
    if (field.label && field.label.length > 2) score += 0.2
    
    // Known field type increases confidence
    if (field.type !== 'text') score += 0.15
    
    // Has validation rules
    if (field.validationRules?.length > 0) score += 0.1
    
    // Position data available
    if (field.position) score += 0.05
    
    return Math.min(score, 1.0)
  }
}
```

### Error Handling

```
const handlePDFErrors = {
  PASSWORD_PROTECTED: 'PDF is password protected. Please upload an unlocked version.',
  CORRUPTED: 'PDF appears to be corrupted. Please try re-saving the file.',
  TOO_LARGE: 'PDF exceeds 10MB limit. Please reduce file size.',
  NO_FORM_FIELDS: 'No form fields detected. Is this a fillable form?',
  VISION_API_ERROR: 'Unable to analyze document. Please try again.',
  LOW_CONFIDENCE: 'Form structure unclear. Manual review required.'
}
```