# 02-dubsado.md

## What to Build

Integration with Dubsado CRM to import client data, projects, and forms. Dubsado requires OAuth 2.0 authentication and provides comprehensive API access to client management data.

## Key Technical Requirements

### OAuth 2.0 Configuration

```
// lib/integrations/dubsado-client.ts
const DUBSADO_CONFIG = {
  authorizationURL: '[https://api.dubsado.com/oauth/authorize](https://api.dubsado.com/oauth/authorize)',
  tokenURL: '[https://api.dubsado.com/oauth/token](https://api.dubsado.com/oauth/token)',
  clientId: process.env.DUBSADO_CLIENT_ID!,
  clientSecret: process.env.DUBSADO_CLIENT_SECRET!,
  redirectUri: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/api/integrations/dubsado/callback`,
  scopes: ['clients:read', 'projects:read', 'forms:read', 'invoices:read']
};
```

### Database Schema

```
-- Dubsado OAuth tokens
CREATE TABLE dubsado_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  dubsado_account_id TEXT UNIQUE,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_expires_at TIMESTAMPTZ,
  brand_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import tracking
CREATE TABLE dubsado_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  import_type TEXT, -- 'clients', 'projects', 'forms'
  status TEXT DEFAULT 'pending',
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### OAuth Flow Implementation

```
// app/api/integrations/dubsado/auth/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get('supplier_id');
  
  const authUrl = new URL(DUBSADO_CONFIG.authorizationURL);
  authUrl.searchParams.append('client_id', DUBSADO_CONFIG.clientId);
  authUrl.searchParams.append('redirect_uri', DUBSADO_CONFIG.redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', DUBSADO_CONFIG.scopes.join(' '));
  authUrl.searchParams.append('state', supplierId!);
  
  return NextResponse.redirect(authUrl.toString());
}

// app/api/integrations/dubsado/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const supplierId = searchParams.get('state');
  
  // Exchange code for tokens
  const tokenResponse = await fetch(DUBSADO_CONFIG.tokenURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: DUBSADO_CONFIG.clientId,
      client_secret: DUBSADO_CONFIG.clientSecret,
      code,
      redirect_uri: DUBSADO_CONFIG.redirectUri
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Store encrypted tokens
  await storeDubsadoTokens(supplierId!, tokens);
  
  return NextResponse.redirect('/dashboard/imports/dubsado/success');
}
```

### Import Service

```
// services/crm/dubsado-import-service.ts
export class DubsadoImportService {
  private apiClient: DubsadoAPIClient;
  
  async importClients(supplierId: string, options: ImportOptions) {
    const importLog = await this.createImportLog(supplierId, 'clients');
    
    try {
      // Fetch all clients with pagination
      let page = 1;
      let hasMore = true;
      const allClients = [];
      
      while (hasMore) {
        const response = await this.apiClient.get('/public/api/v1/clients', {
          params: { page, per_page: 100 }
        });
        
        allClients.push(...[response.data](http://response.data).clients);
        hasMore = [response.data](http://response.data).has_more;
        page++;
      }
      
      // Map and import clients
      for (const dubsadoClient of allClients) {
        await this.importSingleClient(supplierId, dubsadoClient, [importLog.id](http://importLog.id));
      }
      
      await this.completeImportLog([importLog.id](http://importLog.id), 'success');
    } catch (error) {
      await this.completeImportLog([importLog.id](http://importLog.id), 'failed', error);
      throw error;
    }
  }
  
  private async importSingleClient(
    supplierId: string,
    dubsadoClient: any,
    importLogId: string
  ) {
    // Map Dubsado fields to WedSync
    const mappedClient = {
      first_name: dubsadoClient.first_name,
      last_name: dubsadoClient.last_name,
      email: [dubsadoClient.email](http://dubsadoClient.email),
      phone: [dubsadoClient.phone](http://dubsadoClient.phone)_number,
      partner_first_name: dubsadoClient.partner?.first_name,
      partner_last_name: dubsadoClient.partner?.last_name,
      partner_email: dubsadoClient.partner?.email,
      wedding_date: dubsadoClient.event_date,
      venue_name: dubsadoClient.venue,
      guest_count: dubsadoClient.guest_count,
      notes: dubsadoClient.notes,
      external_id: [dubsadoClient.id](http://dubsadoClient.id),
      external_source: 'dubsado'
    };
    
    // Check for duplicates
    const existing = await this.findExistingClient(
      supplierId,
      [mappedClient.email](http://mappedClient.email)
    );
    
    if (existing) {
      await this.updateClient([existing.id](http://existing.id), mappedClient);
    } else {
      await this.createClient(supplierId, mappedClient);
    }
  }
}
```

### API Client with Token Refresh

```
// lib/integrations/dubsado-api-client.ts
export class DubsadoAPIClient {
  private supplierId: string;
  private baseURL = '[https://api.dubsado.com](https://api.dubsado.com)';
  
  constructor(supplierId: string) {
    this.supplierId = supplierId;
  }
  
  async request(method: string, endpoint: string, options?: any) {
    const tokens = await this.getTokens();
    
    // Check if token needs refresh
    if (new Date() >= new Date(tokens.token_expires_at)) {
      await this.refreshTokens();
    }
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });
    
    if (response.status === 401) {
      // Token expired, refresh and retry
      await this.refreshTokens();
      return this.request(method, endpoint, options);
    }
    
    return response.json();
  }
  
  private async refreshTokens() {
    const tokens = await this.getTokens();
    
    const response = await fetch(DUBSADO_CONFIG.tokenURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: DUBSADO_CONFIG.clientId,
        client_secret: DUBSADO_CONFIG.clientSecret
      })
    });
    
    const newTokens = await response.json();
    await this.storeTokens(newTokens);
  }
}
```

### Import UI Component

```
// components/imports/dubsado-import.tsx
export function DubsadoImport({ supplierId }: { supplierId: string }) {
  const [connected, setConnected] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>();
  
  const handleConnect = () => {
    window.location.href = `/api/integrations/dubsado/auth?supplier_id=${supplierId}`;
  };
  
  const handleImport = async () => {
    setImporting(true);
    
    const response = await fetch('/api/imports/dubsado', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: supplierId,
        import_types: ['clients', 'projects', 'forms']
      })
    });
    
    // Poll for progress
    // ... similar to HoneyBook implementation
  };
  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center gap-4">
        <img src="/logos/dubsado.svg" className="w-12 h-12" />
        <div className="flex-1">
          <h3>Dubsado Integration</h3>
          <p className="text-sm text-gray-500">
            Import clients, projects, and forms from Dubsado
          </p>
        </div>
        {!connected ? (
          <button onClick={handleConnect} className="btn-primary">
            Connect Dubsado
          </button>
        ) : (
          <button onClick={handleImport} disabled={importing}>
            {importing ? 'Importing...' : 'Start Import'}
          </button>
        )}
      </div>
    </div>
  );
}
```

## Critical Implementation Notes

1. **Rate Limiting**: Dubsado API allows 120 requests per minute - implement rate limiting
2. **Token Expiry**: Access tokens expire after 2 hours, implement automatic refresh
3. **Webhook Support**: Set up webhooks for real-time sync after initial import
4. **Field Mapping**: Dubsado has custom fields - create flexible mapping system
5. **Data Privacy**: Only import active clients unless explicitly requested
6. **Error Handling**: Implement retry logic with exponential backoff
7. **Batch Processing**: Process in chunks to avoid memory issues with large accounts