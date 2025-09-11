# 01-honeybook.md

# HoneyBook Integration

## What to Build

Integration with HoneyBook API to import existing clients, projects, and booking data for seamless migration to WedSync.

## Key Technical Requirements

### API Authentication

```
# Environment variables
HONEYBOOK_API_KEY=your-api-key
HONEYBOOK_API_SECRET=your-api-secret
HONEYBOOK_WEBHOOK_SECRET=your-webhook-secret
```

### Database Schema

```
-- HoneyBook import tracking
CREATE TABLE honeybook_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  honeybook_account_id TEXT,
  import_type TEXT, -- 'full', 'incremental', 'selective'
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  total_records INTEGER,
  imported_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_log JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping table for HoneyBook to WedSync IDs
CREATE TABLE honeybook_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  honeybook_id TEXT NOT NULL,
  honeybook_type TEXT, -- 'contact', 'project', 'invoice'
  wedsync_id UUID,
  wedsync_type TEXT, -- 'client', 'booking', 'payment'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, honeybook_id, honeybook_type)
);
```

### Import Service

```
// services/crm/honeybook-import-service.ts
export class HoneyBookImportService {
  private apiClient: HoneyBookClient;
  
  constructor(apiKey: string, apiSecret: string) {
    this.apiClient = new HoneyBookClient({
      apiKey,
      apiSecret,
      baseUrl: '[https://api.honeybook.com/v1](https://api.honeybook.com/v1)'
    });
  }
  
  async importClients(supplierId: string, options: ImportOptions = {}) {
    const importId = await this.createImportRecord(supplierId, 'full');
    
    try {
      // Fetch contacts from HoneyBook
      const contacts = await this.apiClient.getContacts({
        limit: options.limit || 1000,
        includeArchived: options.includeArchived || false
      });
      
      await this.updateImportProgress(importId, {
        total_records: contacts.length,
        status: 'processing'
      });
      
      // Process each contact
      for (const contact of contacts) {
        try {
          await this.importContact(supplierId, contact, importId);
        } catch (error) {
          await this.logImportError(importId, [contact.id](http://contact.id), error);
        }
      }
      
      // Import projects
      await this.importProjects(supplierId, importId);
      
      await this.completeImport(importId);
      
    } catch (error) {
      await this.failImport(importId, error);
      throw error;
    }
  }
  
  private async importContact(
    supplierId: string,
    honeybookContact: any,
    importId: string
  ) {
    // Check if already imported
    const existing = await this.findMapping(
      supplierId,
      [honeybookContact.id](http://honeybookContact.id),
      'contact'
    );
    
    if (existing) {
      // Update existing
      await this.updateClient(existing.wedsync_id, honeybookContact);
    } else {
      // Create new client
      const client = await supabase.from('clients').insert({
        supplier_id: supplierId,
        name: `${honeybookContact.firstName} ${honeybookContact.lastName}`,
        email: [honeybookContact.email](http://honeybookContact.email),
        phone: [honeybookContact.phone](http://honeybookContact.phone),
        address: this.formatAddress(honeybookContact.address),
        notes: honeybookContact.notes,
        tags: honeybookContact.tags,
        source: 'honeybook_import',
        metadata: {
          honeybook_id: [honeybookContact.id](http://honeybookContact.id),
          imported_at: new Date(),
          import_id: importId
        }
      }).select().single();
      
      // Create mapping
      await this.createMapping({
        supplier_id: supplierId,
        honeybook_id: [honeybookContact.id](http://honeybookContact.id),
        honeybook_type: 'contact',
        wedsync_id: [client.data.id](http://client.data.id),
        wedsync_type: 'client'
      });
    }
    
    await this.incrementImportProgress(importId);
  }
  
  private async importProjects(supplierId: string, importId: string) {
    const projects = await this.apiClient.getProjects();
    
    for (const project of projects) {
      // Find associated client
      const clientMapping = await this.findMapping(
        supplierId,
        project.contactId,
        'contact'
      );
      
      if (!clientMapping) continue;
      
      // Import project details
      const booking = {
        client_id: clientMapping.wedsync_id,
        wedding_date: project.eventDate,
        venue: project.venue,
        package: project.packageName,
        total_amount: project.totalAmount,
        paid_amount: project.paidAmount,
        status: this.mapProjectStatus(project.status),
        notes: project.description,
        metadata: {
          honeybook_project_id: [project.id](http://project.id),
          honeybook_status: project.status
        }
      };
      
      await supabase.from('bookings').insert(booking);
    }
  }
  
  private mapProjectStatus(honeybookStatus: string): string {
    const statusMap = {
      'inquiry': 'lead',
      'proposal': 'proposal_sent',
      'contract': 'contract_sent',
      'booked': 'confirmed',
      'completed': 'completed',
      'archived': 'archived'
    };
    
    return statusMap[honeybookStatus] || 'unknown';
  }
}
```

### Import UI Component

```
// components/imports/honeybook-import.tsx
export function HoneyBookImport({ supplierId }: { supplierId: string }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>();
  
  const handleImport = async () => {
    setImporting(true);
    
    const response = await fetch('/api/imports/honeybook', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: supplierId,
        options: {
          includeArchived: false,
          importInvoices: true,
          importDocuments: false
        }
      })
    });
    
    const { importId } = await response.json();
    
    // Poll for progress
    const interval = setInterval(async () => {
      const progress = await fetchImportProgress(importId);
      setProgress(progress);
      
      if (progress.status === 'completed' || progress.status === 'failed') {
        clearInterval(interval);
        setImporting(false);
      }
    }, 2000);
  };
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center gap-4 mb-4">
        <img src="/logos/honeybook.svg" className="w-12 h-12" />
        <div>
          <h3>Import from HoneyBook</h3>
          <p className="text-sm text-gray-500">
            Import your clients and projects from HoneyBook
          </p>
        </div>
      </div>
      
      {progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Importing...</span>
            <span>{progress.imported_records}/{[progress.total](http://progress.total)_records}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
                width: `${(progress.imported_records / [progress.total](http://progress.total)_records) * 100}%`
              }}
            />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" />
          Import archived contacts
        </label>
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" defaultChecked />
          Import invoices and payments
        </label>
      </div>
      
      <button
        onClick={handleImport}
        disabled={importing}
        className="mt-4 btn-primary w-full"
      >
        {importing ? 'Importing...' : 'Start Import'}
      </button>
    </div>
  );
}
```

### Data Mapping

```
// Field mapping from HoneyBook to WedSync
const FIELD_MAPPINGS = {
  contact: {
    'firstName': 'first_name',
    'lastName': 'last_name',
    'email': 'email',
    'phone': 'phone',
    'company': 'partner_name',
    'address.street': 'address_line_1',
    '[address.city](http://address.city)': 'city',
    'address.state': 'state',
    '[address.zip](http://address.zip)': 'postal_code',
    'weddingDate': 'wedding_date',
    'venue': 'venue_name',
    'guestCount': 'guest_count',
    'budget': 'budget',
    'notes': 'notes',
    'tags': 'tags',
    'customFields': 'metadata'
  },
  project: {
    'name': 'project_name',
    'eventDate': 'wedding_date',
    'venue': 'venue_name',
    'packageName': 'package',
    'totalAmount': 'total_amount',
    'paidAmount': 'paid_amount',
    'balanceAmount': 'balance_amount',
    'status': 'status',
    'contractSignedDate': 'contract_date',
    'customFields': 'metadata'
  }
};
```

## Critical Implementation Notes

1. **Rate Limiting**: HoneyBook API has rate limits - implement exponential backoff
2. **Batch Processing**: Process imports in batches to avoid timeouts
3. **Duplicate Prevention**: Check for existing imports before creating new records
4. **Data Validation**: Validate all imported data before saving
5. **Rollback Support**: Allow reverting failed imports
6. **Progress Tracking**: Show real-time import progress to users
7. **Error Recovery**: Handle partial failures gracefully