# PDF Import - Quick Reference Guide

## 🚀 Quick Start

### Environment Setup
```bash
# Required environment variables
GOOGLE_CLOUD_KEY_FILE=./credentials/google-vision.json
GOOGLE_CLOUD_PROJECT_ID=wedsync-ocr-prod
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Basic Usage
```typescript
// 1. Upload PDF
const formData = new FormData();
formData.append('file', pdfFile);
const upload = await fetch('/api/pdf/upload', {
  method: 'POST',
  body: formData
});

// 2. Process PDF
const process = await fetch('/api/pdf/process', {
  method: 'POST',
  body: JSON.stringify({ uploadId })
});

// 3. Check status
const status = await fetch(`/api/pdf/process?uploadId=${uploadId}`);

// 4. Create form
const form = await fetch('/api/forms/create-from-pdf', {
  method: 'POST',
  body: JSON.stringify({ pdfId, mapping, fields })
});
```

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Accuracy | 87.3% |
| Speed (10 pages) | 28s |
| Max file size | 50MB |
| Supported formats | PDF |
| Min confidence | 0.65 |

## 🔍 Field Detection Patterns

### High Confidence Fields (>90%)
- Email addresses
- Phone numbers
- Dates (MM/DD/YYYY)
- Dollar amounts
- Wedding date

### Medium Confidence Fields (80-90%)
- Names (bride/groom)
- Venue names
- Guest counts
- Timeline events

### Low Confidence Fields (<80%)
- Handwritten text
- Complex addresses
- Custom fields
- Notes/comments

## 🛠️ Debugging

### Check Processing Status
```typescript
// Get detailed processing info
const response = await fetch(`/api/pdf/process?uploadId=${uploadId}`);
const data = await response.json();

console.log('Status:', data.upload.status);
console.log('Fields found:', data.processing.result.fields.length);
console.log('Accuracy:', data.processing.result.accuracy);
console.log('Pages:', data.processing.result.pageCount);
```

### Enable Debug Mode
```typescript
// In processing options
{
  qualityCheck: true,
  parallel: false, // Disable for debugging
  skipCache: true, // Force reprocessing
  enhanceAccuracy: true // Maximum accuracy
}
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Low accuracy | Enable `enhanceAccuracy` option |
| Slow processing | Check file size, enable parallel |
| Missing fields | Lower confidence threshold |
| Encrypted PDF | Request unlocked version |
| Memory issues | Use performance optimizer |

## 📈 Performance Tuning

### For Speed
```typescript
PerformanceOptimizer.enableProductionMode();
options.parallel = true;
options.skipCache = false;
```

### For Accuracy
```typescript
options.enhanceAccuracy = true;
options.extractTables = true;
options.detectSignatures = true;
confidenceThreshold = 0.60; // Lower threshold
```

### For Large Documents
```typescript
PerformanceOptimizer.optimizeFor10PageDocument();
options.chunkSize = 512 * 1024; // Smaller chunks
options.maxWorkers = 8; // More workers
```

## 🔐 Security Notes

- PDFs are validated before processing
- Files are virus-scanned
- Temporary files auto-delete after 24h
- Feature is tier-gated (Pro/Scale only)
- Organization-level isolation

## 📝 Testing

### Run Tests
```bash
# Unit tests
npm test src/lib/ocr

# Integration tests
npm test tests/integration/pdf

# E2E tests
npm run test:e2e pdf-to-form

# Accuracy test
npm run test:accuracy
```

### Test PDFs Location
```
/wedsync/tests/fixtures/
├── wedding-contract.pdf
├── timeline.pdf
├── invoice.pdf
├── questionnaire.pdf
├── corrupted.pdf
├── encrypted.pdf
└── 10-page-document.pdf
```

## 🎯 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pdf/upload` | POST | Upload PDF |
| `/api/pdf/validate` | POST | Validate PDF |
| `/api/pdf/process` | POST | Start processing |
| `/api/pdf/process` | GET | Check status |
| `/api/forms/create-from-pdf` | POST | Create form |

## 💡 Pro Tips

1. **Best Results**: Use typed PDFs, not scanned
2. **Faster Processing**: Keep PDFs under 5 pages
3. **Higher Accuracy**: Use standard wedding terminology
4. **Avoid Issues**: Ensure PDFs aren't password protected
5. **Cache Benefit**: Process similar PDFs together

## 🔗 Related Documentation

- [Full Feature Documentation](./features/pdf-import.md)
- [Integration Architecture](./INTEGRATION-ARCHITECTURE.md)
- [Demo Script](./PDF-IMPORT-DEMO-SCRIPT.md)
- [Core Fields Reference](../src/types/core-fields.ts)

---

*Quick reference for WedSync PDF Import feature v1.0*