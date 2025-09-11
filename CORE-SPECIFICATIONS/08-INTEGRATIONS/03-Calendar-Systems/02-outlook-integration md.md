# 02-outlook-integration.md

# Outlook/Office 365 Calendar Integration

## What to Build

Microsoft Graph API integration for Outlook/Office 365 calendar synchronization, meeting management, and Teams meeting creation.

## Key Technical Requirements

### Azure AD App Registration

```
# Environment variables
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=common # or specific tenant ID
AZURE_REDIRECT_URI=[https://app.wedsync.com/api/integrations/outlook/callback](https://app.wedsync.com/api/integrations/outlook/callback)
```

### Package Installation

```
npm install @microsoft/microsoft-graph-client @azure/msal-node
npm install @microsoft/microsoft-graph-types # TypeScript types
```

### Database Schema

```
-- Outlook calendar connections
CREATE TABLE outlook_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  microsoft_user_id TEXT UNIQUE,
  email TEXT,
  display_name TEXT,
  access_token TEXT ENCRYPTED,
  refresh_token TEXT ENCRYPTED,
  token_expiry TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  webhook_subscription_id TEXT,
  webhook_expiry TIMESTAMPTZ,
  delta_link TEXT,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Implementation

### 1. MSAL Authentication Setup

```
// lib/integrations/outlook/auth.ts
import * as msal from '@azure/msal-node';

const msalConfig: msal.Configuration = {
  auth: {
    clientId: [process.env.AZURE](http://process.env.AZURE)_CLIENT_ID!,
    authority: `[https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`](https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`),
    clientSecret: [process.env.AZURE](http://process.env.AZURE)_CLIENT_SECRET
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: [msal.LogLevel.Info](http://msal.LogLevel.Info)
    }
  }
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

const SCOPES = [
  '[User.Read](http://User.Read)',
  'Calendars.ReadWrite',
  '[MailboxSettings.Read](http://MailboxSettings.Read)',
  'OnlineMeetings.ReadWrite' // For Teams meetings
];

export { pca, SCOPES };
```

### 2. OAuth Flow

```
// app/api/integrations/outlook/auth/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplier_id');
  
  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: [process.env.AZURE](http://process.env.AZURE)_REDIRECT_URI!,
    state: supplierId,
    prompt: 'select_account'
  };
  
  const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
  return NextResponse.redirect(authUrl);
}

// app/api/integrations/outlook/callback/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const supplierId = searchParams.get('state');
  
  const tokenRequest = {
    code: code!,
    scopes: SCOPES,
    redirectUri: [process.env.AZURE](http://process.env.AZURE)_REDIRECT_URI!
  };
  
  const response = await pca.acquireTokenByCode(tokenRequest);
  
  // Store tokens
  await supabase.from('outlook_calendar_connections').upsert({
    supplier_id: supplierId,
    microsoft_user_id: response.account?.homeAccountId,
    email: response.account?.username,
    display_name: response.account?.name,
    access_token: encrypt(response.accessToken),
    refresh_token: encrypt(response.refreshToken),
    token_expiry: new Date(response.expiresOn!)
  });
  
  // Set up webhook subscription
  await setupWebhookSubscription(supplierId, response.accessToken);
  
  return NextResponse.redirect('/settings/integrations?connected=outlook');
}
```

### 3. Graph Client Helper

```
// lib/integrations/outlook/graph-client.ts
import { Client } from '@microsoft/microsoft-graph-client';

export async function getGraphClient(supplierId: string): Promise<Client> {
  const connection = await getOutlookConnection(supplierId);
  
  // Check if token needs refresh
  if (new Date() >= new Date(connection.token_expiry)) {
    await refreshAccessToken(supplierId);
  }
  
  const authProvider = {
    getAccessToken: async () => decrypt(connection.access_token)
  };
  
  return Client.initWithMiddleware({
    authProvider
  });
}

async function refreshAccessToken(supplierId: string) {
  const connection = await getOutlookConnection(supplierId);
  
  const refreshTokenRequest = {
    refreshToken: decrypt(connection.refresh_token),
    scopes: SCOPES
  };
  
  const response = await pca.acquireTokenByRefreshToken(refreshTokenRequest);
  
  await supabase
    .from('outlook_calendar_connections')
    .update({
      access_token: encrypt(response.accessToken),
      token_expiry: new Date(response.expiresOn!)
    })
    .eq('supplier_id', supplierId);
}
```

### 4. Calendar Operations

```
// services/outlook-calendar-service.ts
export class OutlookCalendarService {
  async getAvailability(supplierId: string, date: Date, duration: number) {
    const client = await getGraphClient(supplierId);
    
    const scheduleInformation = {
      schedules: ['primary'],
      startTime: {
        dateTime: date.toISOString(),
        timeZone: 'UTC'
      },
      endTime: {
        dateTime: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC'
      },
      availabilityViewInterval: 30
    };
    
    const response = await client
      .api('/me/calendar/getSchedule')
      .post(scheduleInformation);
    
    return this.parseAvailability(response.value[0], duration);
  }
  
  async createMeeting({
    supplierId,
    title,
    startTime,
    endTime,
    attendees,
    location,
    body,
    isOnlineMeeting = false
  }: MeetingParams) {
    const client = await getGraphClient(supplierId);
    
    const event: any = {
      subject: title,
      body: {
        contentType: 'HTML',
        content: body || ''
      },
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/London'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/London'
      },
      attendees: [attendees.map](http://attendees.map)(email => ({
        emailAddress: { address: email },
        type: 'required'
      })),
      allowNewTimeProposals: true
    };
    
    if (isOnlineMeeting) {
      event.isOnlineMeeting = true;
      event.onlineMeetingProvider = 'teamsForBusiness';
    }
    
    if (location) {
      event.location = { displayName: location };
    }
    
    const response = await client
      .api('/me/calendar/events')
      .post(event);
    
    return response;
  }
  
  async syncEvents(supplierId: string) {
    const client = await getGraphClient(supplierId);
    const connection = await getOutlookConnection(supplierId);
    
    let url = '/me/calendar/events/delta';
    
    // Use delta link if available
    if ([connection.delta](http://connection.delta)_link) {
      url = [connection.delta](http://connection.delta)_link;
    } else {
      // Initial sync - get events from last 6 months
      const startDateTime = new Date();
      startDateTime.setMonth(startDateTime.getMonth() - 6);
      url += `?startDateTime=${startDateTime.toISOString()}`;
    }
    
    const response = await client.api(url).get();
    
    // Process events
    for (const event of response.value) {
      await this.processEvent(supplierId, event);
    }
    
    // Store delta link for next sync
    if (response['@odata.deltaLink']) {
      await supabase
        .from('outlook_calendar_connections')
        .update({
          delta_link: response['@odata.deltaLink'],
          last_sync: new Date()
        })
        .eq('supplier_id', supplierId);
    }
  }
}
```

### 5. Webhook Subscriptions

```
async function setupWebhookSubscription(supplierId: string, accessToken: string) {
  const client = Client.init({
    authProvider: (done) => done(null, accessToken)
  });
  
  const subscription = {
    changeType: 'created,updated,deleted',
    notificationUrl: `${[process.env.NEXT](http://process.env.NEXT)_PUBLIC_APP_URL}/api/webhooks/outlook`,
    resource: '/me/calendar/events',
    expirationDateTime: new Date([Date.now](http://Date.now)() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    clientState: supplierId
  };
  
  const response = await client.api('/subscriptions').post(subscription);
  
  await supabase
    .from('outlook_calendar_connections')
    .update({
      webhook_subscription_id: [response.id](http://response.id),
      webhook_expiry: response.expirationDateTime
    })
    .eq('supplier_id', supplierId);
}

// app/api/webhooks/outlook/route.ts
export async function POST(req: Request) {
  const validationToken = req.headers.get('validationToken');
  
  // Validation phase
  if (validationToken) {
    return new Response(validationToken, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Notification phase
  const notifications = await req.json();
  
  for (const notification of notifications.value) {
    const supplierId = notification.clientState;
    await processCalendarChange(supplierId, notification);
  }
  
  return new Response('OK', { status: 200 });
}
```

## Critical Implementation Notes

1. **Token Lifetime**: Access tokens expire in 1 hour, refresh tokens in 90 days
2. **Permissions**: Request minimum required permissions for user trust
3. **Delta Sync**: Use delta queries for efficient incremental sync
4. **Rate Limiting**: Handle 429 errors with Retry-After header
5. **Multi-Tenant**: Support both work/school and personal accounts
6. **Teams Meeting**: Requires OnlineMeetings.ReadWrite permission
7. **Webhook Renewal**: Subscriptions expire after 3 days, renew before expiry