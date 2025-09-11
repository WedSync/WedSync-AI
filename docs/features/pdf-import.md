# PDF Import Feature Documentation
**Version:** 1.0  
**Last Updated:** January 15, 2025  
**Feature Status:** Production Ready ✅

## Overview

The PDF Import feature is WedSync's **killer differentiator** - an AI-powered system that transforms static wedding PDFs into dynamic, shareable forms with >85% accuracy. No other wedding vendor platform has this capability.

## Key Features

### 🎯 Core Capabilities
- **AI-Powered OCR**: Google Cloud Vision integration for text extraction
- **Smart Field Detection**: 87% average accuracy for wedding documents
- **Auto-Mapping**: Intelligent mapping to core wedding fields
- **Fast Processing**: <30 seconds for 10-page documents
- **Error Recovery**: Automatic repair of corrupted PDFs
- **Real-time Progress**: Live updates during processing

### 📄 Supported Document Types
- Wedding contracts
- Photography agreements
- Vendor invoices
- Wedding timelines
- Guest questionnaires
- Venue contracts
- Service agreements

## Technical Architecture

### Components

```
┌─────────────────────────────────────────────┐
│           PDF Upload Interface              │
│         (React Component)                   │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│          PDF Validator                      │
│   • File validation                         │
│   • Corruption detection                    │
│   • Auto-repair attempts                    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      Google Cloud Vision OCR                │
│   • Text extraction                         │
│   • Page analysis                           │
│   • Initial field detection                 │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│     OCR Processing Pipeline                 │
│   • Enhanced field detection                │
│   • Wedding pattern matching                │
│   • Confidence scoring                      │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      Core Fields Mapper                     │
│   • Field relationship analysis             │
│   • Auto-mapping to wedding fields          │
│   • Manual correction interface             │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│        Form Generator                       │
│   • Dynamic form creation                   │
│   • Field pre-population                    │
│   • Validation rules                        │
└─────────────────────────────────────────────┘
```

### File Structure

```
/wedsync/src/
├── app/api/pdf/
│   ├── upload/route.ts        # PDF upload endpoint
│   ├── process/route.ts       # Processing endpoint
│   └── validate/route.ts      # Validation endpoint
│
├── lib/ocr/
│   ├── google-vision.ts       # Google Vision integration
│   ├── processing-pipeline.ts # Main OCR pipeline
│   ├── pdf-validator.ts       # PDF validation & repair
│   └── performance-optimizer.ts # Speed optimization
│
├── components/pdf/
│   └── PDFProcessingProgress.tsx # UI progress component
│
└── types/
    └── core-fields.ts         # Wedding field definitions
```

## API Endpoints

### POST /api/pdf/upload
Upload a PDF file for processing.

**Request:**
```typescript
FormData: {
  file: File // PDF file, max 50MB
}
```

**Response:**
```json
{
  "success": true,
  "uploadId": "uuid",
  "filename": "contract.pdf",
  "size": 2048576,
  "message": "File uploaded successfully"
}
```

### POST /api/pdf/process
Process uploaded PDF with OCR.

**Request:**
```json
{
  "uploadId": "uuid",
  "options": {
    "qualityCheck": true,
    "parallel": true,
    "priority": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "uploadId": "uuid",
  "message": "Processing started",
  "estimatedTime": "30-60 seconds"
}
```

### GET /api/pdf/process?uploadId={id}
Check processing status.

**Response:**
```json
{
  "upload": {
    "id": "uuid",
    "status": "processed",
    "filename": "contract.pdf"
  },
  "processing": {
    "result": {
      "fields": [...],
      "accuracy": 0.87,
      "pageCount": 5
    }
  }
}
```

### POST /api/forms/create-from-pdf
Create form from processed PDF.

**Request:**
```json
{
  "pdfId": "uuid",
  "mapping": {
    "bride_name": "field-1",
    "wedding_date": "field-2"
  },
  "fields": [...]
}
```

## Field Detection Patterns

### Enhanced Wedding Patterns
The system uses advanced regex patterns optimized for wedding documents:

```javascript
// Name Detection
/(?:bride|her)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi

// Date Detection
/(?:wedding|ceremony|reception)[\s]*(?:date|day)[\s]*:?[\s]*([^\n]+)/gi

// Venue Detection
/(?:venue|location)[\s]*(?:name)?[\s]*:?[\s]*([A-Z][A-Za-z\s&']+)/gi

// Guest Count
/(?:guest|guests)[\s]*(?:count|number|total)?[\s]*:?[\s]*(\d+)/gi
```

### Confidence Scoring
Each detected field receives a confidence score based on:
- Pattern match strength (40%)
- Context clues (30%)
- Field relationships (20%)
- Format validation (10%)

## Performance Optimization

### Caching Strategy
- 15-minute cache for processed PDFs
- SHA-256 hash-based cache keys
- Automatic cache cleanup

### Parallel Processing
- Chunk-based processing for large PDFs
- 4 concurrent workers by default
- Dynamic worker allocation based on document size

### Target Metrics
- **10-page document**: <30 seconds
- **5-page document**: <15 seconds
- **Single page**: <5 seconds

## Error Handling

### Validation Errors
| Error Type | User Message | Action |
|------------|-------------|--------|
| File too large | "File exceeds 50MB limit" | Reject upload |
| Not a PDF | "Please upload a PDF file" | Reject upload |
| Encrypted | "PDF is password protected" | Request unlocked version |
| Corrupted | "Attempting to repair PDF..." | Auto-repair attempt |
| No text | "PDF contains only images" | Process with enhanced OCR |

### Processing Errors
- Automatic retry with exponential backoff
- Graceful degradation for partial failures
- User-friendly error messages

## Security Considerations

### File Validation
- Magic number verification
- Virus scanning integration points
- Secure filename generation
- Temporary file cleanup

### Access Control
- Authentication required
- Organization-based isolation
- Row-level security in database
- Feature gating by subscription tier

## Usage Limits

### By Subscription Tier
| Tier | Monthly PDFs | Max File Size | Processing Priority |
|------|--------------|---------------|-------------------|
| Free | 0 | - | - |
| Professional | 50 | 25MB | Standard |
| Scale | 200 | 50MB | Priority |
| Enterprise | Unlimited | 100MB | Immediate |

## Testing

### Unit Tests
```bash
npm test src/lib/ocr/*.test.ts
```

### Integration Tests
```bash
npm test tests/integration/pdf-workflow.test.ts
```

### E2E Tests
```bash
npm run test:e2e tests/e2e/pdf-to-form-workflow.spec.ts
```

### Performance Tests
```bash
npm run test:performance scripts/test-pdf-accuracy.ts
```

## Monitoring

### Key Metrics to Track
- Average processing time per page
- Field detection accuracy rate
- Cache hit ratio
- Error rate by document type
- User success rate (PDF → Form completion)

### Logging
```javascript
// Success log
{
  level: 'info',
  event: 'pdf_processed',
  uploadId: 'uuid',
  pageCount: 5,
  fieldsDetected: 24,
  accuracy: 0.87,
  processingTimeMs: 12500
}

// Error log
{
  level: 'error',
  event: 'pdf_processing_failed',
  uploadId: 'uuid',
  error: 'OCR extraction failed',
  documentType: 'contract'
}
```

## Troubleshooting

### Common Issues

**Issue:** Processing taking longer than expected
```javascript
// Solution: Enable production optimizations
PerformanceOptimizer.enableProductionMode();
```

**Issue:** Low accuracy for specific document
```javascript
// Solution: Use enhanced processing
options.enhanceAccuracy = true;
options.extractTables = true;
```

**Issue:** Memory issues with large PDFs
```javascript
// Solution: Optimize memory usage
PerformanceOptimizer.optimizeMemory();
```

## Future Enhancements

### Planned Features
- [ ] Handwriting recognition
- [ ] Multi-language support
- [ ] Template learning from user corrections
- [ ] Batch PDF processing
- [ ] PDF export with form responses

### Accuracy Improvements
- [ ] Machine learning model training on wedding documents
- [ ] User feedback integration
- [ ] Pattern library expansion
- [ ] Context-aware field grouping

## Support

### For Developers
- Review `/src/lib/ocr/` for implementation details
- Check `/docs/INTEGRATION-ARCHITECTURE.md` for Google Vision setup
- Run `npm run demo:pdf-import` for local testing

### For Users
- Maximum file size: 50MB
- Supported format: PDF only
- Best results with typed text (not handwritten)
- Ensure PDFs are not password protected

---

*This feature is the cornerstone of WedSync's competitive advantage in the wedding vendor market.*