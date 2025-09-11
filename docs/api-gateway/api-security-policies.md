# WS-250 API Security Policies Documentation

## Overview

This document outlines the comprehensive security policies implemented in the WedSync API Gateway, specifically designed to protect wedding-related data and ensure secure operations for couples, suppliers, and administrators.

## Security Framework

### 1. Authentication & Authorization

#### JWT Token Security
- **Algorithm**: RS256 with rotating keys
- **Token Expiry**: 1 hour for regular sessions, 15 minutes for admin
- **Refresh Strategy**: Automatic refresh with 5-minute grace period
- **Storage**: HTTP-only cookies for web, secure storage for mobile

#### Multi-Factor Authentication (MFA)
- **Triggers**: Admin access, payment operations, sensitive data changes
- **Methods**: SMS OTP, authenticator apps, backup codes
- **Bypass**: Emergency wedding day protocols (documented approval required)

#### Role-Based Access Control (RBAC)
```
Roles:
├── Couple (Guest Access)
│   ├── View own wedding details
│   ├── Update basic profile information  
│   └── Access planning tools
├── Couple (Verified)
│   ├── All Guest permissions
│   ├── Book suppliers
│   ├── Make payments
│   └── Access premium features
├── Supplier (Free Tier)
│   ├── View limited client data
│   ├── Update availability
│   └── Basic communication
├── Supplier (Professional Tier)
│   ├── All Free tier permissions
│   ├── Access to marketing tools
│   ├── Integration capabilities
│   └── Advanced analytics
└── Admin
    ├── System configuration
    ├── User management
    ├── Payment oversight
    └── Emergency interventions
```

### 2. Data Protection Policies

#### Personal Data Classification
1. **Public Data**: Supplier business information, venue details
2. **Restricted Data**: Contact information, availability schedules
3. **Confidential Data**: Payment details, personal preferences
4. **Highly Confidential**: Financial records, private messages

#### Wedding-Specific Data Protection
- **Wedding Date**: Encrypted in transit and at rest
- **Guest Lists**: Access-controlled with audit logging  
- **Venue Information**: Geo-location data anonymization
- **Photo/Video Content**: Digital rights management
- **Payment Information**: PCI DSS Level 1 compliance

#### Data Retention Policies
```
Data Type              Retention Period    Deletion Method
├── Active Wedding     Indefinite         Manual request only
├── Completed Wedding  7 years           Automated + verification
├── Cancelled Booking  2 years           Automated
├── Payment Records    7 years (legal)   Secure deletion
├── Communication      3 years           Automated anonymization
├── Analytics Data     2 years           Aggregated retention
└── Audit Logs         7 years           Immutable storage
```

### 3. Input Validation & Sanitization

#### Wedding Data Validation Rules

**Wedding Date Validation**:
```javascript
const validateWeddingDate = (date) => {
  // Must be future date
  if (new Date(date) <= new Date()) {
    throw new ValidationError('Wedding date must be in the future');
  }
  
  // Reasonable date range (next 5 years)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);
  if (new Date(date) > maxDate) {
    throw new ValidationError('Wedding date too far in the future');
  }
  
  // Weekend preference validation for venues
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 1) { // Monday
    return { valid: true, warning: 'Monday weddings are uncommon' };
  }
  
  return { valid: true };
};
```

**Supplier Information Validation**:
```javascript
const supplierValidation = {
  businessName: {
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s&'-,.]+$/,
    required: true
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: true
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    required: true
  },
  address: {
    maxLength: 200,
    geocodeVerification: true,
    required: false
  }
};
```

#### Anti-Injection Protection

**SQL Injection Prevention**:
- Parameterized queries only
- ORM-level protection (Supabase/PostgreSQL)
- Input sanitization for dynamic queries
- Query complexity analysis

**XSS Protection**:
```javascript
const sanitizeInput = (input, context = 'general') => {
  const contexts = {
    general: {
      allowed: ['b', 'i', 'em', 'strong'],
      disallowed: ['script', 'object', 'embed', 'iframe']
    },
    weddingDescription: {
      allowed: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      disallowed: ['script', 'object', 'embed', 'iframe', 'form', 'input']
    },
    supplierBio: {
      allowed: ['b', 'i', 'em', 'strong', 'p', 'br'],
      disallowed: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'a']
    }
  };
  
  return DOMPurify.sanitize(input, contexts[context]);
};
```

### 4. Communication Security

#### API Communication
- **TLS 1.3**: All external communications
- **Certificate Pinning**: Mobile applications
- **HSTS**: Mandatory for production domains
- **Perfect Forward Secrecy**: Ephemeral key exchange

#### Wedding Vendor Communication
```
Communication Channel    Encryption         Authentication
├── Couple ↔ Supplier   E2E Encrypted      Mutual TLS
├── Internal Messages   AES-256-GCM        JWT + HMAC
├── Payment Data        PCI DSS Standard   Multi-factor
├── Photo Sharing       Client-side enc.   Digital signatures
└── Emergency Alerts    SMS + App Push     OTP verification
```

#### Email Security
- **DMARC**: Reject unauthorized emails
- **SPF**: Sender verification
- **DKIM**: Message integrity
- **Encryption**: TLS for SMTP, PGP for sensitive content

### 5. Payment Security

#### PCI DSS Compliance
- **Level 1** merchant compliance
- **SAQ-D** self-assessment questionnaire
- **Quarterly** vulnerability scans
- **Annual** security assessment

#### Wedding Payment Workflows
```
Payment Type          Security Level    Processing Method
├── Booking Deposit   Level 1          Stripe Connect
├── Final Payment     Level 1          Direct processing  
├── Vendor Payout     Level 2          Automated splits
├── Refunds          Level 1          Manual approval
└── Emergency         Level 3          Multi-approval
```

#### Fraud Prevention
```javascript
const fraudDetection = {
  weddingBookingRisk: (booking) => {
    const riskFactors = [];
    
    // Unusual booking patterns
    if (booking.totalAmount > 50000) { // >£500
      riskFactors.push('high_value_booking');
    }
    
    // Geographic inconsistencies  
    if (booking.cardCountry !== booking.venueCountry) {
      riskFactors.push('geographic_mismatch');
    }
    
    // Time-based patterns
    const timeToWedding = (new Date(booking.weddingDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (timeToWedding < 7) {
      riskFactors.push('last_minute_booking');
    }
    
    return calculateRiskScore(riskFactors);
  }
};
```

### 6. Wedding Day Security Protocols

#### Emergency Access Procedures
1. **Level 1 Emergency**: Automated systems with enhanced monitoring
2. **Level 2 Emergency**: Manual override with dual approval
3. **Level 3 Emergency**: Executive override with audit trail
4. **Level 4 Emergency**: External emergency services integration

#### Saturday Protection Policies
```
Saturday Security Measures:
├── No Code Deployments
├── Enhanced Monitoring (1-minute intervals)
├── Emergency Response Team On-Call
├── Automatic Failover Enabled
├── Communication Channels Open
├── Vendor Emergency Contacts Active
└── Incident Response Plan Activated
```

### 7. Mobile Security

#### Mobile Application Security
- **App Transport Security**: iOS requirements
- **Network Security Config**: Android requirements
- **Certificate Pinning**: Prevent MITM attacks
- **Root/Jailbreak Detection**: Enhanced security mode
- **Binary Protection**: Code obfuscation and anti-tampering

#### Mobile-Specific Policies
```javascript
const mobileSecurityPolicies = {
  biometricAuth: {
    enabled: true,
    fallback: 'PIN + SMS OTP',
    maxAttempts: 3
  },
  dataAtRest: {
    encryption: 'AES-256',
    keyDerivation: 'PBKDF2',
    storage: 'iOS Keychain / Android Keystore'
  },
  sessionManagement: {
    backgroundTimeout: 300, // 5 minutes
    inactivityTimeout: 1800, // 30 minutes  
    weddingDayExtension: 3600 // 1 hour on wedding day
  }
};
```

### 8. Vendor Integration Security

#### Third-Party API Security
```
Vendor              Auth Method       Data Access       Monitoring
├── Tave CRM       OAuth 2.0         Client data       Real-time
├── Light Blue     Screen scraping   Limited           Rate-limited
├── HoneyBook      OAuth 2.0         Booking data      Real-time  
├── Stripe         API Keys          Payment data      Continuous
├── Twilio         API Keys          SMS only          Volume-based
└── Mailchimp      OAuth 2.0         Email lists       Weekly audit
```

#### API Key Management
- **Rotation Schedule**: Every 90 days
- **Access Logging**: All API calls logged and monitored
- **Scope Limitation**: Minimum necessary permissions
- **Revocation Process**: Immediate for security incidents

### 9. Incident Response

#### Security Incident Classification
```
Severity Level    Response Time    Escalation           Wedding Day Impact
├── Critical     < 15 minutes     CTO + CEO           Immediate mitigation
├── High         < 1 hour         Engineering Lead    Active monitoring  
├── Medium       < 4 hours        Team Lead           Standard protocols
└── Low          < 24 hours       Assignee            Next business day
```

#### Wedding Day Incident Procedures
1. **Immediate Assessment**: Impact on active weddings
2. **Stakeholder Notification**: Couples and suppliers affected
3. **Mitigation Deployment**: Emergency patches and workarounds
4. **Communication Plan**: Regular updates every 15 minutes
5. **Post-Incident Review**: Within 48 hours of resolution

#### Data Breach Response
```
Timeline          Action                    Responsibility
├── T+0 minutes   Incident detection       Automated systems
├── T+15 minutes  Initial assessment       Security team  
├── T+30 minutes  Containment measures     Engineering
├── T+1 hour      Stakeholder notification Management
├── T+2 hours     External notification    Legal team
├── T+24 hours    Preliminary report       Security team
└── T+7 days      Final incident report    All teams
```

### 10. Compliance and Auditing

#### Regulatory Compliance
- **GDPR**: Data protection for EU couples and suppliers
- **CCPA**: California consumer privacy protection
- **PCI DSS**: Payment card industry standards
- **ISO 27001**: Information security management
- **SOC 2 Type II**: Security, availability, confidentiality

#### Audit Requirements
```
Audit Type           Frequency    Scope                    External Auditor
├── Security         Annual       Full system              Independent firm
├── PCI DSS          Quarterly    Payment processing       QSA certified  
├── GDPR             Annual       Data protection          Privacy specialist
├── Internal         Monthly      Policy compliance        Internal team
└── Emergency        As needed    Incident response        Third-party
```

#### Audit Logging
```javascript
const auditLog = {
  authentication: {
    loginAttempts: 'all',
    passwordChanges: 'all',  
    mfaEvents: 'all',
    sessionManagement: 'all'
  },
  dataAccess: {
    weddingData: 'read/write/delete',
    paymentData: 'all operations',
    personalData: 'all operations',
    adminActions: 'all operations'
  },
  systemEvents: {
    configurationChanges: 'all',
    securityPolicyUpdates: 'all',
    emergencyOverrides: 'all',
    systemFailures: 'all'
  }
};
```

### 11. Security Monitoring

#### Real-Time Monitoring
- **Failed Authentication Attempts**: > 5 in 5 minutes
- **Unusual API Usage**: > 200% of normal patterns
- **Geographic Anomalies**: Access from new countries
- **Payment Fraud Indicators**: High-risk transactions
- **Data Access Patterns**: Unusual data queries

#### Wedding Season Security
```
Monitoring Metric         Normal Threshold    Wedding Season    Saturday
├── Authentication Rate   100/minute          500/minute       1000/minute
├── Payment Transactions  50/hour             200/hour         500/hour  
├── Data Access Requests  1000/hour           5000/hour        10000/hour
├── API Error Rate        < 1%                < 0.5%           < 0.1%
└── Response Time         < 200ms             < 100ms          < 50ms
```

#### Automated Responses
```javascript
const securityAutomation = {
  bruteForceDetection: {
    threshold: 10, // failed attempts
    action: 'temporary_ip_block',
    duration: 3600, // 1 hour
    escalation: 'security_team_alert'
  },
  anomalousActivity: {
    threshold: 'statistical_deviation_3_sigma',
    action: 'enhanced_monitoring',
    duration: 7200, // 2 hours
    escalation: 'automatic_if_continues'
  },
  weddingDayProtection: {
    threshold: 'any_critical_error',
    action: 'immediate_escalation',
    duration: 'until_resolved',
    escalation: 'emergency_response_team'
  }
};
```

### 12. Privacy Protection

#### Data Minimization
- **Collect**: Only necessary data for wedding coordination
- **Process**: Minimum data required for specific functions
- **Store**: Encrypted and access-controlled
- **Share**: Only with explicit consent and legitimate business need

#### Consent Management
```javascript
const consentManagement = {
  weddingData: {
    required: ['basic_profile', 'wedding_date', 'contact_info'],
    optional: ['dietary_preferences', 'photo_sharing', 'marketing'],
    granular: true,
    withdrawable: true
  },
  marketing: {
    channels: ['email', 'sms', 'push_notifications'],
    frequency: 'user_controlled',
    content: 'wedding_related_only',
    optOut: 'one_click'
  }
};
```

#### Right to Be Forgotten
1. **Data Identification**: Automated personal data discovery
2. **Impact Assessment**: Effect on other users and business operations  
3. **Anonymization**: Convert to anonymous analytics data where possible
4. **Deletion**: Secure deletion of personal data
5. **Verification**: Confirmation of complete removal

---

## Security Policy Updates

This security policy document is reviewed quarterly and updated as needed to address:
- New threats and vulnerabilities
- Changes in regulatory requirements  
- Evolution of wedding industry practices
- Technology platform updates
- Incident response learnings

**Last Updated**: 2025-09-03  
**Next Review**: 2025-12-03  
**Policy Version**: 2.1  
**Approved By**: Chief Security Officer, WedSync