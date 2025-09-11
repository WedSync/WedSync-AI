Authentication & Security System Documentation
Overview
The authentication and security system protects your platform by controlling who can access what, tracking all activities, and ensuring data remains private and secure. Think of it as the locks, cameras, and security guards for your digital platform.
Core Security Components
1. Authentication System (Who Are You?)
User Registration Flow
Sub-agent tasks for signup:
1. Create signup form with fields:
   - Email address (validate format)
   - Password (minimum 8 characters)
   - Confirm password (must match)
   - Business name (for suppliers)
   - User type (supplier or couple)

2. Email verification process:
   - Send verification email
   - Include 6-digit code
   - Expire after 24 hours
   - Resend option available

3. Account creation steps:
   - Check email doesn't exist
   - Hash password (never store plain text)
   - Create user record in database
   - Send welcome email
   - Auto-login after verification
Login System
Standard login:
- Email + password fields
- "Remember me" checkbox (30 days)
- "Forgot password?" link
- Show/hide password toggle
- Failed attempt counter (lock after 5)

Social login options:
- Google OAuth (one-click)
- Apple Sign In (for iOS users)
- Microsoft (for business accounts)
Password Management
Password requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
- Not same as email
- Not common passwords (check list)

Password reset flow:
1. User clicks "Forgot password"
2. Enter email address
3. Receive reset link (expires in 1 hour)
4. Click link to reset page
5. Enter new password twice
6. Auto-login after reset
2. Authorization System (What Can You Do?)
Role-Based Access Control (RBAC)
User roles to implement:

SUPPLIER ROLES:
- Owner (full access)
- Admin (manage team)
- Staff (limited access)
- Viewer (read-only)

COUPLE ROLES:
- Primary (full access)
- Partner (full access)
- Guest (view only)

SYSTEM ROLES:
- Super Admin (you)
- Support Staff
- Developer
Permission Matrix
Create permission table:

Suppliers can:
- View own clients only
- Edit own forms only
- Access own analytics
- Invite team members
- Manage billing

Couples can:
- View connected suppliers
- Edit own information
- Complete forms
- Invite partner
- View progress

System admins can:
- View all data
- Impersonate users (for support)
- Access system metrics
- Manage platform settings
3. Session Management
Session Security
Session configuration:
- Session duration: 7 days active
- Idle timeout: 30 minutes
- Maximum sessions: 5 devices
- Session token rotation every 24 hours

Session storage:
- Use httpOnly cookies
- Secure flag (HTTPS only)
- SameSite=Strict
- Store session ID only
- Keep sensitive data server-side
Multi-Device Management
Device tracking:
- Record device fingerprint
- Track IP address
- Note browser/OS
- Location (country level)
- Last active time

Device management UI:
- Show active sessions list
- "Sign out all devices" button
- Suspicious login alerts
- New device notifications
4. Data Encryption
Encryption Layers
At rest (database):
- All personal data encrypted
- AES-256 encryption
- Unique encryption keys per tenant
- Key rotation every 90 days

In transit (network):
- Force HTTPS everywhere
- TLS 1.3 minimum
- Certificate pinning for mobile
- Encrypt API payloads

Application level:
- Hash all passwords (bcrypt)
- Encrypt sensitive fields (SSN, bank)
- Tokenize payment data
- Mask display values (****1234)
5. API Security
API Authentication
API key system:
- Generate unique API keys
- Scope permissions per key
- Rate limiting per key
- Expiration dates
- Revoke capability

Request signing:
- HMAC signature required
- Timestamp validation (5-minute window)
- Nonce to prevent replay
- IP whitelist option
Rate Limiting Rules
Default limits:
- 100 requests per minute (general)
- 10 login attempts per hour
- 5 password resets per day
- 1000 API calls per hour
- 50 bulk operations per day

Response headers:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
- Retry-After (when limited)
6. Security Monitoring
Audit Logging System
Log these events:
- User login/logout
- Password changes
- Permission changes
- Data exports
- Bulk operations
- Failed attempts
- API usage
- Admin actions

Log structure:
- Timestamp
- User ID
- IP address
- Action type
- Resource affected
- Result (success/failure)
- User agent
Threat Detection
Monitor for:
- Multiple failed logins
- Unusual geographic access
- Rapid API calls
- Data scraping patterns
- SQL injection attempts
- XSS attempts
- Brute force attacks

Automatic responses:
- Block IP after 10 failures
- Challenge with CAPTCHA
- Send alert emails
- Temporary account lock
- Require 2FA
7. Two-Factor Authentication (2FA)
2FA Implementation
Methods to support:
- SMS code (Twilio integration)
- Authenticator app (Google, Authy)
- Email code (backup method)
- Recovery codes (one-time use)

Setup flow:
1. User enables 2FA in settings
2. Choose primary method
3. Verify phone/app setup
4. Generate recovery codes
5. Download/print codes
6. Test 2FA login
2FA Enforcement
Required for:
- Admin accounts (mandatory)
- After suspicious login
- High-value operations
- API key generation
- Billing changes
Implementation Steps for Claude Code
Phase 1: Basic Authentication
Sub-agent 1 tasks:
1. Install Supabase Auth
2. Create signup component
3. Create login component
4. Add password reset flow
5. Implement email verification
Phase 2: Authorization System
Sub-agent 2 tasks:
1. Create roles table in database
2. Create permissions table
3. Build role assignment UI
4. Add permission checks to API
5. Implement Row Level Security
Phase 3: Session Management
Sub-agent 3 tasks:
1. Configure session settings
2. Build device management UI
3. Add session list view
4. Implement logout everywhere
5. Add idle timeout handler
Phase 4: Security Features
Sub-agent 4 tasks:
1. Add rate limiting middleware
2. Implement audit logging
3. Create security dashboard
4. Add 2FA setup flow
5. Build threat detection
Database Schema for Security
Required Tables
users table:
- id (UUID)
- email (unique)
- password_hash
- email_verified (boolean)
- created_at
- last_login
- failed_attempts
- locked_until
- two_fa_enabled
- two_fa_secret

sessions table:
- id (UUID)
- user_id
- token_hash
- ip_address
- user_agent
- expires_at
- created_at
- last_active

audit_logs table:
- id (UUID)
- user_id
- action
- resource_type
- resource_id
- ip_address
- user_agent
- result
- metadata (JSON)
- created_at

security_events table:
- id (UUID)
- event_type
- severity
- user_id
- ip_address
- details (JSON)
- resolved (boolean)
- created_at
React Components for Security
Authentication Components
components/auth/
├── LoginForm.tsx
├── SignupForm.tsx
├── PasswordReset.tsx
├── EmailVerification.tsx
├── TwoFactorSetup.tsx
├── TwoFactorVerify.tsx
└── SocialLogins.tsx
Security UI Components
components/security/
├── SessionList.tsx
├── SecurityDashboard.tsx
├── AuditLog.tsx
├── PermissionManager.tsx
├── RoleAssignment.tsx
└── SecurityAlerts.tsx
API Security Endpoints
Authentication Endpoints
POST /api/auth/signup - Create account
POST /api/auth/login - Login
POST /api/auth/logout - Logout
POST /api/auth/refresh - Refresh token
POST /api/auth/verify-email - Verify email
POST /api/auth/reset-password - Reset password
Security Management Endpoints
GET /api/security/sessions - List sessions
DELETE /api/security/sessions/:id - End session
GET /api/security/audit-log - View audit log
POST /api/security/2fa/enable - Enable 2FA
POST /api/security/2fa/verify - Verify 2FA code
Security Headers Configuration
Required HTTP Headers
Add to all responses:
- Strict-Transport-Security: max-age=31536000
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: default-src 'self'
- Referrer-Policy: strict-origin-when-cross-origin
Error Handling for Security
Security Error Messages
Never reveal:
- "Email not found" (say "Invalid credentials")
- "Password incorrect" (say "Invalid credentials")
- "Account locked" (might reveal valid email)
- Database errors (generic "Error occurred")
- Stack traces (log them, don't show)

Safe messages:
- "Invalid credentials"
- "Too many attempts"
- "Session expired"
- "Unauthorized access"
- "Please try again"
GDPR & Privacy Compliance
Required Features
User rights to implement:
- View all personal data
- Download data (JSON/CSV)
- Delete account
- Opt-out of tracking
- Cookie consent banner
- Privacy policy acceptance
- Terms of service agreement

Data retention:
- Active accounts: Keep all data
- Inactive 2 years: Archive
- Deleted accounts: Remove after 30 days
- Logs: Keep 90 days
- Backups: 30 days
Security Testing Checklist
Test Scenarios
Authentication tests:
- Valid login works
- Invalid login fails
- Password reset works
- Email verification works
- Session expires properly
- Logout clears session

Security tests:
- SQL injection blocked
- XSS attempts sanitized
- CSRF tokens validated
- Rate limiting works
- Audit logs created
- 2FA blocks access
Monitoring & Alerts
Security Alerts to Configure
Send immediate alerts for:
- Admin login from new location
- Multiple failed login attempts
- Unusual data access patterns
- API rate limit exceeded
- New device login
- Password reset requested
- 2FA disabled
- Bulk data export

Alert channels:
- Email (primary)
- SMS (critical only)
- Slack webhook
- Dashboard notification
Performance Considerations
Security Performance
Optimization targets:
- Login response: <500ms
- Token validation: <50ms
- Permission check: <10ms
- Audit log write: async
- Session check: cached
Emergency Procedures
Security Incident Response
If breach detected:
1. Force logout all users
2. Disable affected accounts
3. Reset all passwords
4. Rotate all secrets
5. Review audit logs
6. Notify affected users
7. Document incident
8. Update security measures
Integration Points
Connects With
- Every API endpoint (permission checks)
- Database (Row Level Security)
- Email system (verification)
- SMS system (2FA codes)
- Analytics (track security events)
- Admin dashboard (security monitoring)
Common Security Mistakes to Avoid
Never Do These
- Store passwords in plain text
- Trust client-side validation only
- Expose database IDs in URLs
- Log sensitive data
- Use sequential IDs
- Allow unlimited login attempts
- Skip HTTPS in production
- Ignore security headers
- Share API keys in code
- Delay security patches