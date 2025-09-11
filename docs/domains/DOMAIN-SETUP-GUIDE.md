# WedSync Custom Domains System - Setup & Troubleshooting Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Domain Setup Process](#domain-setup-process)
4. [DNS Verification Methods](#dns-verification-methods)
5. [SSL Certificate Management](#ssl-certificate-management)
6. [Domain Health Monitoring](#domain-health-monitoring)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [Performance Optimization](#performance-optimization)
9. [API Reference](#api-reference)
10. [FAQ](#faq)

---

## Overview

The WedSync Custom Domains System allows enterprise customers to white-label their wedding management platform with their own custom domain. This guide provides comprehensive instructions for setup, configuration, and troubleshooting.

**Key Features:**
- Custom domain registration and verification
- Automated SSL certificate provisioning and renewal
- Multiple DNS verification methods
- Real-time health monitoring and alerting
- Multi-tenant domain isolation
- Performance optimization and caching

---

## Prerequisites

### System Requirements
- Active WedSync Enterprise subscription
- Domain registrar access (GoDaddy, Namecheap, etc.)
- DNS management capabilities
- SSL certificate management (automatic or manual)

### User Permissions
- Organization admin role
- Domain management permissions
- SSL certificate management access

### Technical Prerequisites
- Domain ownership verification
- DNS propagation time (24-48 hours typical)
- Valid email access for verification
- FTP/file upload access (optional verification method)

---

## Domain Setup Process

### Step 1: Domain Registration
Navigate to **Settings > Custom Domains** and click **Add Domain**.

```typescript
// Example domain configuration
const domainConfig = {
  domain: 'weddings.yourcompany.com',
  verification_method: 'dns_txt', // or 'file_upload', 'email', 'meta_tag'
  ssl_enabled: true,
  auto_renew: true,
  health_monitoring: true
};
```

### Step 2: Choose Verification Method
Select your preferred verification method:

1. **DNS TXT Record** (Recommended)
2. **File Upload Verification**
3. **Email Verification**
4. **Meta Tag Verification**
5. **CNAME Record**

### Step 3: Domain Verification
Complete the verification process using your chosen method (detailed below).

### Step 4: SSL Configuration
Configure SSL certificate settings:
- **Automatic**: Let's Encrypt with auto-renewal
- **Manual**: Upload your own certificates
- **Wildcard**: For subdomain support

### Step 5: DNS Configuration
Update your DNS settings to point to WedSync infrastructure:

```dns
# A Record Configuration
weddings.yourcompany.com    A    203.0.113.10

# CNAME Configuration (alternative)
weddings.yourcompany.com    CNAME    wedsync-enterprise.vercel.app

# Required TXT Records
_wedsync-verification.weddings.yourcompany.com    TXT    "wedsync-verification=abc123xyz"
```

---

## DNS Verification Methods

### Method 1: DNS TXT Record (Recommended)

**Why Choose This:**
- Most reliable and secure
- Automated verification
- Works with all domain registrars
- No website modification required

**Setup Instructions:**
1. Access your DNS management console
2. Create a new TXT record:
   - **Name**: `_wedsync-verification.yourdomain.com`
   - **Value**: `wedsync-verification=YOUR_VERIFICATION_CODE`
   - **TTL**: 300 (5 minutes)
3. Save the record and wait for propagation
4. Click **Verify Domain** in WedSync dashboard

**Verification Command:**
```bash
# Test DNS propagation
dig TXT _wedsync-verification.yourdomain.com
nslookup -type=TXT _wedsync-verification.yourdomain.com
```

### Method 2: File Upload Verification

**Setup Instructions:**
1. Download the verification file from WedSync dashboard
2. Upload to your website root: `https://yourdomain.com/.well-known/wedsync-verification.txt`
3. Ensure the file is publicly accessible
4. Click **Verify Domain**

**File Content Example:**
```
wedsync-domain-verification=abc123xyz456
domain=weddings.yourcompany.com
timestamp=2025-01-20T10:30:00Z
```

### Method 3: Email Verification

**Setup Instructions:**
1. Choose from available email addresses:
   - `admin@yourdomain.com`
   - `administrator@yourdomain.com`
   - `webmaster@yourdomain.com`
   - `postmaster@yourdomain.com`
2. Check your email for verification link
3. Click the verification link within 24 hours
4. Domain will be automatically verified

### Method 4: Meta Tag Verification

**Setup Instructions:**
1. Add the meta tag to your website's `<head>` section:
```html
<meta name="wedsync-domain-verification" content="YOUR_VERIFICATION_CODE" />
```
2. Ensure the tag is present on your homepage
3. Click **Verify Domain**

### Method 5: CNAME Record

**Setup Instructions:**
1. Create a CNAME record:
   - **Name**: `wedsync-verify.yourdomain.com`
   - **Value**: `verify.wedsync.com`
2. Wait for DNS propagation
3. Click **Verify Domain**

---

## SSL Certificate Management

### Automatic SSL (Let's Encrypt) - Recommended

**Features:**
- Free SSL certificates
- Automatic renewal every 90 days
- Wildcard support for subdomains
- 99.9% uptime guarantee

**Setup:**
1. Enable "Automatic SSL" during domain setup
2. Certificates are provisioned within 10 minutes
3. Automatic renewal 30 days before expiration
4. Email notifications for renewal status

**Monitoring:**
```typescript
// SSL certificate status check
const sslStatus = {
  domain: 'weddings.yourcompany.com',
  certificate_authority: 'Let\'s Encrypt',
  issued_date: '2025-01-20',
  expiry_date: '2025-04-20',
  days_until_expiry: 89,
  auto_renewal_enabled: true,
  last_renewal_attempt: '2025-01-19',
  status: 'active'
};
```

### Manual SSL Certificate Upload

**When to Use:**
- Organization policy requires specific CA
- Extended validation (EV) certificates
- Existing certificate infrastructure

**Upload Process:**
1. Go to **Domain Settings > SSL Certificates**
2. Click **Upload Certificate**
3. Provide:
   - Certificate file (.crt or .pem)
   - Private key file (.key)
   - Certificate chain (if required)
4. Click **Install Certificate**

**Certificate Validation:**
```bash
# Validate certificate and key match
openssl x509 -noout -modulus -in certificate.crt | openssl md5
openssl rsa -noout -modulus -in private.key | openssl md5
# Output should match

# Check certificate expiry
openssl x509 -enddate -noout -in certificate.crt
```

---

## Domain Health Monitoring

### Automated Health Checks

The system performs comprehensive health checks every 5 minutes:

**Check Types:**
- DNS resolution (A, CNAME, TXT records)
- SSL certificate validity and expiry
- HTTP/HTTPS response codes
- Page load performance
- CDN cache status

**Health Status Indicators:**
- 🟢 **Healthy**: All checks passing
- 🟡 **Warning**: Minor issues detected
- 🔴 **Critical**: Service interruption likely
- ⚫ **Unknown**: Unable to perform checks

### Alert Configuration

**Email Alerts:**
- SSL certificate expiring (30, 7, 1 days)
- DNS resolution failures
- HTTP errors (4xx, 5xx)
- Performance degradation
- Downtime detection

**Webhook Notifications:**
```typescript
// Webhook payload example
const alertPayload = {
  domain: 'weddings.yourcompany.com',
  alert_type: 'ssl_expiry_warning',
  severity: 'medium',
  message: 'SSL certificate expires in 7 days',
  timestamp: '2025-01-20T10:30:00Z',
  details: {
    certificate_expiry: '2025-01-27T23:59:59Z',
    days_remaining: 7,
    renewal_status: 'pending'
  }
};
```

### Performance Monitoring

**Metrics Tracked:**
- DNS resolution time
- SSL handshake duration
- First byte time (TTFB)
- Full page load time
- CDN cache hit ratio

**Performance Dashboard:**
```typescript
const performanceMetrics = {
  dns_resolution_time: {
    average: 45, // milliseconds
    p95: 120,
    p99: 200
  },
  ssl_handshake_time: {
    average: 180,
    p95: 350,
    p99: 500
  },
  page_load_time: {
    average: 1200,
    p95: 2500,
    p99: 4000
  },
  availability: 99.95 // percentage
};
```

---

## Troubleshooting Common Issues

### 1. Domain Verification Failures

**Issue**: Domain verification fails after following setup instructions

**Common Causes & Solutions:**

#### DNS TXT Record Issues
```bash
# Check if TXT record exists
dig TXT _wedsync-verification.yourdomain.com

# Common problems:
# 1. Record not created or incorrect name
# 2. DNS propagation delay (wait 30 minutes - 24 hours)
# 3. Cached DNS responses (flush DNS cache)
```

**Solutions:**
- Verify exact record name and value
- Check TTL settings (300 seconds recommended)
- Use multiple DNS lookup tools to verify propagation
- Clear DNS cache: `sudo dnsmasq -k` or `ipconfig /flushdns`

#### File Upload Verification Issues
**Problem**: File not accessible at verification URL

**Solutions:**
```bash
# Test file accessibility
curl -I https://yourdomain.com/.well-known/wedsync-verification.txt

# Common fixes:
# 1. Check file permissions (644 recommended)
# 2. Verify .htaccess doesn't block .well-known
# 3. Ensure file contains exact verification code
```

#### Email Verification Problems
**Problem**: Verification email not received

**Solutions:**
- Check spam/junk folders
- Verify email addresses exist and are accessible
- Try alternative email addresses (admin@, webmaster@)
- Request new verification email
- Check email server logs for delivery issues

### 2. SSL Certificate Issues

#### Certificate Installation Failures
**Problem**: SSL certificate fails to install or activate

**Diagnostic Steps:**
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate chain
curl -I https://yourdomain.com
```

**Common Solutions:**
- Verify certificate and private key match
- Check certificate chain completeness
- Ensure certificate includes all required domains
- Verify certificate hasn't expired
- Check for mixed content issues

#### Automatic Renewal Failures
**Problem**: Let's Encrypt certificates fail to renew

**Solutions:**
- Check domain ownership verification
- Verify DNS records are still correct
- Review rate limiting (5 certificates per domain per week)
- Check for conflicting manual certificates
- Verify HTTP-01 or DNS-01 challenge accessibility

### 3. DNS Resolution Problems

#### Domain Not Resolving
**Problem**: Custom domain doesn't load WedSync application

**Diagnostic Commands:**
```bash
# Check A record resolution
dig A weddings.yourcompany.com

# Check CNAME resolution
dig CNAME weddings.yourcompany.com

# Trace DNS resolution path
dig +trace weddings.yourcompany.com
```

**Solutions:**
- Verify DNS records point to correct IP addresses
- Check DNS propagation globally using tools like whatsmydns.net
- Confirm TTL settings allow for reasonable cache times
- Check for conflicting DNS records

#### Intermittent DNS Issues
**Problem**: Domain works sometimes but fails other times

**Solutions:**
- Check multiple DNS servers for consistency
- Verify load balancer health checks
- Review DNS provider's status page
- Implement health check endpoints
- Configure DNS failover if available

### 4. Performance Issues

#### Slow Loading Times
**Problem**: Custom domain loads slowly compared to default domain

**Diagnostic Steps:**
```bash
# Test loading time
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com

# Check CDN cache status
curl -I https://yourdomain.com | grep -i cache
```

**Performance Format File (curl-format.txt):**
```
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
```

**Solutions:**
- Enable CDN caching for static assets
- Optimize DNS resolution time (use faster DNS providers)
- Implement HTTP/2 and compression
- Review SSL certificate chain efficiency
- Configure proper cache headers

---

## Performance Optimization

### DNS Optimization

**Best Practices:**
1. **Use Fast DNS Providers**: CloudFlare, Route 53, Google Cloud DNS
2. **Optimize TTL Values**:
   ```dns
   # Production settings
   yourdomain.com    A    3600    203.0.113.10  # 1 hour
   www.yourdomain.com CNAME 3600  yourdomain.com
   
   # During setup/testing
   yourdomain.com    A    300     203.0.113.10  # 5 minutes
   ```
3. **Implement DNS Prefetching**:
   ```html
   <link rel="dns-prefetch" href="//fonts.googleapis.com">
   <link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
   ```

### SSL/TLS Optimization

**Configuration Recommendations:**
```nginx
# Nginx SSL optimization
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

**HTTP Security Headers:**
```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### CDN Configuration

**Cache Strategy:**
```typescript
const cacheConfig = {
  static_assets: {
    ttl: 31536000, // 1 year
    files: ['*.css', '*.js', '*.png', '*.jpg', '*.svg']
  },
  html_pages: {
    ttl: 3600, // 1 hour
    vary: ['Accept-Encoding', 'User-Agent']
  },
  api_responses: {
    ttl: 300, // 5 minutes
    headers: ['Cache-Control: public, max-age=300']
  }
};
```

---

## API Reference

### Domain Management Endpoints

#### Create Domain
```typescript
POST /api/domains
{
  "domain": "weddings.yourcompany.com",
  "verification_method": "dns_txt",
  "ssl_enabled": true,
  "subdomain_support": false
}
```

#### Get Domain Status
```typescript
GET /api/domains/{domain_id}
{
  "domain": "weddings.yourcompany.com",
  "status": "verified",
  "verification_method": "dns_txt",
  "ssl_certificate": {
    "status": "active",
    "expiry_date": "2025-04-20T23:59:59Z"
  },
  "health_status": "healthy",
  "last_health_check": "2025-01-20T10:25:00Z"
}
```

#### Update Domain Configuration
```typescript
PUT /api/domains/{domain_id}
{
  "ssl_enabled": true,
  "auto_renew": true,
  "health_monitoring": true,
  "alert_email": "admin@yourcompany.com"
}
```

#### Delete Domain
```typescript
DELETE /api/domains/{domain_id}
# Removes domain configuration and SSL certificates
# DNS records must be manually removed
```

### Health Check Endpoints

#### Get Health Status
```typescript
GET /api/domains/{domain_id}/health
{
  "domain": "weddings.yourcompany.com",
  "overall_status": "healthy",
  "checks": [
    {
      "type": "dns_resolution",
      "status": "pass",
      "response_time_ms": 42,
      "last_check": "2025-01-20T10:25:00Z"
    },
    {
      "type": "ssl_validity",
      "status": "pass",
      "days_until_expiry": 89,
      "last_check": "2025-01-20T10:25:00Z"
    },
    {
      "type": "http_response",
      "status": "pass",
      "response_code": 200,
      "response_time_ms": 245,
      "last_check": "2025-01-20T10:25:00Z"
    }
  ]
}
```

---

## FAQ

### General Questions

**Q: How long does domain verification take?**
A: DNS-based verification typically takes 5-30 minutes, but can take up to 24-48 hours for full DNS propagation. File-based verification is usually immediate once the file is uploaded.

**Q: Can I use subdomains with custom domains?**
A: Yes, wildcard SSL certificates are supported for Enterprise plans. You can use `*.yourdomain.com` to support unlimited subdomains.

**Q: What happens if my domain verification fails?**
A: You can retry verification multiple times. Check the troubleshooting section for common issues and solutions. The verification token remains valid for 7 days.

### Technical Questions

**Q: Which DNS record type should I use: A record or CNAME?**
A: Use A records for root domains (`yourdomain.com`) and CNAME records for subdomains (`weddings.yourdomain.com`). A records provide slightly better performance.

**Q: Can I use my own SSL certificate?**
A: Yes, Enterprise customers can upload their own SSL certificates. We also support Extended Validation (EV) certificates for enhanced security indicators.

**Q: How do I set up email forwarding for my custom domain?**
A: Email forwarding is handled by your domain registrar or email provider, not WedSync. Configure MX records with your email provider.

### Billing Questions

**Q: Are there additional costs for custom domains?**
A: Custom domains are included with Enterprise plans. SSL certificates via Let's Encrypt are free. Manual SSL certificate management may require additional setup fees.

**Q: What happens if I downgrade my plan?**
A: Custom domains are disabled when downgrading from Enterprise. Your domain will redirect to the default WedSync subdomain, and SSL certificates will be revoked.

### Migration Questions

**Q: How do I migrate from an existing custom domain setup?**
A: Contact our migration team for assistance. We can help with DNS transition planning to minimize downtime during migration.

**Q: Can I transfer a domain from another wedding platform?**
A: Yes, we provide migration assistance for domains from other platforms. Export your data first, then follow our domain setup process.

---

## Support and Resources

### Getting Help
- **Technical Support**: support@wedsync.com
- **Enterprise Support**: enterprise@wedsync.com
- **Phone Support**: Enterprise customers get priority phone support
- **Community Forum**: Available at community.wedsync.com

### Additional Resources
- **DNS Testing Tools**: whatsmydns.net, dnschecker.org
- **SSL Testing**: ssllabs.com/ssltest/
- **Performance Testing**: gtmetrix.com, pagespeed.web.dev
- **Uptime Monitoring**: Integration with StatusPage, PingDom, etc.

### Documentation Updates
This guide is updated monthly. Version: 1.0 (January 2025)
Last updated: January 20, 2025
Next review: February 20, 2025

---

*This guide covers the complete setup and troubleshooting process for WedSync Custom Domains. For additional technical support or enterprise feature requests, contact our support team.*