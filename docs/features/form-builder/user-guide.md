# WedSync Advanced Form Builder - Complete User Guide

## 🎯 Why This Matters to Your Wedding Business

The Advanced Form Builder is your secret weapon to **stop losing 10+ hours per wedding on admin work**. Instead of chasing clients for information, create smart forms that automatically collect exactly what you need and feed directly into your workflow.

### What This Means for Different Wedding Vendors

**📸 Photographers**: Create intake forms that capture everything from engagement session preferences to special family dynamics, then watch as client details flow directly into your Tave or HoneyBook CRM.

**🏛️ Venues**: Build booking questionnaires that qualify leads automatically - capture guest count, catering needs, and budget requirements before you spend time on a tour.

**🌸 Florists**: Design consultation forms that collect color preferences, venue details, and inspiration photos, so you arrive at meetings fully prepared.

**🍰 Caterers**: Create detailed preference forms that capture dietary restrictions, service style preferences, and guest counts - essential for accurate quotes.

## 🚀 Getting Started (5-Minute Setup)

### Step 1: Access Your Form Builder
1. Log into your WedSync dashboard
2. Navigate to **Forms** → **Create New Form**
3. Choose **"Start from Scratch"** or select a template for your vendor type

### Step 2: Name Your Form
Choose a clear, client-friendly name:
- ✅ "Wedding Photography Consultation Form"
- ✅ "Venue Tour Booking Questionnaire" 
- ✅ "Floral Design Preference Form"
- ❌ "Client Intake Form #3"

### Step 3: Choose Your Template (Optional)
We provide pre-built templates for:
- **Photography Consultation** (15 fields, conditional logic included)
- **Venue Booking** (12 fields, capacity-based conditional logic)
- **Catering Questionnaire** (18 fields, dietary restrictions focus)
- **Floral Design Brief** (14 fields, inspiration photo uploads)
- **Wedding Planning Intake** (25 fields, comprehensive wedding details)

## 🎨 Building Your Perfect Form

### Available Field Types

#### Standard Fields
- **Text Input**: Names, locations, special requests
- **Email**: Client contact information  
- **Phone**: With automatic formatting
- **Date Picker**: Wedding dates, event timelines
- **Dropdown/Select**: Multiple choice options
- **Radio Buttons**: Single choice (Yes/No questions)
- **Checkboxes**: Multiple selections
- **Text Area**: Detailed descriptions, special requests
- **Number**: Guest counts, budgets
- **File Upload**: Inspiration photos, venue layouts, contracts

#### Wedding-Specific Fields
- **Wedding Date**: Special validation for booking conflicts
- **Guest Count**: Automatic venue capacity checks
- **Budget Range**: Discrete options for comfortable disclosure
- **Vendor Coordination**: Multi-vendor selection with notifications
- **Timeline Builder**: Drag-and-drop wedding day schedule
- **RSVP Management**: Guest response tracking
- **Dietary Requirements**: Comprehensive allergy and preference tracking

#### Advanced Fields
- **Signature Capture**: For contracts and agreements
- **Payment Collection**: Integrated Stripe for retainers
- **Address Lookup**: Auto-complete with Google Maps
- **Calendar Booking**: Automatic consultation scheduling
- **Photo Gallery**: Client inspiration boards

### Smart Field Configuration

#### Making Fields Required
- Use sparingly - only for absolutely essential information
- **Required for photographers**: Client name, wedding date, contact email
- **Required for venues**: Event date, guest count, contact information
- **Optional but valuable**: Budget, style preferences, special requests

#### Adding Help Text
Every field should have clear help text:
```
Field: "Wedding Style Preference"
Help Text: "Examples: Rustic/barn, elegant/classic, modern/minimalist, bohemian/outdoor"
```

#### Setting Up Validation
- **Email fields**: Automatic email format validation
- **Phone fields**: Format validation with international support
- **Date fields**: Minimum booking lead time (e.g., 6 months for photographers)
- **Number fields**: Reasonable ranges (guest count 1-1000)
- **File uploads**: Accepted formats and size limits

## 🧠 Conditional Logic - The Game Changer

Conditional logic shows/hides fields based on previous answers. This makes your forms feel intelligent and reduces client overwhelm.

### Photography Examples

**Show engagement session fields only if they're interested:**
```
IF "Include engagement session?" = "Yes"
THEN show:
- "Preferred engagement location"
- "Engagement session timeline"
- "Special engagement requests"
```

**Show travel fields only for destination weddings:**
```
IF "Wedding type" = "Destination Wedding"
THEN show:
- "Travel requirements"
- "Accommodation preferences"
- "Local vendor coordination needed"
```

### Venue Examples

**Show large wedding options for 150+ guests:**
```
IF "Guest count" > 150
THEN show:
- "Large event coordination"
- "Additional staffing requirements"
- "Extended setup time needed"
```

**Show catering fields only if using in-house catering:**
```
IF "Catering preference" = "Venue catering"
THEN show:
- "Menu selection"
- "Dietary restrictions"
- "Bar service level"
```

### Setting Up Conditional Logic

1. **Add your trigger field first** (the field that controls what shows/hides)
2. **Click "Add Conditional Logic"** on the field you want to show/hide
3. **Choose your condition**:
   - Field equals specific value
   - Field contains text
   - Field is greater/less than number
   - Field is not empty
4. **Set the action**: Show or Hide
5. **Test your logic** in preview mode

## 📱 Mobile Optimization (Critical for Wedding Vendors)

60% of your clients will complete forms on their phones, often during venue visits or commute time.

### Mobile-First Design Tips

#### Field Order Strategy
1. **Start with easy fields**: Name, email (builds momentum)
2. **Group related fields**: All contact info together
3. **End with complex fields**: Detailed descriptions, file uploads
4. **Save heaviest lifting for last**: Multiple choice questions, long lists

#### Touch-Friendly Design
- **Minimum button size**: 48px (automatically applied)
- **Adequate spacing**: No accidental taps
- **Large text inputs**: Easy typing on small screens
- **Clear field labels**: No abbreviations or jargon

#### File Uploads on Mobile
- **Accept multiple formats**: JPEG, PNG, HEIC (iPhone), PDF
- **Enable camera capture**: "Take photo" option for inspiration shots
- **Show upload progress**: Clients need to see files uploading
- **Compress automatically**: Reduce upload times on cellular

## 🔗 CRM Integration - Zero Double Entry

Connect your forms to your existing CRM to eliminate manual data entry.

### Supported CRMs

#### Tave (Photographers)
- **Automatic contact creation**: Form data → Tave contact
- **Project association**: Link to specific wedding projects  
- **Custom field mapping**: Your form fields → Tave fields
- **Lead scoring**: Automatically tag hot prospects
- **Follow-up automation**: Trigger email sequences

**Setup Process:**
1. Go to Settings → Integrations → Tave
2. Enter your Tave API credentials
3. Map your form fields to Tave contact fields
4. Test with a sample submission
5. Enable automatic sync

#### HoneyBook (Multi-vendor)
- **Lead creation**: Form submissions become HoneyBook leads
- **Project templates**: Auto-create projects with forms
- **Proposal automation**: Trigger custom proposals
- **Contract sending**: Automatic contract delivery
- **Payment requests**: Send invoice based on form data

#### Light Blue (No API - Screen Scraping)
- **Automated data entry**: We fill out Light Blue forms for you
- **Contact creation**: Submit form data to your Light Blue account  
- **Project association**: Link to wedding projects
- **Custom field handling**: Map unique form fields
- **Error handling**: Retry on failures with notifications

### Field Mapping Strategy

**Standard Mappings:**
- Form "Primary Contact" → CRM "Client Name"
- Form "Wedding Date" → CRM "Event Date" 
- Form "Guest Count" → CRM "Party Size"
- Form "Venue" → CRM "Event Venue"
- Form "Budget" → CRM "Project Value"

**Custom Mappings for Photographers:**
- Form "Engagement Session?" → CRM Tag "Engagement"
- Form "Style Preference" → CRM "Photography Style"
- Form "Special Requests" → CRM "Project Notes"

## 📧 Email Automation - Stay Connected

### Confirmation Emails
Automatically sent when clients submit forms:

**Photography Example:**
```
Subject: Thanks for your photography inquiry, Sarah!

Hi Sarah,

Thanks for submitting your wedding photography consultation form. I'm excited about your August 15th wedding at Sunset Gardens!

Here's what happens next:
✓ I'll review your details and inspiration photos
✓ I'll send you my portfolio link and pricing guide
✓ We'll schedule a consultation within 48 hours

Questions? Just reply to this email!

Best,
[Your Name]
```

### Follow-up Sequences
Create automated email sequences based on form responses:

**High-budget leads** (Budget >$5,000):
- Day 0: Premium portfolio and pricing
- Day 2: Personal video introduction
- Day 5: Available dates and consultation booking

**Standard leads** (Budget $2,000-$5,000):
- Day 0: Standard portfolio and pricing  
- Day 3: Testimonials and recent work
- Day 7: Limited-time booking incentive

### Notification Settings
Stay informed without being overwhelmed:

- **Instant notifications**: High-priority forms (same-day weddings, premium inquiries)
- **Daily digest**: Regular form submissions summary
- **Weekly reports**: Form performance and conversion rates

## 🎯 Form Optimization for Wedding Vendors

### Conversion Rate Optimization

#### The 5-Field Rule for Mobile
Keep initial forms to 5 fields or fewer on mobile:
1. Client Name
2. Email Address  
3. Wedding Date
4. Guest Count (approximate)
5. How did you hear about us?

#### Progressive Disclosure
Start with basic info, then expand:
```
Page 1: Contact & Wedding Basics (5 fields)
Page 2: Style & Preferences (8 fields)  
Page 3: Details & Inspiration (10 fields)
```

#### Smart Defaults
Pre-fill fields when possible:
- **Season selection**: Based on wedding date
- **Guest count ranges**: Instead of exact numbers
- **Local venues**: Auto-suggest based on your location
- **Style preferences**: Based on your portfolio

### A/B Testing Your Forms

Test different versions to improve conversion:

#### Test Elements
- **Form length**: 5 fields vs 12 fields
- **Field order**: Contact info first vs wedding details first
- **Call-to-action**: "Submit" vs "Get My Custom Quote"
- **Help text**: Minimal vs detailed explanations
- **Visual design**: Clean vs branded

#### Testing Process
1. **Create two versions** of your form
2. **Split traffic 50/50** for 30 days
3. **Track completion rates** and lead quality  
4. **Analyze results** and implement winner
5. **Test new elements** continuously

## 📊 Analytics & Insights

### Form Performance Dashboard

Track key metrics to optimize your lead generation:

#### Conversion Metrics
- **View-to-start rate**: How many visitors begin your form
- **Completion rate**: Percentage who finish your form
- **Drop-off points**: Where clients abandon the form
- **Time to complete**: Average completion time
- **Mobile vs desktop**: Performance by device

#### Lead Quality Metrics  
- **Inquiry-to-consultation rate**: Form leads who book consultations
- **Consultation-to-booking rate**: Consultations that become clients
- **Average project value**: Revenue per form lead
- **Lead source effectiveness**: Which marketing channels work best

#### Optimization Insights
- **Field performance**: Which fields cause drop-offs
- **Mobile usability**: Touch interactions and errors
- **Load times**: Form rendering speed
- **Error rates**: Validation issues and fixes needed

### Advanced Analytics

#### Heat Mapping
See where clients click, scroll, and spend time:
- **Field interaction patterns**: Which fields get attention
- **Button effectiveness**: CTA performance 
- **Mobile touch patterns**: Finger-friendly design validation
- **Scroll behavior**: Form length optimization

#### Client Journey Tracking
Follow clients from marketing to booking:
```
Google Ads → Landing Page → Form View → Form Start → 
Form Complete → Email Sent → Consultation Booked → 
Client Contract Signed
```

## 🔒 Security & Privacy for Wedding Data

Wedding data is deeply personal and irreplaceable. Our security ensures client trust and GDPR compliance.

### Data Protection Features

#### Encryption
- **Data in transit**: SSL encryption for all form submissions
- **Data at rest**: AES-256 encryption for stored data
- **Backup encryption**: All backups encrypted and geo-distributed
- **File upload security**: Virus scanning and secure storage

#### Access Controls  
- **Role-based permissions**: Control who sees which form data
- **Two-factor authentication**: Extra security for your account
- **Session management**: Automatic logout and session monitoring
- **Audit logs**: Track who accessed what data and when

#### GDPR Compliance
- **Consent management**: Clear consent for data collection
- **Data portability**: Export client data on request
- **Right to deletion**: Permanently remove data on request
- **Privacy by design**: Minimal data collection principles
- **Data processing agreements**: Legal compliance documentation

### Client Privacy Options

#### Anonymous Submissions
Allow preliminary inquiries without personal details:
- **Basic wedding info**: Date, guest count, style
- **Contact reveal**: Only after mutual interest
- **Lead qualification**: Before sharing contact details

#### Secure File Sharing
For sensitive documents:
- **Password-protected links**: Secure inspiration photo sharing
- **Expiring links**: Temporary access to uploaded files  
- **Access logs**: Track who downloaded what files
- **Client portals**: Secure ongoing file sharing

## 🚨 Troubleshooting Common Issues

### Forms Not Loading
**Symptoms**: Blank form builder screen, endless loading
**Causes & Solutions**:
- **Browser cache**: Clear cache and hard refresh (Ctrl+F5)
- **JavaScript errors**: Check browser console, disable ad blockers
- **Account permissions**: Verify form creation permissions
- **Internet connection**: Check connectivity, try different network

### Conditional Logic Not Working
**Symptoms**: Fields not showing/hiding as expected
**Diagnosis Steps**:
1. **Check trigger field name**: Must match exactly (case-sensitive)
2. **Verify condition values**: Check for extra spaces or typos
3. **Test logic step-by-step**: Preview mode testing
4. **Review condition operators**: Equals vs Contains vs Greater Than

### Form Submissions Failing
**Symptoms**: Clients report form won't submit, validation errors
**Solutions**:
1. **Required field validation**: Ensure all required fields are marked correctly
2. **File upload limits**: Check file size restrictions (10MB max)
3. **Email format validation**: Test with various email formats
4. **Preview mode testing**: Submit test form yourself
5. **Browser compatibility**: Test in Chrome, Safari, Firefox

### CRM Sync Issues
**Symptoms**: Form data not appearing in CRM
**Troubleshooting**:
1. **API credentials**: Verify CRM connection settings
2. **Field mapping**: Check all mapped fields exist in CRM
3. **Rate limiting**: CRM may have API call limits
4. **Error logs**: Check integration logs for error messages
5. **Manual sync**: Try syncing a single submission manually

### Mobile Form Problems  
**Symptoms**: Poor mobile experience, difficult navigation
**Fixes**:
1. **Touch targets**: Ensure buttons are finger-sized (48px+)
2. **Keyboard issues**: Test with mobile keyboards
3. **Scroll problems**: Check form height and scrolling
4. **File upload**: Test mobile photo uploads
5. **Preview testing**: Test on actual mobile devices

## 📞 Getting Help & Support

### Self-Service Resources
- **Knowledge Base**: Searchable help articles at help.wedsync.com
- **Video Tutorials**: Step-by-step form building guides
- **Template Library**: Pre-built forms for every vendor type
- **Community Forum**: Ask questions, share tips with other vendors

### Direct Support Options

#### Chat Support (Fastest)
- **Business hours**: Monday-Friday, 9 AM - 6 PM ET
- **Response time**: Under 5 minutes average
- **Best for**: Quick questions, technical issues
- **Access**: Click chat bubble in bottom-right corner

#### Email Support (Most Detailed)
- **Email**: support@wedsync.com
- **Response time**: Under 4 hours during business days
- **Best for**: Complex issues, feature requests, account problems
- **Include**: Screenshots, form URLs, error messages

#### Phone Support (Premium)
- **Available for**: Professional and Scale plan customers
- **Phone**: 1-800-WEDSYNC
- **Hours**: Monday-Friday, 9 AM - 5 PM ET
- **Best for**: Urgent issues, personalized training

### Emergency Wedding Day Support

**Saturday Support** (Because weddings don't wait):
- **Priority hotline**: 1-800-WEDSYNC-911
- **Response time**: Under 15 minutes
- **Available**: Saturdays 6 AM - 11 PM ET
- **For**: Form submission failures, CRM sync issues, client communication problems

## 🎓 Advanced Form Strategies

### Lead Qualification Automation

Create forms that automatically score and route leads:

#### Point-Based Scoring
```
Budget >$5,000: +10 points
Wedding date <6 months: +5 points  
Referred by past client: +8 points
Multiple vendor types needed: +3 points
Flexible on date: +2 points
```

#### Automatic Routing
- **Hot leads** (20+ points): Immediate text notification + personal email
- **Warm leads** (10-19 points): Email notification + follow-up sequence  
- **Cool leads** (0-9 points): Weekly digest + nurturing sequence

### Multi-Step Form Strategy

Break complex forms into digestible steps:

#### Step 1: The Hook (2 minutes)
- Client name and wedding date
- Quick style assessment  
- "Get instant pricing estimate"

#### Step 2: The Details (5 minutes)
- Contact information
- Venue and guest count
- Photography style preferences
- Timeline requirements

#### Step 3: The Close (3 minutes)
- Budget discussion
- Special requests
- Inspiration photos
- Consultation scheduling

### Seasonal Form Optimization

#### Wedding Season (April - October)
- **Simplified forms**: Quick response during busy season
- **Automated screening**: Filter serious inquiries
- **Capacity management**: Hide booking forms when full
- **Premium positioning**: Higher pricing visibility

#### Off-Season (November - March)
- **Detailed forms**: More comprehensive information gathering
- **Incentive collection**: Early booking discounts
- **Relationship building**: Personal connection emphasis
- **Planning focus**: Help clients plan ahead

## 📈 Success Metrics to Track

### Form Performance KPIs

#### Conversion Metrics
- **Form completion rate**: Target >60% for mobile, >70% for desktop
- **Field drop-off rate**: <5% per field ideally
- **Time to complete**: <3 minutes for initial forms
- **Mobile vs desktop performance**: Within 10% of each other

#### Lead Quality Metrics
- **Inquiry-to-consultation**: Target >25% conversion
- **Consultation-to-booking**: Target >40% conversion  
- **Average deal size**: Track revenue per form lead
- **Response time impact**: Faster response = higher conversion

#### Business Impact Metrics
- **Time saved per lead**: Measure admin time reduction
- **Lead volume increase**: Compare to previous methods
- **Booking rate improvement**: Overall business conversion
- **Client satisfaction scores**: Form experience ratings

### ROI Calculation

#### Time Savings Value
```
Previous process: 45 minutes per inquiry
With forms: 10 minutes per inquiry  
Time saved: 35 minutes per inquiry
Value (at $100/hour): $58.33 per inquiry

100 inquiries/month = $5,833/month saved
Annual savings: $70,000
```

#### Conversion Improvement Value
```
Previous conversion rate: 15%
With optimized forms: 25%
Improvement: 10 percentage points

100 inquiries × 10% × $3,000 average booking = $30,000 monthly increase
Annual revenue increase: $360,000
```

---

## 🎉 You're Ready to Transform Your Wedding Business!

The Advanced Form Builder isn't just about collecting information—it's about creating a professional, efficient client experience that positions you as the premium choice.

### Your Next Steps:
1. **Create your first form** using our photographer/venue template
2. **Set up CRM integration** to eliminate double data entry  
3. **Add conditional logic** to make your form feel intelligent
4. **Test on mobile** to ensure perfect client experience
5. **Monitor your metrics** and optimize for better conversion

### Remember:
- **Start simple**: You can always add more fields later
- **Think like a client**: Make the experience delightful, not overwhelming
- **Test everything**: Preview mode is your best friend
- **Measure results**: Use analytics to continuously improve

**Questions?** Our support team is here to help you succeed. Chat with us anytime or email support@wedsync.com.

---

*WedSync Advanced Form Builder - Turning wedding inquiries into bookings, automatically.* 🌟