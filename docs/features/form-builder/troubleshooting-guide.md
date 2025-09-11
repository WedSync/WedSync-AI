# WedSync Advanced Form Builder - Troubleshooting Guide

## 🚨 Emergency Wedding Day Issues

### CRITICAL: Saturday Wedding Day Problems

**If it's Saturday and weddings are happening, this is your emergency protocol:**

1. **Call Emergency Hotline**: 1-800-WEDSYNC-911
2. **Check Wedding Day Status Dashboard**: [dashboard.wedsync.com/emergency](http://dashboard.wedsync.com/emergency)
3. **Enable Read-Only Mode** if needed to prevent data corruption
4. **Document everything** for post-incident analysis

---

## 🔧 Common Issues & Solutions

### 1. Forms Not Loading

#### **Symptoms**
- Blank form builder screen
- Loading spinner that never stops
- "Form not found" errors
- White screen with no content

#### **Immediate Actions**
1. **Hard refresh the page**: Ctrl+F5 (PC) or Cmd+Shift+R (Mac)
2. **Clear browser cache**:
   - Chrome: Settings > Privacy > Clear browsing data
   - Safari: Safari > Clear History
   - Firefox: History > Clear Recent History
3. **Try incognito/private mode** to eliminate browser extensions
4. **Check different browser** (Chrome, Safari, Firefox)

#### **Root Causes & Solutions**

**Browser Cache Issues**
```
Problem: Outdated JavaScript files cached
Solution: 
1. Clear browser cache completely
2. Hard refresh (Ctrl+F5)
3. If problem persists, try incognito mode
```

**JavaScript Errors**
```
Problem: Script errors preventing form loading
Diagnosis: 
1. Open browser dev tools (F12)
2. Check Console tab for red error messages
3. Look for "TypeError" or "ReferenceError"
Solution:
1. Disable browser extensions temporarily
2. Clear cache and cookies
3. Contact support with console error messages
```

**Network Connectivity**
```
Problem: Poor internet connection or firewall blocks
Diagnosis:
1. Try loading other websites
2. Check if company firewall blocks wedsync.com
3. Test mobile hotspot vs office WiFi
Solution:
1. Switch networks
2. Contact IT about firewall rules
3. Use mobile connection as backup
```

**Account Permissions**
```
Problem: User doesn't have form creation rights
Diagnosis:
1. Check account role (Admin, Editor, Viewer)
2. Verify organization membership
Solution:
1. Contact organization admin
2. Request Editor or Admin permissions
3. Check if account subscription is current
```

### 2. Conditional Logic Not Working

#### **Symptoms**
- Fields not showing/hiding when they should
- Logic triggers but wrong fields appear
- Conditional fields always visible or never visible
- Logic works in preview but not live form

#### **Step-by-Step Diagnosis**

**Step 1: Check Field Names**
```
Common Issue: Field names don't match exactly
Example Problem:
- Trigger field: "wedding_type" 
- Condition looks for: "wedding-type" (wrong dash/underscore)

Fix:
1. Go to form builder
2. Click on trigger field
3. Check "Field Name" exactly matches condition
4. Field names are case-sensitive: "Wedding_Type" ≠ "wedding_type"
```

**Step 2: Verify Condition Values**
```
Common Issue: Condition values don't match option values
Example Problem:
- Dropdown option value: "destination_wedding"
- Condition checks for: "Destination Wedding" (wrong case/spaces)

Fix:
1. Check dropdown/radio options
2. Use exact option VALUE, not display text
3. No extra spaces or special characters
```

**Step 3: Test Logic Step-by-Step**
```
Testing Process:
1. Go to form preview mode
2. Fill out trigger field slowly
3. Watch for field changes after each input
4. Take screenshots if reporting bug
```

**Step 4: Check Operator Types**
```
Common Operator Mistakes:
- Using "equals" when you need "contains"
- Using "greater than" with text fields
- Using "less than" with dates incorrectly

Correct Usage:
- "equals": Exact match (good for dropdowns)
- "contains": Partial match (good for text search)
- "greater than": Numbers and dates only
- "not empty": Check if field has any value
```

#### **Advanced Logic Debugging**

**Multiple Conditions (AND/OR Logic)**
```
Problem: Complex conditions not working
Example: Show field when "budget > 5000 AND wedding_type = destination"

Debugging:
1. Test each condition separately first
2. Verify AND vs OR logic is correct
3. Check condition order (first to last evaluation)

Common Fix: Use OR when you meant AND, or vice versa
```

**Nested Logic Issues**
```
Problem: Field A shows Field B, Field B shows Field C, but C never appears
Diagnosis: Chain dependencies can break

Solution:
1. Simplify logic chains
2. Test each link in the chain
3. Consider direct conditions instead of chaining
```

### 3. Form Submissions Failing

#### **Symptoms**
- "Submission failed" error messages
- Form appears to submit but no data received
- Validation errors that shouldn't exist
- Clients report they can't submit forms

#### **Client-Side Issues**

**Required Field Errors**
```
Problem: Fields marked required but client filled them out
Diagnosis:
1. Check for invisible characters (copy/paste issues)
2. Look for fields with only spaces
3. Check if conditional required fields are properly visible

Solution:
1. Clear field and re-type (don't copy/paste)
2. Check field validation rules
3. Verify conditional logic isn't hiding required fields
```

**File Upload Problems**
```
Problem: File uploads failing or timing out
Common Causes:
- Files too large (>10MB limit)
- Unsupported file types
- Poor internet connection
- Mobile browser issues

Solutions:
1. Compress images before upload
2. Check file format (JPG, PNG, PDF only)
3. Try uploading one file at a time
4. Use desktop instead of mobile for large files
```

**Browser-Specific Issues**
```
Safari Issues:
- Enable "Allow all cookies" in Privacy settings
- Disable "Prevent cross-site tracking" temporarily

Chrome Issues:
- Check if form is being blocked by popup blocker
- Disable extensions temporarily
- Clear Chrome cache and cookies

Mobile Issues:
- Switch from cellular to WiFi
- Try desktop version of site
- Clear mobile browser cache
```

#### **Server-Side Issues**

**Database Connection Problems**
```
Symptoms: Intermittent submission failures
Diagnosis:
1. Check error logs for database timeouts
2. Monitor during peak hours (Saturday mornings)
3. Look for "connection refused" errors

Solution:
1. Wait 5 minutes and retry
2. Report pattern to support (specific times/dates)
3. Use form draft feature to save progress
```

**CRM Integration Failures**
```
Problem: Form submits but doesn't sync to Tave/HoneyBook
Diagnosis:
1. Check CRM integration status in settings
2. Verify API credentials are current
3. Check if CRM service is down

Solution:
1. Manual sync from submission list
2. Re-authorize CRM connection
3. Check CRM service status pages
```

### 4. Mobile Form Problems

#### **Common Mobile Issues**

**Touch Target Problems**
```
Problem: Hard to tap buttons or fields on mobile
Symptoms:
- Accidentally tapping wrong fields
- Buttons seem unresponsive
- Zoom required to interact

Solution:
1. Use mobile-optimized form templates
2. Check touch targets are at least 48px
3. Test on actual mobile devices, not desktop browser
```

**Keyboard Issues**
```
Problem: Mobile keyboard covering form fields
Solution:
1. Scroll down after tapping field
2. Use "Done" button to close keyboard
3. Switch to horizontal orientation temporarily
```

**File Upload on Mobile**
```
Problem: Can't upload photos from phone
Solutions:
1. Grant camera/photo permissions when prompted
2. Try "Take Photo" option instead of "Choose File"
3. Reduce photo quality in camera settings
4. Use desktop for multiple file uploads
```

**Mobile Data Issues**
```
Problem: Form won't load or submit on cellular
Solutions:
1. Switch to WiFi if available
2. Move to area with stronger signal
3. Close other apps using data
4. Try again during off-peak hours
```

### 5. CRM Integration Problems

#### **Tave Integration Issues**

**API Connection Failures**
```
Error: "Tave API authentication failed"
Solutions:
1. Re-generate API key in Tave settings
2. Re-enter credentials in WedSync integration page
3. Test connection with "Test Sync" button
4. Check Tave service status at status.tave.com
```

**Field Mapping Problems**
```
Problem: Some form data not appearing in Tave
Diagnosis:
1. Check field mapping configuration
2. Verify Tave custom fields exist
3. Look for character limits in Tave fields

Solution:
1. Map to existing Tave fields only
2. Create custom fields in Tave first
3. Shorten long text fields if needed
```

**Sync Delays**
```
Problem: Form data takes hours to appear in Tave
Explanation: Normal processing time is 5-15 minutes
Red flags: Over 1 hour delay indicates problem

Solutions:
1. Check sync status in submission list
2. Manual retry from submissions page
3. Contact support if consistently slow
```

#### **HoneyBook Integration Issues**

**OAuth Authorization Problems**
```
Error: "HoneyBook authorization expired"
Solution:
1. Go to Settings > Integrations > HoneyBook
2. Click "Re-authorize Account"
3. Complete OAuth flow in new window
4. Verify green checkmark appears
```

**Project Creation Failures**
```
Problem: Leads created but projects not auto-generated
Diagnosis:
1. Check HoneyBook template settings
2. Verify project automation rules
3. Look for budget thresholds

Solution:
1. Manually create projects from HoneyBook leads
2. Adjust automation rules in HoneyBook
3. Lower minimum budget for auto-project creation
```

#### **Light Blue Integration Issues**

**Screen Scraping Failures**
```
Problem: Light Blue integration not working
Note: Light Blue has no API, so we use automated form filling

Common Issues:
1. Light Blue changed their website layout
2. Login credentials expired
3. Two-factor authentication enabled

Solutions:
1. Update Light Blue password in WedSync
2. Disable 2FA temporarily for sync account
3. Contact support if persistent failures
```

### 6. Performance Issues

#### **Slow Form Loading**

**Large Forms (50+ fields)**
```
Problem: Form builder becomes sluggish with many fields
Solutions:
1. Use sections/pages to break up long forms
2. Enable "Virtual scrolling" in form settings
3. Remove unused field types from palette
4. Consider multiple smaller forms instead
```

**Complex Conditional Logic**
```
Problem: Form preview slow to respond
Cause: Too many conditional relationships

Solutions:
1. Simplify logic where possible
2. Use fewer nested conditions
3. Group related conditions together
4. Test logic changes in small batches
```

**File Upload Performance**
```
Problem: File uploads taking very long
Solutions:
1. Compress images before upload
2. Upload files one at a time
3. Use WiFi instead of cellular data
4. Clear browser cache before large uploads
```

#### **Database Performance Issues**

**Submission List Loading Slowly**
```
Problem: Thousands of submissions taking long to load
Solutions:
1. Use date range filters
2. Search by specific criteria
3. Export data for analysis instead of browsing
4. Archive old submissions periodically
```

### 7. Analytics and Reporting Issues

#### **Missing Analytics Data**

**Form Views Not Tracking**
```
Problem: Analytics show zero views but form is published
Diagnosis:
1. Check if analytics code is blocked by ad blockers
2. Verify form is actually published (not draft)
3. Look for JavaScript errors preventing tracking

Solutions:
1. Test in incognito mode
2. Check form status in form list
3. Add analytics exceptions for wedsync.com
```

**Incomplete Funnel Data**
```
Problem: Views tracked but no starts or completions
Diagnosis:
1. Tracking pixel blocked
2. Form submission errors not reported
3. Bot traffic filtering too aggressive

Solutions:
1. Whitelist tracking domains
2. Check error logs for submission failures
3. Adjust analytics settings
```

### 8. Wedding Industry Specific Issues

#### **Saturday Wedding Day Scenarios**

**High Traffic Overload**
```
Problem: Forms slow or failing on busy wedding Saturdays
Emergency Protocol:
1. Enable "Wedding Day Mode" in dashboard
2. Prioritize essential forms only
3. Pause non-critical form processing
4. Monitor real-time system status
```

**Vendor Coordination Issues**
```
Problem: Multiple vendors receiving conflicting information
Solutions:
1. Use "Wedding Master Form" for timeline changes
2. Enable vendor notification sync
3. Create shared vendor dashboard
4. Set up real-time alerts for critical changes
```

**Time-Sensitive Submissions**
```
Problem: Same-day wedding updates not processing fast enough
Solutions:
1. Use "Priority Processing" for urgent submissions
2. Enable SMS notifications for critical forms
3. Set up dedicated phone support for emergencies
4. Create "Emergency Contact" forms
```

---

## 🔍 Advanced Troubleshooting

### Debug Mode for Developers

**Enable Debug Mode**
```javascript
// Add to browser console for detailed logging
localStorage.setItem('wedsync_debug', 'true');
// Refresh page to see detailed logs
```

**Common Debug Information**
- Form validation details
- Conditional logic evaluation steps
- CRM sync attempt logs
- Performance timing data
- Network request/response data

### Browser Developer Tools

**Essential Debug Techniques**

1. **Console Tab**: Look for JavaScript errors (red text)
2. **Network Tab**: Check for failed API calls (red status codes)
3. **Application Tab**: Clear local storage and cookies
4. **Elements Tab**: Inspect form HTML structure

**Performance Profiling**
```
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with form builder
5. Stop recording
6. Look for slow functions (red bars)
```

### Database Query Troubleshooting

**Slow Queries**
```sql
-- Check form submission query performance
EXPLAIN ANALYZE 
SELECT * FROM form_submissions 
WHERE form_id = 'uuid-here' 
ORDER BY created_at DESC 
LIMIT 50;

-- Verify indexes are being used
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename LIKE 'form%'
ORDER BY idx_tup_read DESC;
```

**Connection Pool Issues**
```
Symptoms: Intermittent "connection refused" errors
Diagnosis:
1. Check active connections: SELECT count(*) FROM pg_stat_activity;
2. Monitor connection pool size
3. Look for connection leaks in application logs

Solutions:
1. Increase connection pool size
2. Implement connection timeout
3. Fix application connection leaks
```

---

## 📞 Getting Expert Help

### When to Contact Support

**Immediate Support Required**
- Saturday wedding day issues
- Data loss or corruption
- Security breaches
- Complete system outages

**Standard Support**
- Feature not working as expected
- Performance issues
- Integration problems
- Account access issues

**Self-Service First**
- How-to questions (check user guide)
- Feature requests
- General usage questions

### Information to Include in Support Requests

**Always Provide**
1. **Your organization name and account email**
2. **Exact error message** (screenshot preferred)
3. **Steps to reproduce the problem**
4. **Browser type and version**
5. **Form ID or URL** if applicable

**For Form Issues**
6. **Form name and ID**
7. **Field names causing problems**
8. **Conditional logic configuration**
9. **When problem started occurring**

**For CRM Issues**
10. **CRM type** (Tave, HoneyBook, Light Blue)
11. **Last successful sync timestamp**
12. **Submission ID that failed to sync**
13. **CRM account details** (without passwords)

**For Performance Issues**
14. **Number of forms and fields**
15. **Time of day when slow**
16. **Internet connection speed**
17. **Other users experiencing same issue**

### Support Escalation Process

**Level 1 - Chat/Email Support**
- Response time: Under 4 hours
- Best for: General questions, how-to guidance

**Level 2 - Technical Support**
- Response time: Under 2 hours
- Best for: Integration issues, bugs, performance problems

**Level 3 - Emergency Response**
- Response time: Under 15 minutes
- For: Wedding day emergencies, data loss, security issues

**Weekend Emergency Protocol**
1. **Call 1-800-WEDSYNC-911**
2. **Provide wedding date and venue**
3. **Describe impact on wedding**
4. **Emergency tech will be assigned**

---

## 📊 Performance Monitoring

### Key Metrics to Watch

**Form Performance**
- Page load time: <2 seconds target
- Form render time: <1 second target
- Submission processing: <5 seconds target

**User Experience**
- Completion rate: >60% target
- Error rate: <2% target
- Mobile performance: Within 20% of desktop

**System Health**
- API response time: <200ms average
- Database query time: <50ms average
- CRM sync success rate: >98% target

### Setting Up Monitoring Alerts

**Critical Alerts** (Immediate notification)
- Form submission failures >5%
- CRM sync failures >10%
- Page load times >5 seconds
- Database connection failures

**Warning Alerts** (Daily digest)
- Completion rates dropping >10%
- Slower than normal performance
- Higher than normal error rates
- Unusual traffic patterns

---

## 🛠️ Preventive Maintenance

### Daily Checks
- [ ] Monitor form submission success rates
- [ ] Check CRM sync status
- [ ] Review error logs for patterns
- [ ] Test critical forms quickly

### Weekly Maintenance
- [ ] Review form performance analytics
- [ ] Check browser compatibility
- [ ] Update form templates if needed
- [ ] Clean up old test submissions

### Monthly Reviews
- [ ] Analyze conversion rate trends
- [ ] Review and update troubleshooting procedures
- [ ] Test disaster recovery procedures
- [ ] Update integration credentials if needed

### Quarterly Planning
- [ ] Review form strategy and ROI
- [ ] Plan form template updates
- [ ] Evaluate new integration needs
- [ ] Conduct user training refresher

---

**Remember**: Wedding data is irreplaceable. When in doubt, escalate to support rather than risk data loss. Every submission represents a real couple's special day! 💒