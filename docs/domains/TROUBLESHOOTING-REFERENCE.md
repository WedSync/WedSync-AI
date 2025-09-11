# Custom Domains System - Technical Troubleshooting Reference

## Quick Diagnostic Commands

### DNS Troubleshooting
```bash
# Check DNS propagation
dig @8.8.8.8 yourdomain.com A
dig @1.1.1.1 yourdomain.com A
dig @208.67.222.222 yourdomain.com A

# Check TXT records
dig TXT _wedsync-verification.yourdomain.com

# Trace DNS path
dig +trace yourdomain.com

# Check DNS from multiple locations
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
```

### SSL Certificate Diagnostics
```bash
# Test SSL connection
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com </dev/null 2>/dev/null | openssl x509 -inform pem -text

# Check certificate chain
curl -I https://yourdomain.com
```

### Performance Testing
```bash
# DNS resolution time
time dig yourdomain.com

# HTTP response time
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com

# Page load testing
curl -o /dev/null -s -w "Connect: %{time_connect}s TTFB: %{time_starttransfer}s Total: %{time_total}s\n" https://yourdomain.com
```

## Error Code Reference

### Domain Status Codes
- `pending_verification` - Domain added but not yet verified
- `verification_failed` - Domain verification failed, check DNS/file
- `verified` - Domain verified, SSL provisioning in progress
- `active` - Domain fully operational
- `ssl_error` - SSL certificate issue
- `dns_error` - DNS resolution problems
- `suspended` - Domain suspended due to policy violation

### Health Check Status Codes
- `healthy` - All systems operational
- `degraded` - Performance issues detected
- `critical` - Service interruption
- `unknown` - Unable to perform health checks

## Common Error Messages

### "Domain verification failed"
**Possible Causes:**
1. DNS TXT record not found or incorrect
2. DNS propagation not complete
3. Verification file not accessible
4. Email verification not completed

**Resolution Steps:**
1. Verify DNS record exists: `dig TXT _wedsync-verification.yourdomain.com`
2. Wait 30 minutes for propagation
3. Check file accessibility: `curl https://yourdomain.com/.well-known/wedsync-verification.txt`
4. Check spam folder for verification email

### "SSL certificate provisioning failed"
**Possible Causes:**
1. Domain not pointing to WedSync servers
2. Rate limiting from Let's Encrypt
3. DNS challenge failure
4. Conflicting certificate exists

**Resolution Steps:**
1. Verify A/CNAME records point to WedSync
2. Wait 1 hour before retrying (rate limit)
3. Check DNS records are publicly accessible
4. Remove existing certificates if manually uploaded

### "Health check failing"
**Possible Causes:**
1. DNS resolution intermittent
2. SSL certificate expired
3. Server overload
4. CDN configuration issues

**Resolution Steps:**
1. Test DNS from multiple locations
2. Check certificate expiry date
3. Review server performance metrics
4. Clear CDN cache

## Database Query Diagnostics

### Check Domain Status
```sql
-- Get domain details
SELECT 
    d.domain,
    d.status,
    d.verification_method,
    d.created_at,
    d.verified_at,
    sc.status as ssl_status,
    sc.expiry_date as ssl_expiry
FROM domains d
LEFT JOIN ssl_certificates sc ON d.id = sc.domain_id
WHERE d.domain = 'yourdomain.com';

-- Check recent health checks
SELECT 
    check_type,
    status,
    response_time_ms,
    error_message,
    checked_at
FROM domain_health_checks 
WHERE domain_id = (SELECT id FROM domains WHERE domain = 'yourdomain.com')
ORDER BY checked_at DESC 
LIMIT 10;
```

### Check DNS Records
```sql
SELECT 
    record_type,
    name,
    value,
    ttl,
    status,
    last_checked
FROM dns_records 
WHERE domain_id = (SELECT id FROM domains WHERE domain = 'yourdomain.com');
```

## Log File Locations

### Application Logs
- Domain verification: `/var/log/wedsync/domain-verification.log`
- SSL provisioning: `/var/log/wedsync/ssl-manager.log`
- Health checks: `/var/log/wedsync/health-monitor.log`
- DNS resolution: `/var/log/wedsync/dns-resolver.log`

### System Logs
- Nginx access: `/var/log/nginx/access.log`
- Nginx error: `/var/log/nginx/error.log`
- SSL renewals: `/var/log/letsencrypt/letsencrypt.log`

## Performance Benchmarks

### Expected Response Times
- DNS resolution: < 50ms (A records), < 100ms (CNAME)
- SSL handshake: < 200ms
- HTTP first byte: < 500ms
- Full page load: < 2 seconds

### Alert Thresholds
- DNS resolution > 200ms: Warning
- SSL handshake > 1000ms: Warning
- HTTP errors > 1%: Critical
- Certificate expiry < 7 days: Warning

## Recovery Procedures

### Emergency DNS Failover
1. Update DNS records to point to backup infrastructure
2. Notify affected customers
3. Monitor health checks for recovery
4. Document incident for post-mortem

### SSL Certificate Emergency
1. Disable HTTPS enforcement temporarily
2. Generate new certificate manually
3. Upload and install certificate
4. Re-enable HTTPS enforcement
5. Test all functionality

### Database Recovery
```sql
-- Backup domain configuration
CREATE TABLE domains_backup AS SELECT * FROM domains;

-- Reset domain status for retry
UPDATE domains 
SET status = 'pending_verification', 
    error_message = NULL 
WHERE domain = 'yourdomain.com';

-- Clear failed health checks
DELETE FROM domain_health_checks 
WHERE domain_id = (SELECT id FROM domains WHERE domain = 'yourdomain.com') 
AND status = 'fail';
```

## Monitoring Queries

### Daily Health Report
```sql
SELECT 
    DATE(checked_at) as check_date,
    check_type,
    COUNT(*) as total_checks,
    SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
    AVG(response_time_ms) as avg_response_time
FROM domain_health_checks 
WHERE checked_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(checked_at), check_type
ORDER BY check_date DESC, check_type;
```

### SSL Certificate Expiry Report
```sql
SELECT 
    d.domain,
    sc.expiry_date,
    EXTRACT(DAY FROM sc.expiry_date - NOW()) as days_until_expiry,
    sc.auto_renew_enabled
FROM domains d
JOIN ssl_certificates sc ON d.id = sc.domain_id
WHERE sc.expiry_date <= NOW() + INTERVAL '30 days'
ORDER BY sc.expiry_date ASC;
```

## Testing Scripts

### DNS Propagation Test
```bash
#!/bin/bash
DOMAIN=$1
EXPECTED_IP=$2

echo "Testing DNS propagation for $DOMAIN..."

SERVERS=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")

for server in "${SERVERS[@]}"; do
    result=$(dig @$server $DOMAIN A +short)
    if [ "$result" == "$EXPECTED_IP" ]; then
        echo "✓ $server: $result"
    else
        echo "✗ $server: $result (expected $EXPECTED_IP)"
    fi
done
```

### SSL Certificate Test
```bash
#!/bin/bash
DOMAIN=$1

echo "Testing SSL certificate for $DOMAIN..."

# Check certificate validity
openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -dates

# Check certificate chain
echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -issuer

# Test SSL Labs grade
curl -s "https://api.ssllabs.com/api/v3/analyze?host=$DOMAIN" | jq '.endpoints[0].grade'
```

### Performance Test
```bash
#!/bin/bash
DOMAIN=$1

echo "Performance testing for $DOMAIN..."

# DNS resolution time
DNS_TIME=$(dig $DOMAIN | grep "Query time" | awk '{print $4}')
echo "DNS resolution: ${DNS_TIME}ms"

# HTTP response time
HTTP_TIME=$(curl -w "%{time_total}" -o /dev/null -s https://$DOMAIN)
echo "HTTP response: ${HTTP_TIME}s"

# SSL handshake time
SSL_TIME=$(curl -w "%{time_appconnect}" -o /dev/null -s https://$DOMAIN)
echo "SSL handshake: ${SSL_TIME}s"
```

## Contact Information

### Escalation Procedures
1. **Level 1**: Automated retry (5 minutes)
2. **Level 2**: Engineering notification (15 minutes)
3. **Level 3**: On-call escalation (30 minutes)
4. **Level 4**: Emergency response (1 hour)

### Support Contacts
- **Technical Support**: tech-support@wedsync.com
- **On-call Engineer**: +1-555-WEDSYNC
- **Emergency Escalation**: emergency@wedsync.com

---

*This troubleshooting reference is updated with each system release. Current version: 1.0 (January 2025)*