# 02-environment-variables.md

# Environment Variables Management

## Purpose

Securely manage configuration across development, staging, and production environments.

## Environment Structure

### Critical Variables

```
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..." # For migrations

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[project].[supabase.co](http://supabase.co)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..." # Server-only!

# Authentication 
NEXTAUTH_URL="[https://wedsync.app](https://wedsync.app)"
NEXTAUTH_SECRET="[32-char-random-string]"

# External APIs
OPENAI_API_KEY="sk-..."
RESEND_API_KEY="re_..."
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Public vs Private Variables

```
// Public (client-side accessible)
NEXT_PUBLIC_* - Exposed to browser
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_GOOGLE_MAPS_KEY

// Private (server-only)
DATABASE_URL - Never expose
API_KEYS - Keep server-side
SECRET_KEYS - Encryption/signing
```

## Environment Files

### Local Development

```
.env.local          # Local overrides (gitignored)
.env.development    # Development defaults
.env.test          # Test environment
```

### Production Setup

```
# Use Vercel Environment Variables UI
# Never commit .env.production
# Rotate keys regularly
```

## Security Best Practices

### Key Rotation Schedule

- API Keys: Every 90 days
- Database passwords: Every 180 days
- JWT secrets: Every 365 days
- Webhook secrets: On compromise only

### Access Control

- Limit production access to essential team members
- Use separate keys per environment
- Never reuse development keys in production
- Audit environment variable access logs

## Validation Strategy

### Runtime Validation

```
// env.mjs - Validate at build time
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  // ... all required vars
})

// Throw if missing required vars
envSchema.parse(process.env)
```

## Development Workflow

### Setting Up New Developer

1. Copy .env.example to .env.local
2. Get development keys from team vault
3. Never use production keys locally
4. Use Docker for service dependencies

### Adding New Variables

1. Add to .env.example with placeholder
2. Document in this file
3. Add validation in env.mjs
4. Update CI/CD configs
5. Add to Vercel dashboard

## Critical Considerations

- Never log environment variables
- Use secrets manager for sensitive data
- Implement variable encryption at rest
- Monitor for exposed keys in code
- Set up alerts for failed validations