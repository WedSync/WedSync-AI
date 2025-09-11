# Integration Environment Management - Troubleshooting Guide

## Quick Diagnostic Commands

Before diving into specific issues, run these commands to get an overview of system health:

```bash
# 1. Run comprehensive validation
npx tsx scripts/validate-environment-integration.ts

# 2. Check environment detection
node -e "console.log('Environment:', require('./src/lib/config/environment').detectEnvironment())"

# 3. Test database connectivity
npx supabase status --linked

# 4. Verify environment variables
node -e "console.log('Missing vars:', ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !process.env[k]))"
```

## Issue Categories

### 🔐 Secret Management Issues

#### Issue: `Failed to retrieve secret: stripe_secret_key`

**Symptoms:**
- API calls failing with authentication errors
- `SecretManager` throwing retrieval errors
- Applications unable to connect to third-party services

**Common Causes & Solutions:**

1. **Missing Environment Variable**
   ```bash
   # Check if base env var exists
   echo $STRIPE_SECRET_KEY_PRODUCTION
   
   # Solution: Add to environment
   export STRIPE_SECRET_KEY_PRODUCTION=sk_live_...
   ```

2. **Wrong Environment Detection**
   ```bash
   # Debug environment detection
   node -e "
   const { detectEnvironment } = require('./src/lib/config/environment');
   console.log('Detected:', detectEnvironment());
   console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
   console.log('NODE_ENV:', process.env.NODE_ENV);
   console.log('NEXT_PUBLIC_ENV:', process.env.NEXT_PUBLIC_ENV);
   "
   
   # Solution: Set correct environment indicators
   export VERCEL_ENV=production  # or preview for staging
   ```

3. **Database Access Issue**
   ```bash
   # Test Supabase connection
   npx supabase status --linked
   
   # Check RLS policies
   npx supabase sql --linked --file - <<EOF
   SELECT * FROM secret_vault LIMIT 1;
   EOF
   
   # Solution: Verify service role key
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Secret Not in Vault**
   ```typescript
   // Check if secret exists in vault
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );
   
   const result = await supabase
     .from('secret_vault')
     .select('secret_key')
     .like('secret_key', '%stripe%');
   
   console.log('Stripe secrets:', result.data);
   ```

#### Issue: `Secret rotation is restricted during wedding days`

**Symptoms:**
- Rotation attempts failing on Saturdays
- Emergency updates blocked
- Cannot update critical API keys

**Solutions:**

1. **Wait Until Sunday (Recommended)**
   ```bash
   # Check current day
   date +%A
   
   # If Saturday, wait until Sunday unless emergency
   ```

2. **Request Emergency Override**
   ```typescript
   // In emergency situations only
   const override = await weddingDayManager.requestEmergencyOverride(
     'SECRET_ROTATION',
     'Security vulnerability CVE-2024-XXXX requires immediate key rotation'
   );
   
   // Get approvals from 2+ admins
   ```

3. **Schedule for Sunday**
   ```bash
   # Use cron to schedule for Sunday 2 AM
   0 2 * * 0 /path/to/rotation-script.sh
   ```

#### Issue: Secret caching issues

**Symptoms:**
- Old secrets still being used after rotation
- Inconsistent behavior across requests
- Cache hit/miss imbalances

**Solutions:**

1. **Clear Cache Manually**
   ```typescript
   // Clear specific secret cache
   const secretManager = SecretManager.getInstance();
   secretManager.clearCache('stripe_secret_key');
   
   // Or restart application to clear all caches
   ```

2. **Adjust TTL Settings**
   ```typescript
   // For high-rotation secrets, reduce TTL
   const SHORT_TTL = 1 * 60 * 1000; // 1 minute
   const NORMAL_TTL = 5 * 60 * 1000; // 5 minutes
   ```

### 🔗 Webhook Validation Issues

#### Issue: `WebhookError: Signature validation failed`

**Symptoms:**
- All webhook requests being rejected
- 400 Bad Request responses
- Audit logs showing signature failures

**Diagnostic Steps:**

1. **Verify Raw Payload**
   ```typescript
   // Ensure payload is raw string, not parsed JSON
   const payload = await request.text(); // ✅ Correct
   const payload = JSON.stringify(await request.json()); // ❌ Wrong
   ```

2. **Check Secret Configuration**
   ```bash
   # Verify webhook secret is set for current environment
   node -e "
   const env = require('./src/lib/config/environment').detectEnvironment();
   console.log('Environment:', env);
   console.log('Webhook secret env var:', \`WEBHOOK_SIGNING_SECRET_\${env.toUpperCase()}\`);
   "
   ```

3. **Test Signature Generation**
   ```typescript
   // Manual signature verification
   const crypto = require('crypto');
   const payload = '{"test": "data"}';
   const secret = 'your_webhook_secret';
   
   const signature = crypto
     .createHmac('sha256', secret)
     .update(payload)
     .digest('hex');
   
   console.log('Expected signature:', signature);
   ```

**Common Solutions:**

1. **Stripe Webhook Configuration**
   ```bash
   # Check Stripe webhook endpoint configuration
   stripe webhooks list
   
   # Verify endpoint URL matches environment
   # Dev: http://localhost:3000/api/webhooks/stripe
   # Staging: https://staging.wedsync.com/api/webhooks/stripe
   # Prod: https://app.wedsync.com/api/webhooks/stripe
   ```

2. **Update Webhook Secret**
   ```typescript
   // Rotate webhook secret
   const secretManager = SecretManager.getInstance();
   await secretManager.rotateSecret('webhook_stripe_secret', 'whsec_new_secret');
   
   // Update in Stripe dashboard
   ```

#### Issue: `WebhookError: Origin blocked`

**Symptoms:**
- Webhooks rejected due to IP validation
- Foreign IP addresses in logs
- User-Agent validation failures

**Solutions:**

1. **Update IP Whitelist**
   ```typescript
   // Check current Stripe IPs (these change periodically)
   const CURRENT_STRIPE_IPS = [
     '3.18.12.63', '3.130.192.231', '13.235.14.237',
     // Add new IPs as Stripe updates them
   ];
   ```

2. **Verify User-Agent Validation**
   ```typescript
   // Expected User-Agents
   const VALID_AGENTS = [
     'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
     'Google-Webhooks/1.0',
     'GoogleHC/1.0'
   ];
   ```

3. **Disable Origin Validation (Development Only)**
   ```typescript
   // For local development only
   export const POST = withWebhookSecurity({
     provider: 'stripe',
     enableOriginValidation: false, // Only for localhost
     enableSignatureValidation: true
   })(handler);
   ```

### 🌍 Environment Configuration Issues

#### Issue: Wrong environment detected

**Symptoms:**
- Wrong configuration loaded (dev config in production)
- Incorrect API endpoints
- Wrong database connections

**Diagnostic Commands:**
```bash
# Check all environment indicators
echo "NODE_ENV: $NODE_ENV"
echo "VERCEL_ENV: $VERCEL_ENV" 
echo "NEXT_PUBLIC_ENV: $NEXT_PUBLIC_ENV"
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"

# Test detection logic
node -e "
const { detectEnvironment } = require('./src/lib/config/environment');
console.log('Final environment:', detectEnvironment());
"
```

**Solutions:**

1. **Vercel Deployment (Highest Priority)**
   ```bash
   # Set in Vercel dashboard or CLI
   vercel env add VERCEL_ENV production
   ```

2. **Manual Environment Override**
   ```bash
   # For staging deployments
   export NEXT_PUBLIC_ENV=staging
   export NEXT_PUBLIC_APP_URL=https://staging.wedsync.com
   ```

3. **URL-Based Detection**
   ```bash
   # Ensure staging URLs contain 'staging'
   export NEXT_PUBLIC_APP_URL=https://staging.wedsync.com
   ```

#### Issue: Missing environment variables

**Symptoms:**
- Application startup failures
- Missing configuration errors
- Third-party service connection failures

**Automated Check:**
```bash
# Run environment variable validation
node -e "
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'RESEND_API_KEY'
];

const missing = requiredVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('Missing environment variables:', missing);
  process.exit(1);
} else {
  console.log('All required environment variables present');
}
"
```

**Solutions:**

1. **Copy from Template**
   ```bash
   # Copy and fill environment template
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Environment-Specific Setup**
   ```bash
   # Development
   export GOOGLE_CALENDAR_DEV_CLIENT_ID=your_dev_id
   
   # Staging
   export GOOGLE_CALENDAR_STAGING_CLIENT_ID=your_staging_id
   
   # Production  
   export GOOGLE_CALENDAR_PRODUCTION_CLIENT_ID=your_prod_id
   ```

### 🏥 Integration Health Issues

#### Issue: Integration health checks failing

**Symptoms:**
- Services showing as "down" in monitoring
- False positive alerts
- Intermittent connection issues

**Diagnostic Steps:**

1. **Check Third-Party Service Status**
   ```bash
   # Stripe status
   curl -s https://status.stripe.com/api/v2/status.json | jq '.status.description'
   
   # Google Calendar API
   curl -s "https://www.googleapis.com/calendar/v3/calendars/primary" \
     -H "Authorization: Bearer $GOOGLE_ACCESS_TOKEN"
   ```

2. **Test Direct API Connections**
   ```typescript
   // Test Stripe connection
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   const account = await stripe.accounts.retrieve();
   console.log('Stripe account:', account.id);
   
   // Test Google Calendar
   const { google } = require('googleapis');
   const calendar = google.calendar('v3');
   ```

3. **Check Network Connectivity**
   ```bash
   # Test DNS resolution
   nslookup api.stripe.com
   
   # Test HTTPS connectivity
   curl -I https://api.stripe.com
   ```

**Solutions:**

1. **Adjust Health Check Timeouts**
   ```sql
   -- Increase timeout for slower services
   UPDATE integration_health 
   SET timeout_seconds = 60 
   WHERE integration_name = 'google_calendar';
   ```

2. **Configure Fallback Services**
   ```typescript
   // Email fallback configuration
   const emailConfig = {
     primary: { provider: 'resend', apiKey: process.env.RESEND_API_KEY },
     fallback: { provider: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY }
   };
   ```

3. **Update Service Endpoints**
   ```typescript
   // Regional endpoint for better performance
   const stripeConfig = {
     apiBase: 'https://api.stripe.com', // US
     // apiBase: 'https://api.eu.stripe.com', // EU
   };
   ```

### 💒 Wedding Day Protection Issues

#### Issue: Saturday operations blocked incorrectly

**Symptoms:**
- Normal operations blocked on non-Saturday
- Wedding detection false positives
- Emergency procedures not working

**Debug Wedding Day Detection:**
```typescript
// Test wedding day detection logic
const today = new Date();
const isSaturday = today.getDay() === 6;

console.log('Today:', today.toDateString());
console.log('Is Saturday:', isSaturday);

// Check for active weddings
const { data } = await supabase
  .from('events')
  .select('id, event_date')
  .eq('event_date', today.toISOString().split('T')[0])
  .eq('event_type', 'wedding');

console.log('Active weddings:', data?.length || 0);
```

**Solutions:**

1. **Override Wedding Day Detection**
   ```sql
   -- Temporarily disable wedding day restriction
   UPDATE wedding_day_restrictions 
   SET is_active = false 
   WHERE restriction_date = CURRENT_DATE;
   ```

2. **Emergency Override Process**
   ```typescript
   // Request emergency override
   const override = await weddingDayManager.requestEmergencyOverride(
     'DATABASE_MIGRATION',
     'Critical bug fix required before tonight events'
   );
   
   // Multiple admin approvals required
   await weddingDayManager.approveOverride(override.id, admin1Id);
   await weddingDayManager.approveOverride(override.id, admin2Id);
   ```

### 📊 Performance Issues

#### Issue: Slow secret retrieval

**Symptoms:**
- API requests timing out
- Long response times
- High database load

**Performance Diagnostics:**
```sql
-- Check secret vault query performance
EXPLAIN ANALYZE 
SELECT secret_value FROM secret_vault 
WHERE secret_key = 'production_wedsync_stripe_secret_key' 
AND is_active = true;

-- Check cache hit rates (if using Redis)
SELECT 
  (cache_hits::FLOAT / (cache_hits + cache_misses)) * 100 AS hit_rate_percent
FROM cache_stats;
```

**Solutions:**

1. **Optimize Database Indexes**
   ```sql
   -- Create optimized index for hot lookups
   CREATE INDEX CONCURRENTLY idx_secret_vault_hot_lookup 
   ON secret_vault(secret_key, is_active) 
   WHERE is_active = true;
   ```

2. **Implement Redis Cache**
   ```typescript
   // Use Redis for high-traffic deployments
   const redis = new Redis(process.env.REDIS_URL);
   
   const cachedSecret = await redis.get(`secret:${environmentKey}`);
   if (cachedSecret) {
     return cachedSecret;
   }
   ```

3. **Adjust Cache TTL**
   ```typescript
   // Longer TTL for stable secrets
   const STABLE_SECRET_TTL = 15 * 60 * 1000; // 15 minutes
   const VOLATILE_SECRET_TTL = 2 * 60 * 1000; // 2 minutes
   ```

#### Issue: High webhook latency

**Symptoms:**
- Webhook timeouts
- Provider retry notifications
- Slow validation responses

**Solutions:**

1. **Optimize Signature Validation**
   ```typescript
   // Cache HMAC computation for repeated validations
   const signatureCache = new Map();
   const cacheKey = `${provider}:${payload.slice(0, 50)}`;
   
   if (signatureCache.has(cacheKey)) {
     return signatureCache.get(cacheKey);
   }
   ```

2. **Async Audit Logging**
   ```typescript
   // Don't wait for audit logging
   logWebhookAttempt(provider, request, details)
     .catch(error => console.error('Audit logging failed:', error));
   ```

3. **Connection Pooling**
   ```typescript
   // Use connection pooling for database access
   const supabase = createClient(url, key, {
     db: { schema: 'public' },
     global: { headers: { 'Connection': 'keep-alive' } }
   });
   ```

## Emergency Procedures

### Critical System Failure

1. **Immediate Actions**
   ```bash
   # Check system status
   npx tsx scripts/validate-environment-integration.ts
   
   # Enable emergency mode (bypasses some validations)
   export EMERGENCY_MODE=true
   ```

2. **Rollback Procedures**
   ```typescript
   // Rollback to last known good configuration
   const snapshots = await secretManager.listSnapshots();
   const lastGoodSnapshot = snapshots[0]; // Most recent
   
   await secretManager.rollbackToSnapshot(lastGoodSnapshot.id);
   ```

3. **Fallback to Manual Operations**
   ```bash
   # Disable automated systems temporarily
   export DISABLE_WEBHOOK_VALIDATION=true
   export DISABLE_SECRET_ROTATION=true
   
   # Manual secret management
   npx supabase sql --linked --file manual-secret-update.sql
   ```

### Wedding Day Emergency

1. **Override Saturday Restrictions**
   ```sql
   -- Enable emergency override
   INSERT INTO wedding_day_restrictions (
     restriction_date,
     restriction_type,
     override_enabled,
     override_reason
   ) VALUES (
     CURRENT_DATE,
     'emergency',
     true,
     'Critical system failure during active weddings'
   );
   ```

2. **Minimal Impact Fixes**
   ```typescript
   // Use read-only operations where possible
   const config = await getEnvironmentConfig();
   
   // Avoid secret rotation during active events
   if (await isActiveWeddingDay()) {
     console.warn('Using cached secrets due to active weddings');
     return getCachedSecret(key);
   }
   ```

### Communication Templates

#### Incident Report Template

```markdown
## Integration Environment Incident Report

**Date**: [DATE]
**Severity**: [P0/P1/P2/P3]
**Status**: [INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED]

### Impact
- **Services Affected**: [List affected integrations]
- **Users Affected**: [Number/percentage of users]
- **Wedding Day Impact**: [Yes/No - if yes, high priority]

### Timeline
- **Detection**: [Time issue was first detected]
- **Response**: [Time team started responding]
- **Resolution**: [Time issue was resolved]

### Root Cause
[Detailed analysis of what caused the issue]

### Resolution
[Steps taken to resolve the issue]

### Prevention
[Changes made to prevent recurrence]
```

#### Wedding Day Communication

```markdown
Subject: URGENT - Wedding Day System Issue

Dear Team,

We have detected an issue with our integration environment management system during active wedding operations.

**Status**: [Current status]
**Impact**: [Specific impact on wedding coordination]
**ETA for Resolution**: [Estimated time]

**Immediate Actions Taken**:
- [List actions]

**Workarounds Available**:
- [List workarounds for vendors]

This is our highest priority. Updates every 15 minutes until resolved.

[Your Name]
On-Call Engineering Team
```

## Prevention and Monitoring

### Proactive Monitoring Setup

1. **Health Check Automation**
   ```bash
   # Set up cron jobs for regular health checks
   */5 * * * * /usr/local/bin/health-check.sh
   0 */6 * * * /usr/local/bin/integration-validation.sh
   ```

2. **Alert Configuration**
   ```yaml
   # alerts.yml
   alerts:
     - name: secret_retrieval_failure
       condition: error_rate > 5%
       duration: 5m
       
     - name: webhook_validation_failure  
       condition: failure_rate > 1%
       duration: 2m
       
     - name: wedding_day_operation
       condition: restricted_operation_attempted = true
       duration: 0s
   ```

3. **Dashboard Setup**
   ```typescript
   // Key metrics to monitor
   const metrics = [
     'secret_access_rate',
     'webhook_success_rate', 
     'integration_response_time',
     'security_score_average',
     'wedding_day_restriction_triggers'
   ];
   ```

### Regular Maintenance

**Daily Tasks**:
```bash
# Check logs for anomalies
tail -f logs/integration-*.log | grep ERROR

# Verify backup processes
ls -la backups/ | head -5

# Monitor disk usage for audit logs
df -h | grep audit
```

**Weekly Tasks**:
```bash
# Comprehensive health check
npx tsx scripts/validate-environment-integration.ts

# Review security audit logs  
npx tsx scripts/analyze-security-logs.ts --days 7

# Test disaster recovery procedures
npx tsx scripts/test-disaster-recovery.ts --dry-run
```

**Monthly Tasks**:
```bash
# Update third-party IP whitelists
npx tsx scripts/update-ip-whitelists.ts

# Review and rotate long-lived secrets
npx tsx scripts/scheduled-secret-rotation.ts

# Performance optimization review
npx tsx scripts/performance-analysis.ts
```

---

*For additional support, please contact the engineering team with the output of the validation script and relevant log excerpts.*