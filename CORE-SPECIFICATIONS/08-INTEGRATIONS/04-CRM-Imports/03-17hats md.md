# 03-17hats.md

## What to Build

Implement 17hats CRM integration to import existing client data, projects, and workflow automations into WedSync, enabling seamless migration for photographers and wedding vendors.

## Key Technical Requirements

### OAuth2 Authentication

```
// app/lib/integrations/17hats/auth.ts
export class SeventeenHatsAuth {
  private readonly CLIENT_ID = process.env.SEVENTEEN_HATS_CLIENT_ID;
  private readonly CLIENT_SECRET = process.env.SEVENTEEN_HATS_CLIENT_SECRET;
  private readonly REDIRECT_URI = `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/api/integrations/17hats/callback`;
  private readonly BASE_URL = '[https://api.17hats.com/v1](https://api.17hats.com/v1)';
  
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      state,
      scope: 'read_contacts read_projects read_workflows'
    });
    
    return `[https://app.17hats.com/oauth/authorize?${params}`](https://app.17hats.com/oauth/authorize?${params}`);
  }
  
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const response = await fetch('[https://api.17hats.com/oauth/token](https://api.17hats.com/oauth/token)', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        code,
        redirect_uri: this.REDIRECT_URI
      })
    });
    
    return response.json();
  }
}
```

### Data Import Service

```
// app/lib/integrations/17hats/importer.ts
export class SeventeenHatsImporter {
  private client: SeventeenHatsClient;
  
  constructor(accessToken: string) {
    this.client = new SeventeenHatsClient(accessToken);
  }
  
  async importClients(supplierId: string): Promise<ImportResult> {
    const contacts = await this.client.getContacts();
    const imported = [];
    const failed = [];
    
    for (const contact of contacts) {
      try {
        const weddingDate = this.extractWeddingDate(contact.projects);
        
        const clientData = {
          supplier_id: supplierId,
          couple_names: this.formatCoupleNames(contact),
          email: [contact.email](http://contact.email),
          phone: this.formatPhone([contact.phone](http://contact.phone)),
          wedding_date: weddingDate,
          venue_name: contact.custom_fields?.venue,
          guest_count: contact.custom_fields?.guest_count,
          notes: contact.notes,
          tags: contact.tags,
          external_id: [contact.id](http://contact.id),
          external_source: '17hats',
          imported_at: new Date()
        };
        
        const client = await this.createClient(clientData);
        imported.push(client);
        
        // Import associated projects
        if (contact.projects?.length > 0) {
          await this.importProjects(contact.projects, [client.id](http://client.id));
        }
      } catch (error) {
        failed.push({ contact, error });
      }
    }
    
    return { imported, failed };
  }
  
  private formatCoupleNames(contact: any): string {
    // 17hats may store as "Jane & John Smith" or separate fields
    if (contact.partner_name) {
      return `${contact.first_name} & ${contact.partner_name}`;
    }
    return `${contact.first_name} ${contact.last_name}`;
  }
  
  async importWorkflows(supplierId: string): Promise<ImportResult> {
    const workflows = await this.client.getWorkflows();
    const journeys = [];
    
    for (const workflow of workflows) {
      const journey = await this.convertWorkflowToJourney(workflow, supplierId);
      journeys.push(journey);
    }
    
    return { imported: journeys, failed: [] };
  }
}
```

### API Client

```
// app/lib/integrations/17hats/client.ts
export class SeventeenHatsClient {
  private accessToken: string;
  private baseUrl = '[https://api.17hats.com/v1](https://api.17hats.com/v1)';
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`17hats API error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getContacts(page = 1, perPage = 100) {
    return this.request(`/contacts?page=${page}&per_page=${perPage}`);
  }
  
  async getProjects(contactId?: string) {
    const endpoint = contactId 
      ? `/contacts/${contactId}/projects`
      : '/projects';
    return this.request(endpoint);
  }
  
  async getWorkflows() {
    return this.request('/workflows');
  }
  
  async getQuotesAndInvoices(projectId: string) {
    return this.request(`/projects/${projectId}/financials`);
  }
  
  async getContracts(projectId: string) {
    return this.request(`/projects/${projectId}/contracts`);
  }
  
  async getEmails(contactId: string) {
    return this.request(`/contacts/${contactId}/emails`);
  }
}
```

### Workflow to Journey Converter

```
// app/lib/integrations/17hats/workflow-converter.ts
export class WorkflowConverter {
  convertToJourney(workflow: SeventeenHatsWorkflow): CustomerJourney {
    const journey: CustomerJourney = {
      name: [workflow.name](http://workflow.name),
      description: workflow.description,
      trigger_type: this.mapTriggerType(workflow.trigger),
      modules: []
    };
    
    // Convert 17hats actions to WedSync modules
    for (const action of workflow.actions) {
      const module = this.convertActionToModule(action);
      if (module) {
        journey.modules.push(module);
      }
    }
    
    return journey;
  }
  
  private convertActionToModule(action: any): JourneyModule | null {
    switch (action.type) {
      case 'send_email':
        return {
          type: 'email',
          name: [action.name](http://action.name),
          delay: this.convertDelay(action.delay),
          config: {
            subject: [action.email](http://action.email)_subject,
            body: [action.email](http://action.email)_body,
            attachments: action.attachments
          }
        };
      
      case 'send_questionnaire':
        return {
          type: 'form',
          name: [action.name](http://action.name),
          delay: this.convertDelay(action.delay),
          config: {
            formName: action.questionnaire_name,
            fields: this.convertQuestionnaireFields(action.fields)
          }
        };
      
      case 'create_task':
        return {
          type: 'task',
          name: action.task_name,
          delay: this.convertDelay(action.delay),
          config: {
            description: action.task_description,
            assignee: action.assigned_to
          }
        };
      
      default:
        console.warn(`Unknown 17hats action type: ${action.type}`);
        return null;
    }
  }
  
  private convertDelay(delay: any): JourneyDelay {
    // 17hats uses different delay format
    if (delay.type === 'immediate') {
      return { value: 0, unit: 'minutes' };
    }
    
    return {
      value: delay.value,
      unit: delay.unit // days, hours, etc.
    };
  }
}
```

### Import UI Component

```
// app/components/integrations/17hats/ImportWizard.tsx
export const SeventeenHatsImportWizard = () => {
  const [step, setStep] = useState(1);
  const [importOptions, setImportOptions] = useState({
    clients: true,
    projects: true,
    workflows: false,
    emails: false
  });
  
  const handleConnect = () => {
    // Redirect to 17hats OAuth
    const state = generateState();
    sessionStorage.setItem('17hats_state', state);
    window.location.href = auth.getAuthorizationUrl(state);
  };
  
  const handleImport = async () => {
    setImporting(true);
    
    const results = {
      clients: { imported: 0, failed: 0 },
      projects: { imported: 0, failed: 0 },
      workflows: { imported: 0, failed: 0 }
    };
    
    if (importOptions.clients) {
      const clientResult = await importer.importClients(supplierId);
      results.clients = {
        imported: clientResult.imported.length,
        failed: clientResult.failed.length
      };
    }
    
    if (importOptions.workflows) {
      const workflowResult = await importer.importWorkflows(supplierId);
      results.workflows = {
        imported: workflowResult.imported.length,
        failed: workflowResult.failed.length
      };
    }
    
    setImportResults(results);
    setStep(4); // Show results
  };
  
  return (
    <div className="import-wizard">
      {step === 1 && (
        <ConnectStep onConnect={handleConnect} />
      )}
      {step === 2 && (
        <SelectDataStep 
          options={importOptions}
          onChange={setImportOptions}
        />
      )}
      {step === 3 && (
        <ImportProgressStep />
      )}
      {step === 4 && (
        <ImportResultsStep results={importResults} />
      )}
    </div>
  );
};
```

### Database Schema

```
-- Store integration connections
CREATE TABLE crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  platform TEXT CHECK (platform IN ('17hats', 'honeybook', 'dubsado')),
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track import history
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  platform TEXT,
  import_type TEXT, -- 'clients', 'projects', 'workflows'
  total_records INTEGER,
  imported_count INTEGER,
  failed_count INTEGER,
  error_log JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

## Critical Implementation Notes

1. **Rate Limiting**: 17hats has 600 requests/hour limit - implement throttling
2. **Data Mapping**: 17hats uses different field names - careful mapping required
3. **Partial Imports**: Support resumable imports for large datasets
4. **Duplicate Detection**: Check for existing clients before importing
5. **Custom Fields**: Map 17hats custom fields to WedSync fields intelligently
6. **Project Status**: Convert 17hats project statuses to WedSync equivalents
7. **File Attachments**: Download and re-upload files to WedSync storage
8. **Webhook Support**: Set up webhooks for ongoing sync after initial import

## Testing Checklist

- [ ]  OAuth flow completes successfully
- [ ]  Client data imports with correct formatting
- [ ]  Wedding dates parse correctly
- [ ]  Workflows convert to journeys properly
- [ ]  Handle rate limiting gracefully
- [ ]  Duplicate detection works
- [ ]  Failed imports are logged
- [ ]  Large dataset imports work