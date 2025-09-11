# 03-environment-management.md

# Environment Management for WedSync/WedMe

## What to Build

Implement secure environment variable management across development, staging, and production environments with proper secret rotation and validation.

## Environment Variables Structure

```
// types/env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Application
      NODE_ENV: 'development' | 'test' | 'production'
      NEXT_PUBLIC_APP_URL: string
      NEXT_PUBLIC_APP_NAME: string
      
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string
      SUPABASE_SERVICE_KEY: string
      SUPABASE_JWT_SECRET: string
      
      // Database
      DATABASE_URL: string
      DIRECT_DATABASE_URL: string
      
      // AI Services
      OPENAI_API_KEY: string
      OPENAI_ORG_ID: string
      
      // Communication
      TWILIO_ACCOUNT_SID: string
      TWILIO_AUTH_TOKEN: string
      SENDGRID_API_KEY: string
      
      // Storage
      AWS_ACCESS_KEY_ID: string
      AWS_SECRET_ACCESS_KEY: string
      AWS_REGION: string
      S3_BUCKET: string
      
      // Monitoring
      SENTRY_DSN: string
      VERCEL_ANALYTICS_ID: string
      
      // Feature Flags
      FEATURE_AI_CHATBOT: string
      FEATURE_MARKETPLACE: string
    }
  }
}
```

## Environment Files Setup

```
# .env.local (development)
NODE_ENV=development
NEXT_PUBLIC_APP_URL=[http://localhost:3000](http://localhost:3000)
NEXT_PUBLIC_APP_NAME=WedSync Dev

# Database
DATABASE_URL=postgresql://postgres:[postgres@localhost:5432](mailto:postgres@localhost:5432)/wedsync_dev
DIRECT_DATABASE_URL=postgresql://postgres:[postgres@localhost:5432](mailto:postgres@localhost:5432)/wedsync_dev

# Supabase Local
NEXT_PUBLIC_SUPABASE_URL=[http://localhost:54321](http://localhost:54321)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_KEY=your-local-service-key

# Feature Flags
FEATURE_AI_CHATBOT=true
FEATURE_MARKETPLACE=false
```

## Environment Validation

```
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Required in all environments
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Required in production only
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  
  // Optional
  SENTRY_DSN: z.string().url().optional(),
  FEATURE_AI_CHATBOT: z.string().transform(val => val === 'true').optional(),
})

type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('Environment validation failed:')
    console.error(error)
    
    if (process.env.NODE_ENV === 'production') {
      // Don't start production with invalid env
      process.exit(1)
    }
    
    throw error
  }
}

// Validate on startup
export const env = validateEnv()
```

## Secret Management with Vercel

```
#!/bin/bash
# scripts/[setup-vercel-env.sh](http://setup-vercel-env.sh)

# Development environment
vercel env add NEXT_PUBLIC_SUPABASE_URL development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
vercel env add SUPABASE_SERVICE_KEY development
vercel env add DATABASE_URL development

# Staging environment
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_KEY preview
vercel env add DATABASE_URL preview

# Production environment
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add DATABASE_URL production
vercel env add OPENAI_API_KEY production
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
```

## Environment-Specific Configuration

```
// config/environments.ts
interface EnvironmentConfig {
  name: string
  apiUrl: string
  features: {
    aiChatbot: boolean
    marketplace: boolean
    analytics: boolean
    referrals: boolean
  }
  limits: {
    maxClients: number
    maxFormsPerClient: number
    apiRateLimit: number
  }
}

const configs: Record<string, EnvironmentConfig> = {
  development: {
    name: 'Development',
    apiUrl: '[http://localhost:3000/api](http://localhost:3000/api)',
    features: {
      aiChatbot: true,
      marketplace: true,
      analytics: false,
      referrals: true
    },
    limits: {
      maxClients: 1000,
      maxFormsPerClient: 100,
      apiRateLimit: 1000
    }
  },
  staging: {
    name: 'Staging',
    apiUrl: '[https://staging.wedsync.com/api](https://staging.wedsync.com/api)',
    features: {
      aiChatbot: true,
      marketplace: false,
      analytics: true,
      referrals: true
    },
    limits: {
      maxClients: 500,
      maxFormsPerClient: 50,
      apiRateLimit: 100
    }
  },
  production: {
    name: 'Production',
    apiUrl: '[https://wedsync.com/api](https://wedsync.com/api)',
    features: {
      aiChatbot: true,
      marketplace: false,
      analytics: true,
      referrals: true
    },
    limits: {
      maxClients: 10000,
      maxFormsPerClient: 100,
      apiRateLimit: 50
    }
  }
}

export function getConfig(): EnvironmentConfig {
  const env = [process.env.NEXT](http://process.env.NEXT)_PUBLIC_ENV || 'development'
  return configs[env] || configs.development
}
```

## Feature Flag System

```
// lib/feature-flags.ts
type FeatureFlag = 
  | 'ai-chatbot'
  | 'marketplace'
  | 'advanced-analytics'
  | 'referral-program'
  | 'custom-domains'

class FeatureFlags {
  private flags: Map<FeatureFlag, boolean>
  
  constructor() {
    this.flags = new Map([
      ['ai-chatbot', process.env.FEATURE_AI_CHATBOT === 'true'],
      ['marketplace', process.env.FEATURE_MARKETPLACE === 'true'],
      ['advanced-analytics', process.env.FEATURE_ANALYTICS === 'true'],
      ['referral-program', process.env.FEATURE_REFERRALS === 'true'],
      ['custom-domains', process.env.FEATURE_CUSTOM_DOMAINS === 'true']
    ])
  }
  
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags.get(flag) || false
  }
  
  // React hook
  useFeature(flag: FeatureFlag): boolean {
    return this.isEnabled(flag)
  }
  
  // Server-side check
  async checkRemote(flag: FeatureFlag, userId?: string): Promise<boolean> {
    // Could check against a remote service for A/B testing
    const response = await fetch('/api/features', {
      method: 'POST',
      body: JSON.stringify({ flag, userId })
    })
    
    const data = await response.json()
    return data.enabled
  }
}

export const featureFlags = new FeatureFlags()
```

## Environment Sync Script

```
// scripts/sync-env.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'

const execAsync = promisify(exec)

async function syncEnvironments() {
  console.log('Syncing environment variables...')
  
  // Pull from Vercel
  const { stdout } = await execAsync('vercel env pull .env.production')
  
  // Read production env
  const prodEnv = await fs.readFile('.env.production', 'utf-8')
  const lines = prodEnv.split('\n')
  
  // Filter sensitive variables
  const publicVars = lines.filter(line => 
    line.startsWith('NEXT_PUBLIC_') || 
    line.startsWith('FEATURE_')
  )
  
  // Create staging env
  const stagingEnv = [publicVars.map](http://publicVars.map)(line => {
    if (line.includes('[wedsync.com](http://wedsync.com)')) {
      return line.replace('[wedsync.com](http://wedsync.com)', '[staging.wedsync.com](http://staging.wedsync.com)')
    }
    return line
  })
  
  await fs.writeFile('.env.staging', stagingEnv.join('\n'))
  
  console.log('Environment sync complete')
}

syncEnvironments()
```

## Secret Rotation

```
// scripts/rotate-secrets.ts
import { generateKeyPair } from 'crypto'
import { createClient } from '@supabase/supabase-js'

async function rotateSecrets() {
  console.log('Starting secret rotation...')
  
  // Generate new JWT secret
  const { publicKey, privateKey } = generateKeyPair('rsa', {
    modulusLength: 2048,
  })
  
  // Update in Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
  
  // Store old keys for rollback
  await supabase.from('secret_rotation_log').insert({
    secret_type: 'jwt',
    old_value_hash: hashSecret(process.env.SUPABASE_JWT_SECRET!),
    rotated_at: new Date().toISOString(),
    rotated_by: 'system'
  })
  
  // Update Vercel
  await execAsync(`vercel env rm SUPABASE_JWT_SECRET production -y`)
  await execAsync(`echo "${privateKey}" | vercel env add SUPABASE_JWT_SECRET production`)
  
  // Trigger redeployment
  await execAsync('vercel --prod')
  
  console.log('Secret rotation complete')
}

function hashSecret(secret: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(secret).digest('hex')
}
```

## Critical Implementation Notes

1. **Never commit .env files** - Add to .gitignore
2. **Use least privilege** - Only expose necessary variables
3. **Rotate secrets regularly** - Every 90 days minimum
4. **Audit access logs** - Track who accessed production secrets
5. **Validate all environments** - Catch config issues early

## Environment Checklist

```
## Deployment Environment Checklist

### Development
- [ ] .env.local configured
- [ ] Local Supabase running
- [ ] Test data seeded
- [ ] Feature flags set to test mode

### Staging
- [ ] All production services connected
- [ ] Test payment credentials
- [ ] Monitoring enabled
- [ ] Error tracking active

### Production
- [ ] All secrets rotated
- [ ] Backup strategy confirmed
- [ ] Rate limiting configured
- [ ] SSL certificates valid
- [ ] DNS configured correctly
```