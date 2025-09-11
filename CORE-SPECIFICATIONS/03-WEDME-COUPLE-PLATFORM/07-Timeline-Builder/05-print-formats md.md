# 05-print-formats.md

## What to Build

Multiple print-optimized timeline formats for different stakeholders, from detailed coordinator sheets to simple guest programs.

## Key Technical Requirements

### Print Format Types

```
interface PrintFormats {
  master_timeline: {
    format: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    sections: {
      header: { couple_names: string; date: string; venues: string[]; };
      timeline: { show_suppliers: boolean; show_helpers: boolean; };
      contacts: { emergency: Contact[]; suppliers: Contact[]; };
      notes: string;
    };
  };
  supplier_sheet: {
    supplier_specific: boolean;
    include_setup: boolean;
    include_contacts: boolean;
  };
  helper_cards: {
    size: 'business_card' | 'index_card' | 'half_page';
    content: 'tasks_only' | 'full_schedule';
  };
  guest_program: {
    simplified: boolean;
    ceremony_only: boolean;
    include_reception: boolean;
  };
}
```

### CSS Print Styles

```
@media print {
  .timeline-print {
    font-size: 10pt;
    line-height: 1.4;
    color: black;
    background: white;
  }
  .page-break { page-break-after: always; }
  .no-print { display: none; }
  .timeline-block { 
    border: 1px solid #000;
    padding: 8px;
    margin-bottom: 4px;
  }
}
```

## Critical Implementation Notes

- Generate PDF with proper margins
- Include page numbers and headers
- QR code for digital version access
- Waterproof card stock option notes
- Large print version for readability

## PDF Generation

```
const generatePDF = async (timeline: Timeline, format: PrintFormat) => {
  const doc = new PDFDocument({ size: format.size, margins: format.margins });
  
  // Add content based on format type
  doc.fontSize(16).text(timeline.couple_names, { align: 'center' });
  doc.fontSize(12).text(formatDate([timeline.wedding](http://timeline.wedding)_date));
  
  [timeline.events](http://timeline.events).forEach(event => {
    doc.addPage().fontSize(10);
    doc.text(`${event.start_time} - ${event.title}`);
  });
  
  return doc;
};
```