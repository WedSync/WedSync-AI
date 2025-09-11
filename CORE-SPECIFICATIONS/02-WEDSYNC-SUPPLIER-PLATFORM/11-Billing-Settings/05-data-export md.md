# 05-data-export.md

# Data Export System

## What to Build

Comprehensive data export system for GDPR compliance and data portability.

## Technical Requirements

- Export all user data within 30 days (GDPR)
- Multiple format support (JSON, CSV, PDF)
- Scheduled exports
- Secure download links

## Implementation

typescript

`*// Export jobs*
export_jobs {
  id: uuid
  supplier_id: uuid
  export_type: enum('full','clients','forms','analytics')
  format: enum('json','csv','pdf')
  status: enum('pending','processing','completed','failed')
  file_url: text
  expires_at: timestamp
  created_at: timestamp
  completed_at: timestamp
}

*// Export builder*
class DataExporter {
  async exportSupplierData(supplierId, format) {
    const data = {
      account: await getAccountData(supplierId),
      clients: await getClientsData(supplierId),
      forms: await getFormsData(supplierId),
      journeys: await getJourneysData(supplierId),
      analytics: await getAnalyticsData(supplierId)
    };
    
    switch(format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return convertToCSV(data);
      case 'pdf':
        return generatePDF(data);
    }
  }
  
  async scheduleExport(supplierId, schedule) {
    *// Cron job for recurring exports*
  }
}

*// File structure for export*
/export_{timestamp}/
  account.json
  clients.csv
  forms/
    form_1.json
    form_2.json
  documents/
    doc_1.pdf
  analytics_report.pdf`

## Critical Notes

- Encrypt exports with password
- Auto-delete after 7 days
- Include data dictionary in exports
- Queue large exports to background jobs
- Email notification when ready