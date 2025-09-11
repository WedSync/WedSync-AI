# 02-api-key-management.md

# API Key Management

## What to Build

Secure API key generation and management system for third-party integrations.

## Technical Requirements

- Key generation with scopes
- Rate limiting per key
- Audit logging
- Key rotation support

## Implementation

typescript

`*// API keys table*
api_keys {
  id: uuid
  supplier_id: uuid
  key_hash: text *// SHA-256 of key*
  key_prefix: text *// First 8 chars for identification*
  name: text
  scopes: text[] *// ['read:clients', 'write:forms']*
  rate_limit: integer *// Requests per hour*
  last_used_at: timestamp
  expires_at: timestamp
  created_at: timestamp
  revoked_at: timestamp
}

*// Key generation*
function generateApiKey() {
  const key = `ws_${env}_${randomBytes(32).toString('hex')}`;
  const hash = sha256(key);
  const prefix = key.substring(0, 12);
  
  *// Store hash, return key only once*
  return { key, prefix };
}

*// Middleware*
async function validateApiKey(req) {
  const key = req.headers['x-api-key'];
  const hash = sha256(key);
  const apiKey = await db.query('SELECT * FROM api_keys WHERE key_hash = ?', [hash]);
  
  if (!apiKey || apiKey.revoked_at) throw new UnauthorizedError();
  
  *// Check rate limit*
  await enforceRateLimit(apiKey.id);
  
  *// Log usage*
  await logApiUsage(apiKey.id, req.path);
}`

## Critical Notes

- Show key only once after generation
- Implement key rotation every 90 days
- Log all API calls for security
- Support multiple keys per supplier