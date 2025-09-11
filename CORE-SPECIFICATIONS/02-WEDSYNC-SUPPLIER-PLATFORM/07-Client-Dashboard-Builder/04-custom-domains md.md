# 04-custom-domains.md

## Overview

Custom domain setup allowing suppliers to host client dashboards on their own domains.

## Domain Configuration

```
interface CustomDomain {
  domain: string // '[clients.yourphotography.com](http://clients.yourphotography.com)'
  status: 'pending' | 'active' | 'error'
  sslCertificate: SSLStatus
  dnsRecords: DNSRecord[]
  verifiedAt?: Date
}
```

## Setup Process

### Step 1: Domain Entry

```
// Validate domain format
function validateDomain(domain: string): boolean {
  const pattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
  return pattern.test(domain)
}
```

### Step 2: DNS Configuration

```
const requiredRecords = [
  {
    type: 'CNAME',
    host: 'clients',
    value: '[custom.wedsync.app](http://custom.wedsync.app)',
    ttl: 3600
  }
]
```

### Step 3: Verification

- Automatic DNS checking
- Propagation monitoring
- Error diagnosis
- Retry mechanism

### Step 4: SSL Certificate

- Let's Encrypt auto-generation
- Certificate renewal handling
- Force HTTPS redirect
- Security headers

## Routing Logic

```
// Request handling
function handleCustomDomain(request: Request) {
  const domain = request.hostname
  const supplier = findSupplierByDomain(domain)
  
  if (supplier) {
    return renderDashboard(supplier.template)
  }
  return redirect('[https://wedsync.app](https://wedsync.app)')
}
```

## Multi-Domain Support

- Multiple domains per supplier
- Domain-specific templates
- A/B testing different domains
- Analytics per domain

## Edge Cases

- WWW vs non-WWW handling
- Subdomain wildcards
- Domain expiration alerts
- Transfer/migration support