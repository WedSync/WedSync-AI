# 01-phase-1-mvp.md

## What to Build

Core authentication and basic supplier dashboard with client management capabilities. This phase establishes the foundation for both WedSync (supplier) and WedMe (couple) platforms.

## Week 1-2: Authentication & Database Foundation

### Technical Requirements

```
// Supabase auth setup
interface AuthSystem {
  userTypes: 'supplier' | 'couple'
  authMethods: ['email', 'google', 'magic_link']
  sessionManagement: {
    duration: '7_days'
    refresh: 'automatic'
    multiDevice: true
  }
}

// Database tables to create
const coreTables = [
  'suppliers',
  'couples', 
  'clients',
  'core_fields',
  'supplier_couple_connections'
]
```

### Implementation Steps

1. **Supabase Project Setup**
    - Create project with proper region selection
    - Enable email auth and Google OAuth
    - Configure auth redirects for both domains
2. **Database Schema**

```
-- Essential tables only
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  business_name TEXT,
  vendor_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner1_name TEXT,
  partner2_name TEXT,
  wedding_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

1. **Row Level Security**

```
-- Suppliers see only their data
CREATE POLICY supplier_isolation ON suppliers
  FOR ALL USING (auth.uid() = user_id);
```

## Week 3: Basic Supplier Dashboard

### Core Components

```
// Dashboard layout structure
const MVPDashboard = {
  navigation: ['Dashboard', 'Clients', 'Settings'],
  widgets: [
    'WelcomeMessage',
    'ClientList', 
    'QuickActions'
  ],
  mobile: 'responsive_not_optimized'
}
```

### Client Management Interface

```
// Basic client list component
const ClientList = () => {
  return (
    <div className="grid gap-4">
      {/* Simple table view */}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Couple Names</TableHeader>
            <TableHeader>Wedding Date</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {[clients.map](http://clients.map)(client => (
            <ClientRow key={[client.id](http://client.id)} {...client} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Critical Implementation Notes

1. **No fancy features** - Just CRUD operations
2. **Manual client addition only** - No import yet
3. **Basic form for client details** - Name, email, wedding date
4. **Simple connection invites** - Email with signup link

## Week 4: Couple Dashboard & Connection

### WedMe Basic Setup

```
interface CoupleOnboarding {
  steps: [
    'CreateAccount',
    'BasicDetails', // Names, wedding date
    'ConnectSupplier' // Accept invitation
  ],
  skipOptional: true,
  timeToComplete: '<2 minutes'
}
```

### Connection Flow

```
// Supplier invites couple
const inviteCouple = async (clientId: string) => {
  const inviteCode = generateInviteCode()
  
  await supabase.from('invitations').insert({
    supplier_id: supplierId,
    client_id: clientId,
    code: inviteCode,
    expires_at: '7_days_from_now'
  })
  
  await sendInviteEmail([client.email](http://client.email), inviteCode)
}

// Couple accepts invitation
const acceptInvite = async (code: string) => {
  const invite = await validateInviteCode(code)
  
  await supabase.from('supplier_couple_connections').insert({
    supplier_id: invite.supplier_id,
    couple_id: currentCoupleId,
    status: 'connected'
  })
}
```

## Database Structure

```
-- Minimal viable schema
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id),
  client_email TEXT,
  code TEXT UNIQUE,
  accepted BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ
);

CREATE TABLE supplier_couple_connections (
  supplier_id UUID REFERENCES suppliers(id),
  couple_id UUID REFERENCES couples(id),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (supplier_id, couple_id)
);
```

## API Endpoints Required

```
// Minimum viable API
const mvpEndpoints = [
  'POST /api/auth/signup',
  'POST /api/auth/login', 
  'GET /api/clients',
  'POST /api/clients',
  'POST /api/invitations/send',
  'POST /api/invitations/accept'
]
```

## Success Criteria

1. Supplier can create account and log in
2. Supplier can manually add clients
3. Supplier can invite clients to WedMe
4. Couple can accept invitation and connect
5. Both can see connection status
6. Works on mobile (not optimized)

## What NOT to Build Yet

- No forms system
- No automation/journeys
- No payment processing
- No fancy UI animations
- No AI features
- No marketplace
- No directory

## Technical Stack for MVP

```json
{
  "frontend": "Next.js with Untitled UI + Magic UI",
  "database": "Supabase (PostgreSQL)",
  "auth": "Supabase Auth",
  "email": "Resend or Supabase Email",
  "hosting": "Vercel",
  "monitoring": "Vercel Analytics only"
}
```