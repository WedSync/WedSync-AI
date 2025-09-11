# Environment Variables Management - User Guide

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Variables](#managing-variables)
4. [Environment Health](#environment-health)
5. [Security Features](#security-features)
6. [Mobile Usage](#mobile-usage)
7. [Wedding Day Operations](#wedding-day-operations)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### What are Environment Variables?

Environment variables are secure configuration settings that control how your wedding business systems operate. Think of them as the "settings" that tell your website, payment processing, email system, and other tools how to work properly.

**Common Examples:**
- **Payment Processing**: Your Stripe keys that handle wedding payments
- **Email System**: Settings for sending booking confirmations and reminders
- **Photo Storage**: Credentials for storing and sharing wedding photos
- **Calendar Integration**: Settings for syncing wedding dates and appointments

### Why This Matters for Your Wedding Business

Properly configured environment variables ensure:
- ✅ **Payments process correctly** during peak wedding season
- ✅ **Emails reach couples** with booking confirmations and updates
- ✅ **Photos are stored securely** and accessible when needed
- ✅ **Integrations work smoothly** with tools like Tave, HoneyBook, or calendar apps

### Accessing the System

1. **Desktop**: Navigate to the Environment Variables section in your WedSync dashboard
2. **Mobile**: Use the mobile app's Configuration section for on-the-go management
3. **Tablet**: The responsive design works perfectly on tablets for venue management

## 📊 Dashboard Overview

### Main Dashboard Sections

#### 1. Status Overview Cards
- **Total Variables**: Shows how many configuration settings you have
- **Healthy Environments**: Confirms all your business systems are properly configured
- **Warnings**: Alerts you to settings that need attention
- **Critical Issues**: Urgent configurations that could affect your wedding operations

#### 2. Navigation Tabs
- **Dashboard**: Main overview of all your configuration health
- **Variables**: Manage individual configuration settings
- **Health**: Detailed view of environment status
- **Security**: Security classifications and audit logs
- **Deployment**: Synchronize settings between different environments

#### 3. Environment Health Cards
Each card represents a different part of your business setup:
- **Development**: Testing environment (safe to experiment)
- **Staging**: Preview environment (final testing before going live)
- **Production**: Live environment (your actual wedding business)
- **Wedding Critical**: Ultra-critical settings that affect live weddings

### Understanding Health Indicators

| Indicator | Meaning | What to Do |
|-----------|---------|------------|
| 🟢 Healthy | All systems working properly | Nothing needed |
| 🟡 Warning | Minor issues that should be addressed | Review missing variables |
| 🔴 Critical | Urgent issues affecting operations | Fix immediately |

## 🛠️ Managing Variables

### Adding a New Variable

1. **Navigate to Variables Tab**
   - Click "Variables" in the main navigation
   - Click "Add Variable" button

2. **Fill Basic Information**
   - **Variable Key**: Use UPPERCASE with underscores (e.g., `STRIPE_SECRET_KEY`)
   - **Environment**: Choose where this setting applies
   - **Variable Value**: Enter the actual configuration value

3. **Configure Security**
   - **Security Level**: Choose appropriate classification
     - `Public`: Safe to display (e.g., website colors)
     - `Internal`: Internal business settings
     - `Confidential`: Sensitive business data
     - `Wedding-Day-Critical`: Settings that affect live weddings
   - **Encrypt Value**: Check this box for sensitive information

4. **Add Description** (Optional)
   - Explain what this variable does
   - Include any special notes for other team members

### Security Classifications Explained

#### Public Variables
- **Example**: Website theme colors, public contact information
- **Security**: No special protection needed
- **Visibility**: Can be seen by all team members

#### Internal Variables  
- **Example**: Internal tool settings, non-sensitive configurations
- **Security**: Basic access control
- **Visibility**: Visible to authorized team members only

#### Confidential Variables
- **Example**: API keys for non-critical services, internal passwords
- **Security**: Encrypted storage, masked display
- **Visibility**: Only visible when explicitly requested

#### Wedding-Day-Critical Variables
- **Example**: Stripe payment keys, email service credentials, photo storage access
- **Security**: Maximum protection, automatic encryption
- **Visibility**: Highly restricted access with full audit trails

### Editing Variables

1. **Find the Variable**
   - Use the search box to find specific variables
   - Filter by environment or security level
   - Sort by name, update time, or security level

2. **Edit Process**
   - Click the "More Options" button (three dots)
   - Select "Edit Variable"
   - Make your changes
   - Click "Update Variable"

3. **Important Notes**
   - Changes to production variables require confirmation
   - All changes are logged in the audit trail
   - Wedding-critical variables have additional safeguards

### Copying Variables

**Copy Variable Key:**
- Click the copy button next to any variable
- The key name is copied to your clipboard

**Copy Variable Value:**
- Click the eye icon to make the value visible
- Use the dropdown menu to copy the actual value
- Values are automatically masked for security

## 💚 Environment Health

### Health Dashboard

The Health tab provides detailed insights into your configuration:

#### Overall Health Score
- **80-100%**: Excellent - all systems properly configured
- **60-79%**: Good - minor issues to address
- **40-59%**: Fair - several issues need attention  
- **Below 40%**: Poor - urgent attention required

#### Environment-Specific Health
Each environment shows:
- **Variable Count**: How many settings are configured
- **Missing Variables**: Critical settings that need to be added
- **Security Score**: How well your sensitive data is protected
- **Last Sync**: When settings were last updated

### Missing Variables

When variables are missing:
1. **Review the List**: See which specific variables need attention
2. **Check Impact**: Understand how missing variables affect your business
3. **Add Missing Variables**: Use the quick-add feature to resolve issues
4. **Test Configuration**: Verify everything works after adding variables

### Configuration Drift

Configuration drift happens when environments have different settings:
- **Detection**: Automatic monitoring alerts you to differences
- **Resolution**: Use the deployment sync to align environments
- **Prevention**: Regular audits and standardized processes

## 🔐 Security Features

### Access Control

**Role-Based Permissions:**
- **Administrator**: Full access to all variables and environments
- **Developer**: Can modify development and staging environments
- **Read-Only**: View access to track configuration status

### Audit Trail

Every action is logged:
- **Who**: Which user made the change
- **What**: Exactly what was changed
- **When**: Precise timestamp
- **Where**: Which environment was affected
- **Why**: Any notes or descriptions provided

**Viewing Audit Logs:**
1. Go to the Security tab
2. Click "Audit Trail"
3. Filter by user, action type, or date range
4. Export logs for compliance purposes

### Secret Masking

For security, sensitive values are hidden:
- **Partial Display**: Show first and last few characters only
- **Toggle Visibility**: Click the eye icon to see full values
- **Copy Protection**: Secure clipboard handling
- **Screenshot Protection**: Sensitive areas are protected from screenshots

## 📱 Mobile Usage

### Mobile Interface Features

The mobile interface is optimized for wedding professionals on-the-go:

#### Quick Actions
- **Add Variable**: Touch-friendly form with auto-save
- **Health Check**: Quick overview of system status
- **Emergency Access**: Fast access to critical settings

#### Touch Optimization
- **48px Minimum Touch Targets**: Easy interaction on phones
- **Swipe Gestures**: Navigate between environments quickly
- **Auto-Save**: Changes save automatically every 30 seconds
- **Offline Mode**: Read-only access when connection is poor

#### Mobile-Specific Features
- **Bottom Navigation**: Thumb-friendly navigation bar
- **Expandable Details**: Tap to see full variable information  
- **Quick Copy**: One-tap copying of keys and values
- **Emergency Mode**: Simplified interface during critical situations

### Offline Functionality

When you're at a venue with poor signal:
- **Cached Data**: Recently accessed variables are stored locally
- **Read-Only Access**: View critical settings even when offline
- **Auto-Sync**: Changes sync automatically when connection returns
- **Conflict Resolution**: Smart handling of simultaneous changes

## 💒 Wedding Day Operations

### Wedding Day Mode

**Automatic Activation:**
- **Friday 6PM - Sunday 6PM**: System enters read-only mode
- **Protection**: Prevents accidental changes during peak wedding times
- **Override**: Emergency access available for critical issues

**What's Protected:**
- Production environment variables
- Wedding-critical configuration settings
- Payment processing configurations
- Email and communication systems

### Emergency Procedures

**If something goes wrong during a wedding:**

1. **Assess the Situation**
   - Check the Health Dashboard for specific issues
   - Review recent changes in the audit log
   - Identify which environment is affected

2. **Emergency Access** (Administrators only)
   - Use emergency override if absolutely necessary
   - Document all emergency changes
   - Contact technical support for guidance

3. **Quick Fixes**
   - **Payment Issues**: Check Stripe configuration variables
   - **Email Problems**: Verify email service credentials
   - **Photo Upload Issues**: Check storage access keys
   - **Calendar Sync**: Verify calendar integration settings

4. **Communication**
   - Notify couples of any service impacts
   - Keep vendor partners informed
   - Document incident for future prevention

### Post-Wedding Recovery

After resolving emergency issues:
1. **Review Changes**: Check all emergency modifications
2. **Update Documentation**: Record what happened and how it was fixed
3. **Improve Processes**: Update procedures to prevent similar issues
4. **Test Systems**: Verify all configurations are working properly

## 🔧 Common Tasks

### Setting Up Payment Processing

1. **Stripe Configuration**
   ```
   Key: STRIPE_SECRET_KEY
   Environment: production
   Security Level: Wedding-Day-Critical
   Encryption: Enabled
   ```

2. **Test Your Setup**
   - Process a test payment in staging environment
   - Verify webhook endpoints are configured
   - Confirm all payment flows work correctly

### Email System Setup

1. **Email Service Credentials**
   ```
   Key: RESEND_API_KEY
   Environment: production  
   Security Level: Confidential
   Encryption: Enabled
   ```

2. **Email Templates**
   - Configure sender information
   - Set up automated email sequences
   - Test email delivery to couples

### Photo Storage Configuration

1. **Storage Access**
   ```
   Key: AWS_S3_ACCESS_KEY
   Environment: production
   Security Level: Wedding-Day-Critical  
   Encryption: Enabled
   ```

2. **Backup Settings**
   - Configure automatic backup schedules
   - Set retention policies
   - Test photo upload and retrieval

### Calendar Integration

1. **Google Calendar API**
   ```
   Key: GOOGLE_CALENDAR_API_KEY
   Environment: production
   Security Level: Internal
   Encryption: Optional
   ```

2. **Sync Settings**
   - Configure wedding event synchronization
   - Set up automatic reminders
   - Test calendar sharing with couples

## ❓ Troubleshooting

### Common Issues and Solutions

#### Issue: "Variable not found" error
**Solution:**
1. Check the environment (dev/staging/production)
2. Verify the variable key spelling
3. Ensure the variable exists in the correct environment
4. Check access permissions

#### Issue: Payment processing fails
**Solution:**
1. Verify Stripe keys are correct and active
2. Check webhook endpoints are configured
3. Ensure variables are in production environment
4. Test in staging environment first

#### Issue: Emails not sending
**Solution:**
1. Check email service API keys
2. Verify sender domain configuration
3. Review email templates and recipients
4. Check spam filters and delivery logs

#### Issue: Mobile app slow or unresponsive
**Solution:**
1. Clear browser cache and cookies
2. Check internet connection strength
3. Try switching between Wi-Fi and mobile data
4. Refresh the page or restart the app

#### Issue: Can't access during wedding day
**Solution:**
1. Verify it's not during read-only hours (Fri 6PM - Sun 6PM)
2. Use emergency override if authorized
3. Contact system administrator
4. Use mobile app for critical access

### Getting Help

**Self-Service Resources:**
- Check the troubleshooting guide
- Review system health dashboard  
- Search the audit logs for clues
- Try the mobile interface if desktop isn't working

**Technical Support:**
- Email: support@wedsync.com
- Priority support for wedding day emergencies
- Include screenshots and error messages
- Provide your account information and affected environment

---

**Remember**: This system protects your wedding business's most critical settings. When in doubt, ask for help rather than making changes that could affect live weddings. Your couples are counting on everything working perfectly on their special day!

---

*Last Updated: January 2025 | Version 1.0.0*