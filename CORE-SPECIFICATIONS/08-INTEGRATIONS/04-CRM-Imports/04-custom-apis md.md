# 04-custom-apis.md

## What to Build

Flexible integration framework for connecting custom CRM systems and databases via REST APIs or direct database connections.

## Key Technical Requirements

### Generic API Client Framework

```
// lib/integrations/custom-api.ts
interface CustomAPIConfig {
  name: string;
  baseUrl: string;
  authType: 'api_key' | 'oauth2' | 'basic' | 'custom';
  authConfig: Record<string, any>;
  headers?: Record<string, string>;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

class CustomAPIClient {
  private rateLimiter: RateLimiter;
  
  constructor(private config: CustomAPIConfig) {
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }
  
  async authenticate(): Promise<Headers> {
    switch (this.config.authType) {
      case 'api_key':
        return {
          [this.config.authConfig.headerName]: this.config.authConfig.apiKey
        };
      
      case 'oauth2':
        const token = await this.getOAuth2Token();
        return { 'Authorization': `Bearer ${token}` };
      
      case 'basic':
        const encoded = btoa(`${this.config.authConfig.username}:${this.config.authConfig.password}`);
        return { 'Authorization': `Basic ${encoded}` };
      
      case 'custom':
        return await this.config.authConfig.getHeaders();
    }
  }
  
  async request(endpoint: string, options?: RequestInit) {
    await this.rateLimiter.wait();
    
    const authHeaders = await this.authenticate();
    
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...this.config.headers,
        ...options?.headers
      }
    });
    
    return this.handleResponse(response);
  }
}
```

### Database Schema

```
-- Custom integration configurations
CREATE TABLE custom_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  api_config JSONB ENCRYPTED,
  field_mappings JSONB,
  sync_config JSONB,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field mapping templates
CREATE TABLE field_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  crm_type TEXT,
  mappings JSONB,
  created_by UUID REFERENCES suppliers(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Functions

1. **Field Mapping Configuration**

```
interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: (value: any) => any;
  defaultValue?: any;
  required?: boolean;
}

class FieldMapper {
  constructor(private mappings: FieldMapping[]) {}
  
  mapData(sourceData: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const mapping of this.mappings) {
      let value = this.getNestedValue(sourceData, mapping.sourceField);
      
      if (value === undefined || value === null) {
        if (mapping.required) {
          throw new Error(`Required field ${mapping.sourceField} is missing`);
        }
        value = mapping.defaultValue;
      }
      
      if (mapping.transformation && value !== undefined) {
        value = mapping.transformation(value);
      }
      
      this.setNestedValue(result, mapping.targetField, value);
    }
    
    return result;
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }
  
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((curr, key) => {
      curr[key] = curr[key] || {};
      return curr[key];
    }, obj);
    target[lastKey] = value;
  }
}
```

1. **Generic Import Function**

```
async function genericCRMImport(supplierId: string, config: CustomAPIConfig) {
  const client = new CustomAPIClient(config);
  const mapper = await getFieldMapper(supplierId, [config.name](http://config.name));
  
  // Define endpoints to import from
  const endpoints = [
    { path: '/contacts', type: 'client' },
    { path: '/projects', type: 'project' },
    { path: '/events', type: 'wedding' }
  ];
  
  const results = {
    imported: 0,
    failed: 0,
    errors: []
  };
  
  for (const endpoint of endpoints) {
    try {
      const data = await client.request(endpoint.path);
      const items = Array.isArray(data) ? data : data.items || data.results || [];
      
      for (const item of items) {
        try {
          const mapped = mapper.mapData(item);
          await importMappedData(supplierId, endpoint.type, mapped);
          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${endpoint.type}: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Endpoint ${endpoint.path}: ${error.message}`);
    }
  }
  
  return results;
}
```

1. **CSV/Excel Import Handler**

```
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

async function importFromFile(file: File, supplierId: string) {
  let data: any[];
  
  if ([file.name](http://file.name).endsWith('.csv')) {
    // Parse CSV
    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    data = [parsed.data](http://parsed.data);
  } else if ([file.name](http://file.name).match(/\.(xlsx?|xls)$/)) {
    // Parse Excel
    const buffer = await file.arrayBuffer();
    const workbook = [XLSX.read](http://XLSX.read)(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json(firstSheet);
  } else {
    throw new Error('Unsupported file type');
  }
  
  // Auto-detect field mappings
  const mappings = await autoDetectMappings(data[0]);
  
  // Import data
  for (const row of data) {
    await importClientFromRow(supplierId, row, mappings);
  }
}

function autoDetectMappings(sampleRow: Record<string, any>): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const commonMappings = {
    // Common field patterns
    'email|e-mail|email_address': 'email',
    'phone|telephone|mobile|cell': 'phone',
    'name|full_name|contact': 'couple_names',
    'date|wedding_date|event_date': 'wedding_date',
    'venue|location|place': 'venue_name',
    'guests|guest_count|attendees': 'guest_count'
  };
  
  for (const [pattern, targetField] of Object.entries(commonMappings)) {
    const regex = new RegExp(pattern, 'i');
    const sourceField = Object.keys(sampleRow).find(key => regex.test(key));
    
    if (sourceField) {
      mappings.push({
        sourceField,
        targetField,
        transformation: getTransformation(targetField)
      });
    }
  }
  
  return mappings;
}
```

1. **Webhook Handler for Real-time Sync**

```
// app/api/webhooks/custom/[integration]/route.ts
export async function POST(req: Request, { params }: { params: { integration: string } }) {
  const signature = req.headers.get('x-signature');
  const body = await req.text();
  
  // Verify webhook signature
  const integration = await getIntegrationConfig(params.integration);
  if (!verifyWebhookSignature(body, signature, integration.webhook_secret)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const data = JSON.parse(body);
  
  // Process webhook based on event type
  switch (data.event_type) {
    case 'contact.created':
    case 'contact.updated':
      await syncContact(integration.supplier_id, data.payload);
      break;
    
    case 'project.created':
    case 'project.updated':
      await syncProject(integration.supplier_id, data.payload);
      break;
  }
  
  return new Response('OK', { status: 200 });
}
```

## Critical Implementation Notes

1. **Security**: Encrypt all API credentials in database
2. **Validation**: Validate all imported data against WedSync schemas
3. **Error Handling**: Implement retry logic with exponential backoff
4. **Monitoring**: Log all API calls for debugging
5. **Flexibility**: Support various API response formats

## Mapping Configuration UI

```
function FieldMappingConfig({ supplierId, sampleData }: Props) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  
  const sourceFields = Object.keys(sampleData);
  const targetFields = [
    'couple_names', 'email', 'phone', 'wedding_date',
    'venue_name', 'guest_count', 'notes'
  ];
  
  return (
    <div>
      <h3>Map Your Fields</h3>
      <table>
        <thead>
          <tr>
            <th>Your Field</th>
            <th>Maps To</th>
            <th>Sample Data</th>
          </tr>
        </thead>
        <tbody>
          {[sourceFields.map](http://sourceFields.map)(field => (
            <tr key={field}>
              <td>{field}</td>
              <td>
                <select
                  onChange={(e) => updateMapping(field, [e.target](http://e.target).value)}
                >
                  <option value="">Skip</option>
                  {[targetFields.map](http://targetFields.map)(target => (
                    <option key={target} value={target}>
                      {target}
                    </option>
                  ))}
                </select>
              </td>
              <td>{sampleData[field]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button onClick={() => saveMapping(mappings)}>
        Save Mapping Template
      </button>
    </div>
  );
}
```

## Testing Requirements

- [ ]  API authentication for all auth types
- [ ]  Field mapping works correctly
- [ ]  CSV/Excel import handles edge cases
- [ ]  Webhook signature verification
- [ ]  Rate limiting prevents API abuse