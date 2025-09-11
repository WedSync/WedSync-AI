# PDF Processing Issues Runbook

**Severity**: P1 (High)  
**Response Time**: 1 hour  
**Escalation**: After 2 hours if not resolved

## Symptoms
- Users unable to upload PDFs
- PDF processing stuck or failing
- OCR extraction returning empty results
- Form creation not triggered after PDF upload
- High error rates on `/api/pdf/*` endpoints

## Quick Diagnosis Steps

### 1. Check PDF Processing Pipeline Health (2 minutes)
```bash
# Check recent PDF processing logs
aws logs filter-log-events \
  --log-group-name "/aws/ec2/wedsync-prod-app" \
  --start-time $(date -d '30 minutes ago' +%s)000 \
  --filter-pattern "PDF" \
  --limit 50

# Check API endpoint health
curl -f https://wedsync.com/api/pdf/health
curl -f https://wedsync.com/api/health/ocr
```

### 2. Check External Service Dependencies (2 minutes)
```bash
# Test OpenAI API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test file upload storage (S3)
aws s3 ls s3://wedsync-prod-uploads/pdfs/ --recursive | tail -10

# Check Supabase connectivity
curl -H "apikey: $SUPABASE_ANON_KEY" https://[your-project].supabase.co/rest/v1/pdf_uploads?select=id,status&limit=5
```

### 3. Check Processing Queue Status (2 minutes)
```bash
# Check if PDFs are stuck in processing queue
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
sudo docker exec wedsync-app curl localhost:3000/api/admin/pdf/queue-status

# Check Redis queue if using background processing
redis-cli -h [REDIS_ENDPOINT] LLEN pdf_processing_queue
redis-cli -h [REDIS_ENDPOINT] LRANGE pdf_processing_queue 0 10
```

## Common Causes & Solutions

### Cause 1: OpenAI API Issues
**Symptoms**: OCR extraction failing, "OpenAI API error" in logs
**Diagnosis**:
```bash
# Check OpenAI API status
curl -I https://status.openai.com/

# Test OCR endpoint directly
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4-vision-preview",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'

# Check API quota and usage
sudo docker exec wedsync-app curl localhost:3000/api/admin/openai/usage
```

**Solution**:
```bash
# Enable fallback OCR processing
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/ocr/fallback-mode

# Rotate API keys if quota exceeded
aws secretsmanager update-secret --secret-id wedsync/production/openai-key --secret-string '{"key":"sk-new-key-here"}'

# Restart service to pick up new key
sudo docker restart wedsync-app
```

### Cause 2: Large PDF Processing Timeouts
**Symptoms**: Timeout errors on large PDFs (>10MB), processing stops at specific pages
**Diagnosis**:
```bash
# Check for timeout errors in logs
aws logs filter-log-events \
  --log-group-name "/aws/ec2/wedsync-prod-app" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "timeout" \
  --limit 20

# Check processing times by PDF size
sudo docker exec wedsync-app curl localhost:3000/api/admin/pdf/processing-stats
```

**Solution**:
```bash
# Increase processing timeouts temporarily
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/config/pdf-timeout -d '{"value": 300000}'

# Enable chunked processing for large PDFs
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/pdf/chunked-processing

# Scale up instance types for more CPU/memory
aws autoscaling update-auto-scaling-group --auto-scaling-group-name wedsync-prod-asg --launch-template Version='$Latest',LaunchTemplateName=wedsync-prod-lt-xlarge
```

### Cause 3: S3 Upload/Storage Issues
**Symptoms**: File upload fails, "S3 error" in logs, unable to retrieve uploaded PDFs
**Diagnosis**:
```bash
# Test S3 connectivity and permissions
aws s3 ls s3://wedsync-prod-uploads/
aws s3 cp test.txt s3://wedsync-prod-uploads/test-upload.txt
aws s3 rm s3://wedsync-prod-uploads/test-upload.txt

# Check S3 bucket metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=wedsync-prod-uploads Name=StorageType,Value=StandardStorage \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average
```

**Solution**:
```bash
# Check and fix IAM permissions
aws iam get-role-policy --role-name wedsync-prod-ec2-role --policy-name S3UploadPolicy

# If bucket is full, clean up old files
aws s3 rm s3://wedsync-prod-uploads/pdfs/ --recursive --exclude "*" --include "*" --older-than 30d

# Switch to temporary backup bucket if needed
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/config/s3-bucket -d '{"bucket": "wedsync-prod-uploads-backup"}'
```

### Cause 4: Database Issues with PDF Records
**Symptoms**: PDFs uploaded but not showing in database, orphaned records
**Diagnosis**:
```bash
# Check PDF upload records
psql -h [RDS_ENDPOINT] -U wedsync_admin -d wedsync_production

-- Check recent PDF uploads
SELECT id, filename, status, created_at, updated_at 
FROM pdf_uploads 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check for stuck processing records
SELECT id, filename, status, created_at, 
       NOW() - created_at as processing_time
FROM pdf_uploads 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '10 minutes';

-- Check form creation from PDFs
SELECT p.id, p.filename, f.id as form_id, f.title
FROM pdf_uploads p
LEFT JOIN forms f ON f.source_pdf_id = p.id
WHERE p.created_at > NOW() - INTERVAL '1 hour';
```

**Solution**:
```bash
# Reset stuck processing records
psql -h [RDS_ENDPOINT] -U wedsync_admin -d wedsync_production
UPDATE pdf_uploads 
SET status = 'pending', updated_at = NOW() 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '10 minutes';

# Trigger manual reprocessing
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/pdf/reprocess-failed

# Check database connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'wedsync_production';
```

### Cause 5: Memory/CPU Exhaustion During Processing
**Symptoms**: Out of memory errors, high CPU usage during PDF processing
**Diagnosis**:
```bash
# Check memory usage during processing
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
watch -n 2 "free -h && ps aux --sort=-%mem | head -5"

# Check for memory leaks in PDF processing
sudo docker exec wedsync-app curl localhost:3000/api/admin/memory/pdf-processing
```

**Solution**:
```bash
# Implement PDF processing limits
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/pdf/max-concurrent -d '{"value": 2}'

# Enable background processing queue
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/pdf/background-processing

# Scale up resources temporarily
aws autoscaling set-desired-capacity --auto-scaling-group-name wedsync-prod-asg --desired-capacity [CURRENT+2]
```

## Emergency Procedures

### Immediate Mitigation (5 minutes)
If PDF processing is completely broken:

1. **Enable maintenance mode for PDF uploads**:
   ```bash
   sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/pdf/maintenance-mode
   ```

2. **Clear processing queue**:
   ```bash
   redis-cli -h [REDIS_ENDPOINT] DEL pdf_processing_queue
   ```

3. **Restart PDF processing service**:
   ```bash
   sudo docker restart wedsync-app
   ```

### Queue Management
```bash
# Check queue status
redis-cli -h [REDIS_ENDPOINT] LLEN pdf_processing_queue

# Clear stuck jobs
redis-cli -h [REDIS_ENDPOINT] LTRIM pdf_processing_queue 1 0

# Requeue failed PDFs
sudo docker exec wedsync-app npm run pdf:requeue-failed
```

## Recovery Verification

### 1. Test PDF Upload Flow (5 minutes)
```bash
# Test complete PDF upload and processing flow
curl -X POST https://wedsync.com/api/pdf/upload \
  -H "Authorization: Bearer [TEST_TOKEN]" \
  -F "file=@test-form.pdf" \
  -F "autoCreateForm=true"

# Monitor processing status
PDF_ID="[returned_id]"
watch -n 5 "curl -s https://wedsync.com/api/pdf/${PDF_ID}/status | jq '.status'"
```

### 2. Verify Form Creation (3 minutes)
```bash
# Check if form was created from PDF
curl -s "https://wedsync.com/api/forms?source_pdf_id=${PDF_ID}" \
  -H "Authorization: Bearer [TEST_TOKEN]" | jq '.data[]'

# Test form functionality
FORM_ID="[returned_form_id]"
curl -s "https://wedsync.com/api/forms/${FORM_ID}" \
  -H "Authorization: Bearer [TEST_TOKEN]"
```

### 3. Performance Verification
```bash
# Check processing times are back to normal
sudo docker exec wedsync-app curl localhost:3000/api/admin/pdf/performance-stats

# Verify no memory leaks
free -h
sudo docker stats wedsync-app --no-stream
```

## Monitoring & Alerts

### Key Metrics to Monitor
- PDF upload success rate (should be > 95%)
- Average processing time (should be < 30 seconds for normal PDFs)
- OCR extraction success rate (should be > 90%)
- Form creation success rate from PDFs (should be > 85%)
- Queue depth (should be < 10 pending jobs)

### Performance Targets
- Small PDFs (<5MB): Process in < 15 seconds
- Medium PDFs (5-20MB): Process in < 45 seconds  
- Large PDFs (20-50MB): Process in < 120 seconds
- OCR accuracy: > 90% field detection
- Form creation: < 5 seconds after OCR completion

## Prevention Tasks

After resolving the incident:
- [ ] Add more granular monitoring for each processing stage
- [ ] Implement circuit breakers for external API calls
- [ ] Add automated testing for the full PDF→Form pipeline
- [ ] Review and optimize memory usage in PDF processing
- [ ] Set up alerts for processing queue depth
- [ ] Create automated cleanup for stuck processing records
- [ ] Document PDF size limits and optimization guidelines

## Performance Optimization
1. **Preprocessing**: Optimize PDF compression before OCR
2. **Caching**: Cache OCR results for identical PDFs
3. **Batching**: Process multiple PDFs concurrently with limits
4. **Fallback**: Multiple OCR providers for redundancy
5. **Monitoring**: Real-time processing pipeline visibility