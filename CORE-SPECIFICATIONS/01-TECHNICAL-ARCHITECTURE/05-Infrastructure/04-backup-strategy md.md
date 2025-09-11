# 04-backup-strategy.md

## Purpose

Ensure business continuity with comprehensive backup and recovery procedures for all critical data.

## Backup Scope

### Critical Data

```
1. Database (PostgreSQL)
   - All tables and schemas
   - User data, forms, journeys
   - Transaction history

2. File Storage
   - User uploads
   - Form attachments
   - Profile images
   - Documents

3. Configuration
   - Environment variables
   - API keys (encrypted)
   - Service configurations
```

## Backup Schedule

### Database Backups

- **Continuous**: Point-in-time recovery (PITR) - last 7 days
- **Daily**: Automated snapshots at 3 AM UTC
- **Weekly**: Full backup every Sunday
- **Monthly**: Archive on 1st of month

### File Storage

- **Real-time**: Cross-region replication
- **Daily**: Incremental backups
- **Weekly**: Full backup to cold storage

## Backup Locations

### Primary Storage

- Supabase managed backups (same region)
- S3 bucket for file storage

### Secondary Storage

- Cross-region replication (different geography)
- AWS S3 Glacier for long-term archives

### Tertiary (Critical Only)

- Encrypted offline backups monthly
- Stored in separate cloud provider

## Recovery Procedures

### Recovery Time Objectives (RTO)

- **Database**: < 1 hour
- **File Storage**: < 2 hours
- **Full Platform**: < 4 hours
- **Configuration**: < 30 minutes

### Recovery Point Objectives (RPO)

- **Database**: < 1 hour of data loss
- **File Storage**: < 24 hours
- **User Sessions**: Acceptable to lose

## Restoration Process

### Database Recovery

```
1. Stop application servers
2. Create new database instance
3. Restore from latest backup
4. Apply transaction logs (PITR)
5. Verify data integrity
6. Update connection strings
7. Restart application
```

### File Recovery

```
1. Identify corrupted/lost files
2. Restore from S3 versioning
3. Fallback to daily backup if needed
4. Verify file integrity
5. Clear CDN cache
```

## Testing Strategy

### Monthly Tests

- Restore random database table
- Verify backup file integrity
- Test single user recovery

### Quarterly Tests

- Full database restoration to staging
- Complete file storage recovery
- Document recovery time

### Annual Test

- Complete disaster recovery drill
- Full platform restoration
- Update runbooks based on learnings

## Data Retention Policy

### Backup Retention

- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months
- Annual backups: 7 years

### Compliance Backups

- GDPR data: As per legal requirements
- Financial records: 7 years
- User consent records: Permanent

## Security Measures

### Encryption

- Backups encrypted at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Separate encryption keys per backup
- Key rotation every 90 days

### Access Control

- MFA required for backup access
- Separate credentials from production
- Audit log all backup operations
- Principle of least privilege

## Critical Considerations

- Never test recovery in production
- Document all recovery procedures
- Automate backup verification
- Monitor backup job success
- Calculate backup storage costs
- Ensure GDPR compliance for data deletion