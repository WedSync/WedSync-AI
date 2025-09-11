# 04-reports-export.md

## What to Build

Create an export system that allows couples to generate and download budget reports in multiple formats (PDF, CSV, Excel) with customizable date ranges and category filters.

## Key Technical Requirements

### Database Schema

```
interface BudgetExport {
  id: string
  couple_id: string
  export_type: 'pdf' | 'csv' | 'excel'
  filters: {
    categories?: string[]
    date_range?: { start: Date, end: Date }
    payment_status?: 'paid' | 'pending' | 'planned'
  }
  generated_at: Date
  file_url: string
}
```

### API Endpoints

```
// POST /api/wedme/budget/export
// Request body: { format, filters, include_charts }
// Returns: { download_url, expires_at }

// GET /api/wedme/budget/export/:id
// Returns file stream
```

### Export Templates

```
const exportFormats = {
  pdf: {
    includeCharts: true,
    includeBreakdown: true,
    pageOrientation: 'portrait'
  },
  csv: {
    columns: ['category', 'vendor', 'amount', 'paid', 'due_date'],
    delimiter: ','
  },
  excel: {
    sheets: ['Summary', 'Details', 'Payment Schedule'],
    includeFormulas: true
  }
}
```

## Critical Implementation Notes

1. **Use React PDF** for PDF generation with charts
2. **Cache exports** for 24 hours to reduce server load
3. **Implement queue system** for large exports using Supabase Edge Functions
4. **Include visual charts** in PDF exports using recharts
5. **Add email delivery option** for large files
6. **Compress files** before storage to reduce bandwidth

## Export Content Structure

- Summary statistics (total budget, spent, remaining)
- Category breakdown with percentages
- Payment timeline visualization
- Vendor payment status table
- Notes and custom items section