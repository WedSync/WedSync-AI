# WS-161 Supplier Schedule Browser MCP Interactive Testing Plan

## Test Overview
This document outlines the Browser MCP interactive testing strategy for the WS-161 Supplier Schedule system. The tests verify end-to-end functionality of supplier schedule generation, access, confirmation, and export features.

## Test Environment
- **Application URL**: http://localhost:3000
- **Test Data**: Integration test dataset with test wedding, timeline, and supplier
- **Browser**: Chromium via Browser MCP
- **Authentication**: JWT token-based supplier access

## Test Scenarios

### 1. Supplier Schedule Generation API Testing

#### Test Case 1.1: Generate Supplier Schedules from Timeline
```javascript
// Browser MCP Commands
await browser.navigate('http://localhost:3000/api/timeline/test-timeline-id/supplier-schedules')
await browser.evaluate(() => {
  return fetch('/api/timeline/test-timeline-id/supplier-schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      options: {
        includeBuffers: true,
        groupByCategory: true,
        notifySuppliers: false
      }
    })
  }).then(res => res.json())
})
```

**Expected Results:**
- HTTP Status: 201 Created
- Response contains array of generated schedules
- Each schedule includes supplier details and timeline events
- Generated schedule IDs for further testing

#### Test Case 1.2: Retrieve Generated Schedules
```javascript
await browser.evaluate(() => {
  return fetch('/api/timeline/test-timeline-id/supplier-schedules')
    .then(res => res.json())
})
```

**Expected Results:**
- HTTP Status: 200 OK
- List of schedules with supplier information
- Event details with timing and requirements
- Proper data structure validation

### 2. Supplier Access Token Generation Testing

#### Test Case 2.1: Generate Secure Access Token
```javascript
await browser.evaluate(() => {
  return fetch('/api/suppliers/test-supplier-id/access-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      permissions: ['view_schedule', 'confirm_schedule', 'export_schedule'],
      expiresInHours: 168,
      metadata: { purpose: 'browser_testing' }
    })
  }).then(res => res.json())
})
```

**Expected Results:**
- Valid JWT token generated
- Proper expiration time set
- Token includes required permissions
- Secure token format validation

### 3. Supplier Schedule Access Testing

#### Test Case 3.1: Access Schedule with Token Authentication
```javascript
const token = 'generated_supplier_token_here'
await browser.navigate(`http://localhost:3000/api/suppliers/test-supplier-id/schedule?token=${token}`)
```

**Expected Results:**
- HTTP Status: 200 OK
- Complete supplier schedule data
- Formatted timeline events
- Supplier information included

#### Test Case 3.2: Test Invalid Token Access
```javascript
await browser.navigate('http://localhost:3000/api/suppliers/test-supplier-id/schedule?token=invalid_token')
```

**Expected Results:**
- HTTP Status: 401 Unauthorized
- Error message about invalid token
- No sensitive data exposed

### 4. Schedule Export Format Testing

#### Test Case 4.1: PDF Export
```javascript
await browser.navigate(`http://localhost:3000/api/suppliers/test-supplier-id/schedule?format=pdf&token=${token}`)
```

**Expected Results:**
- HTTP Status: 200 OK
- Content-Type: application/pdf
- Proper filename in Content-Disposition header
- Valid PDF download initiated

#### Test Case 4.2: ICS Calendar Export
```javascript
await browser.navigate(`http://localhost:3000/api/suppliers/test-supplier-id/schedule?format=ics&token=${token}`)
```

**Expected Results:**
- HTTP Status: 200 OK
- Content-Type: text/calendar
- Valid ICS format with VCALENDAR structure
- All events properly formatted

#### Test Case 4.3: CSV Export
```javascript
await browser.evaluate(() => {
  return fetch(`/api/suppliers/test-supplier-id/schedule?format=csv&token=${token}`)
    .then(res => res.text())
})
```

**Expected Results:**
- HTTP Status: 200 OK
- Proper CSV format with headers
- All event data included
- Comma-separated values properly escaped

### 5. Schedule Confirmation Testing

#### Test Case 5.1: Confirm Schedule Events
```javascript
await browser.evaluate(() => {
  return fetch('/api/suppliers/test-supplier-id/schedule/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      confirmations: [
        {
          eventId: 'test-event-1',
          status: 'confirmed',
          notes: 'Ready for pre-ceremony photos',
          requirements: ['backup equipment']
        }
      ],
      overallNotes: 'Confirmed schedule for wedding day',
      contactPreferences: {
        preferredMethod: 'email',
        emergencyContact: '+1234567890'
      }
    })
  }).then(res => res.json())
})
```

**Expected Results:**
- HTTP Status: 200 OK
- Confirmation ID generated
- Confirmed events count matches request
- Database records created properly

### 6. Error Handling Testing

#### Test Case 6.1: Invalid Timeline ID
```javascript
await browser.navigate('http://localhost:3000/api/timeline/invalid-id/supplier-schedules')
```

**Expected Results:**
- HTTP Status: 404 Not Found
- Proper error message structure
- No system information leaked

#### Test Case 6.2: Expired Token Access
```javascript
const expiredToken = 'expired_jwt_token_here'
await browser.navigate(`http://localhost:3000/api/suppliers/test-supplier-id/schedule?token=${expiredToken}`)
```

**Expected Results:**
- HTTP Status: 401 Unauthorized
- TOKEN_EXPIRED error code
- Clear expiration message

### 7. Performance Testing

#### Test Case 7.1: Large Dataset Handling
```javascript
await browser.evaluate(() => {
  const start = performance.now()
  return fetch('/api/timeline/large-timeline-id/supplier-schedules')
    .then(res => res.json())
    .then(data => ({
      ...data,
      responseTime: performance.now() - start
    }))
})
```

**Expected Results:**
- Response time < 2000ms for large datasets
- Proper pagination if applicable
- Memory usage within acceptable limits

### 8. Security Testing

#### Test Case 8.1: SQL Injection Attempt
```javascript
await browser.navigate("http://localhost:3000/api/suppliers/'; DROP TABLE suppliers; --/schedule")
```

**Expected Results:**
- HTTP Status: 400 Bad Request or 404 Not Found
- No database operations executed
- Proper input sanitization

#### Test Case 8.2: XSS Prevention
```javascript
await browser.evaluate(() => {
  return fetch('/api/suppliers/test-supplier-id/schedule/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      confirmations: [{
        eventId: 'test-event-1',
        status: 'confirmed',
        notes: '<script>alert("xss")</script>',
      }]
    })
  }).then(res => res.json())
})
```

**Expected Results:**
- Malicious scripts stripped or escaped
- Data properly sanitized before storage
- No script execution in responses

## Test Execution Checklist

### Pre-Test Setup
- [ ] Start Next.js development server (`npm run dev`)
- [ ] Apply database migrations
- [ ] Create test data (wedding, timeline, supplier, events)
- [ ] Verify Browser MCP connection
- [ ] Clear browser cache and cookies

### Test Execution
- [ ] Run all API endpoint tests
- [ ] Verify authentication and authorization
- [ ] Test all export formats
- [ ] Validate schedule confirmation flow
- [ ] Check error handling scenarios
- [ ] Perform security tests
- [ ] Measure performance metrics

### Post-Test Validation
- [ ] Verify database state consistency
- [ ] Check log files for errors
- [ ] Validate created files and exports
- [ ] Clean up test data
- [ ] Document any issues found

## Browser MCP Commands Reference

### Navigation Commands
```javascript
await browser.navigate(url)
await browser.navigateBack()
await browser.tabs('new')
```

### Interaction Commands
```javascript
await browser.click(selector)
await browser.type(selector, text)
await browser.fillForm(formData)
```

### Testing Commands
```javascript
await browser.takeScreenshot('test-name.png')
await browser.snapshot()
await browser.evaluate(jsFunction)
await browser.waitFor({ text: 'Expected Text' })
```

### Network Monitoring
```javascript
await browser.networkRequests()
await browser.consoleMessages()
```

## Test Results Documentation

### Test Execution Summary
- **Total Test Cases**: 14
- **API Endpoints Tested**: 4
- **Export Formats Validated**: 3 (PDF, ICS, CSV)
- **Security Scenarios**: 2
- **Performance Tests**: 1

### Success Criteria
- All API endpoints return expected status codes
- Authentication and authorization work properly
- All export formats generate valid output
- Error handling provides appropriate responses
- Security measures prevent common attacks
- Performance meets acceptable thresholds

### Issue Tracking
Any issues discovered during Browser MCP testing should be documented with:
- Test case identifier
- Expected vs actual behavior
- Screenshot or error logs
- Reproduction steps
- Severity level
- Recommended fixes

## Integration with CI/CD

This Browser MCP testing plan can be automated in CI/CD pipelines:

```yaml
# GitHub Actions Example
- name: Browser MCP Testing
  run: |
    npm run dev &
    sleep 10
    npm run test:browser-mcp
    pkill -f "next dev"
```

The automated tests should capture screenshots, performance metrics, and detailed logs for every test execution.