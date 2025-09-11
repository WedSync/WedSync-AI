AI Features Documentation
Overview
WedSync uses AI strategically to save time and reduce friction. We split AI costs between platform-covered features (included in subscription) and user-provided API keys (for high-usage features). This keeps the platform sustainable while providing powerful AI capabilities.
AI Cost Architecture
Platform-Paid AI (Included in Subscription)
These are one-time or low-frequency AI operations that WedSync pays for:

Form generation from PDF/image
Website content extraction
FAQ generation
Template creation
Field mapping intelligence

User-Paid AI (Their API Key)
These are high-volume, ongoing AI operations:

AI chatbot conversations
Dynamic content generation
Personalized email writing
Custom automations

1. AI Form Import System
PDF/Image Form Extraction
Purpose: Convert existing PDF or image forms into WedSync digital forms
Supported Formats:

PDF files (up to 10 pages)
Images (JPG, PNG, HEIF)
Word documents (.docx)
Excel sheets (.xlsx)

Sub-Agent Task: Form Extractor
markdownSTEP 1: File Upload Handler
1. Accept file upload through drag-drop or button
2. Check file size (max 10MB)
3. Check file type is supported
4. Generate unique file ID
5. Upload to Supabase storage bucket: form-imports/[supplier_id]/[file_id]
6. Create job in form_import_jobs table with status: 'processing'

STEP 2: Document Processor
1. If PDF:
   - Use pdf-parse library to extract text
   - Use pdf2pic to convert each page to image
   - Store page images in: form-imports/[supplier_id]/[file_id]/pages/
2. If Image:
   - Check resolution (min 150 DPI)
   - Enhance contrast if needed
   - Store processed image
3. If Word/Excel:
   - Use mammoth.js for Word
   - Use xlsx library for Excel
   - Extract structured content

STEP 3: AI Analysis Preparation
1. For each page image, create base64 encoded string
2. Prepare OpenAI API call with:
   - Model: gpt-4-vision-preview
   - Max tokens: 4000
   - Temperature: 0.1 (low for accuracy)
3. Create analysis prompt (see below)

STEP 4: OpenAI Vision API Call
Prompt structure:
"Analyze this wedding vendor form and extract:
1. All form fields with their exact labels
2. Field types (text, checkbox, radio, select, date)
3. Whether fields are required (look for asterisks or 'required')
4. Field groupings/sections
5. Any conditional logic visible
6. Default values or placeholder text

Return as JSON:
{
  sections: [
    {
      name: 'Contact Information',
      fields: [
        {
          label: 'Couple Names',
          type: 'text',
          required: true,
          placeholder: 'Enter both names',
          core_field_match: 'couple_names'
        }
      ]
    }
  ]
}"

STEP 5: Process AI Response
1. Parse JSON response
2. Validate structure
3. Map to WedSync field types:
   - 'text' → 'single_line_text'
   - 'paragraph' → 'multi_line_text'
   - 'checkbox' → 'checkbox_group'
   - 'radio' → 'radio_select'
   - 'dropdown' → 'dropdown_select'
4. Store in form_import_results table

STEP 6: Core Field Matching
1. For each extracted field label:
2. Compare against core_fields_mappings table
3. Use fuzzy matching (Levenshtein distance)
4. Common mappings:
   - "Your Names", "Couple Names", "Names" → couple_names
   - "Wedding Date", "Event Date", "Date" → wedding_date
   - "Email", "Email Address", "Contact Email" → email
5. Mark confidence score (0-100)
6. If confidence > 80, auto-link to core field

STEP 7: Create Form Builder Preview
1. Generate form structure in form_templates table
2. Create preview URL
3. Update job status to 'ready_for_review'
4. Send notification to supplier
Natural Language Form Generation
Purpose: Create forms from simple text descriptions
Sub-Agent Task: Form Generator from Text
markdownSTEP 1: Input Collection
1. Show textarea with prompt:
   "Describe your form in plain English"
2. Provide examples:
   - "I need a wedding timeline form with ceremony time, 
     reception time, and special events"
   - "Create a family photo list form with groups 
     and specific shot requests"
3. Minimum 20 characters, maximum 500

STEP 2: Enhance Prompt
1. Add context to user input:
   "Create a wedding [VENDOR_TYPE] form based on this description: [USER_INPUT]
   
   Include appropriate field types:
   - Text fields for names and descriptions
   - Date/time pickers for scheduling
   - Checkboxes for options
   - Number fields for counts
   
   Mark wedding-specific fields that match core fields.
   Make it professional and comprehensive."

STEP 3: OpenAI API Call
1. Model: gpt-4-turbo-preview
2. Temperature: 0.7 (some creativity)
3. Max tokens: 2000
4. Response format: JSON

STEP 4: Generate Form Structure
Response processing:
1. Parse JSON form structure
2. Create form in database:
   - form_templates table entry
   - form_fields table entries
   - form_sections table entries
3. Apply vendor-specific defaults:
   - Photographers: Add shot list section
   - Caterers: Add dietary requirements
   - DJs: Add music preferences
4. Link detected core fields

STEP 5: Preview and Edit
1. Redirect to form builder
2. Show generated form
3. Allow drag-drop editing
4. Track generation success for learning
2. Website Content Extraction
FAQ Extraction from Websites
Purpose: Automatically extract FAQs from supplier's existing website
Sub-Agent Task: Website FAQ Scraper
markdownSTEP 1: URL Validation
1. Accept website URL input
2. Validate URL format
3. Check URL is accessible (not 404)
4. Check not blocked by robots.txt
5. Store in website_scraping_jobs table

STEP 2: Web Scraping
1. Use Playwright for JavaScript-rendered sites
2. Navigate to URL
3. Wait for page load (max 10 seconds)
4. Look for FAQ indicators:
   - URLs containing: /faq, /questions, /help
   - Headings containing: "FAQ", "Questions", "Q&A"
   - Schema markup: FAQPage schema
5. Extract page HTML

STEP 3: Content Extraction
1. If FAQ page found:
   - Extract question-answer pairs
   - Clean HTML tags
   - Preserve formatting
2. If no FAQ page:
   - Extract all page content
   - Look for question patterns (sentences ending with "?")
   - Look for Q&A structures

STEP 4: AI FAQ Generation
OpenAI Prompt:
"Extract or generate FAQs from this website content:
[SCRAPED_CONTENT]

For a [VENDOR_TYPE] business, create 10-15 relevant FAQs.
Use actual content when available.
Focus on:
- Pricing and packages
- Booking process  
- What's included
- Experience/credentials
- Working style
- Common concerns

Format as JSON:
{
  faqs: [
    {
      question: 'How far in advance should we book?',
      answer: 'We recommend booking 12-18 months in advance...',
      category: 'Booking',
      source: 'extracted' or 'generated'
    }
  ]
}"

STEP 5: Store FAQs
1. Save to supplier_faqs table
2. Mark source (extracted vs generated)
3. Set review_required flag for generated ones
4. Create default categories:
   - Booking & Pricing
   - Our Process
   - On the Day
   - After the Wedding
5. Allow supplier to edit/approve
Article Content Extraction
Sub-Agent Task: Article Extractor
markdownSTEP 1: Blog/Article Detection
1. Look for blog patterns:
   - /blog, /news, /articles in URL
   - Article schema markup
   - WordPress/Squarespace patterns
2. Extract article list

STEP 2: Article Processing
For each article (max 10):
1. Extract title
2. Extract main content (using Readability.js)
3. Extract publish date
4. Extract author if available
5. Remove ads, navigation, footers
6. Preserve images with captions

STEP 3: Content Formatting
1. Convert to Markdown
2. Compress images (max 800px wide)
3. Upload images to Supabase storage
4. Update image URLs to hosted versions
5. Create table of contents for long articles

STEP 4: Save to Database
1. Store in supplier_articles table
2. Set status: 'imported'
3. Generate preview
4. Allow supplier to select which to publish
3. AI Chatbot System
Customer-Trained Chatbot
Purpose: Answer common questions using supplier's knowledge base
Sub-Agent Task: Chatbot Setup Wizard
markdownSTEP 1: Knowledge Base Collection
Sources to include:
1. All approved FAQs
2. Published articles
3. Form questions and help text
4. Business description
5. Service packages
6. Core business info (hours, location, contact)

STEP 2: Knowledge Processing
1. Combine all content into training document
2. Create embeddings using OpenAI text-embedding-ada-002
3. Store embeddings in Supabase pgvector
4. Create index for fast retrieval
5. Total knowledge base size limit: 50,000 tokens

STEP 3: Chatbot Configuration
Settings to configure:
1. Greeting message
2. Personality (Formal/Friendly/Casual)
3. Response length (Short/Detailed)
4. Fallback behavior (when doesn't know answer)
5. Contact prompt (when to suggest direct contact)
6. Business hours awareness

STEP 4: API Key Setup
1. Guide supplier to OpenAI.com
2. Show screenshots of API key generation
3. Validate API key format (sk-...)
4. Test API key with small request
5. Store encrypted in supplier_api_keys table
6. Set monthly spend limit

STEP 5: System Prompt Creation
Generate system prompt:
"You are a helpful assistant for [BUSINESS_NAME], a [VENDOR_TYPE].
Only answer based on the provided knowledge base.
Never make up information.
If you don't know, say: 'I don't have that information, but you can contact us at [EMAIL]'
Keep responses concise and friendly.
Current date: [TODAY]
Business hours: [HOURS]"

STEP 6: Chatbot Widget Implementation
1. Create embeddable widget code
2. Position: bottom-right corner
3. Trigger: bubble icon
4. Mobile responsive
5. Conversation state persistence
Chatbot Response Flow
Sub-Agent Task: Response Handler
markdownSTEP 1: User Message Receipt
1. Receive message from widget
2. Validate not empty
3. Check for profanity/spam
4. Add to conversation history
5. Show typing indicator

STEP 2: Context Retrieval
1. Get last 5 messages for context
2. Search knowledge base for relevant content:
   - Convert question to embedding
   - Find top 5 similar vectors
   - Retrieve associated content
3. Include business context (hours, current date)

STEP 3: OpenAI API Call
Structure:
{
  model: "gpt-3.5-turbo", // or gpt-4 based on config
  messages: [
    {role: "system", content: [SYSTEM_PROMPT]},
    {role: "user", content: "Context: [RETRIEVED_KNOWLEDGE]"},
    {role: "user", content: [USER_MESSAGE]}
  ],
  max_tokens: 250,
  temperature: 0.3
}

STEP 4: Response Processing
1. Receive OpenAI response
2. Check for hallucination indicators:
   - Specific prices not in knowledge base
   - Dates/times not in knowledge base
   - Services not mentioned
3. If detected, replace with fallback
4. Add source citations if applicable
5. Format with Markdown

STEP 5: Send Response
1. Stream response for better UX
2. Save to conversation history
3. Track token usage
4. Update monthly usage counter
5. If approaching limit, notify supplier
4. Smart Field Mapping
Intelligent Field Recognition
Sub-Agent Task: Field Mapper
markdownSTEP 1: Build Mapping Dictionary
Common wedding field mappings:
- Names: couple_names, your_names, client_names, names
- Date: wedding_date, event_date, date, big_day
- Venue: venue, location, ceremony_venue, reception_venue
- Guests: guest_count, number_of_guests, attendance, pax
- Email: email, email_address, contact_email
- Phone: phone, phone_number, contact_number, mobile

STEP 2: Fuzzy Matching Algorithm
1. Normalize field labels:
   - Convert to lowercase
   - Remove special characters
   - Remove common words (the, of, your)
2. Calculate similarity scores:
   - Exact match: 100
   - Contains match: 80
   - Levenshtein distance < 3: 60
   - Semantic similarity: 40
3. Return best match if score > 60

STEP 3: Context Learning
1. Track successful mappings
2. Store in field_mapping_history table
3. Learn supplier-specific terminology
4. Improve suggestions over time
5. Share common mappings across platform
5. AI-Powered Analytics
Predictive Analytics
Sub-Agent Task: Prediction Engine
markdownSTEP 1: Churn Prediction
Data points to analyze:
- Login frequency decline
- Client invitation rate drop
- Form completion decrease
- Support ticket increase
- Payment failure
- Feature usage decline

Algorithm:
1. Calculate baseline for each metric (30-day average)
2. Detect significant deviations (>30% drop)
3. Apply weights:
   - Login frequency: 0.3
   - Client activity: 0.3
   - Feature usage: 0.2
   - Payment issues: 0.2
4. Score 0-100 (higher = more likely to churn)
5. Flag if score > 70

STEP 2: Upsell Prediction
Indicators to track:
- Hitting plan limits
- Feature access attempts
- Client volume growth
- Support questions about locked features
- Time since last upgrade

Generate recommendations:
- "User tried to create 4th form (Starter limit: 3)"
- "Accessed journey builder 5 times (needs Professional)"
- "Client count increased 40% this month"

STEP 3: Success Prediction
For new signups, predict success based on:
- Onboarding completion speed
- First client invitation time
- Form creation complexity
- Integration completeness
- Similar user patterns

Output success probability and recommended interventions
6. Email Content Generation
AI Email Composer
Sub-Agent Task: Email Generator
markdownSTEP 1: Template Enhancement
When supplier writes email template:
1. Detect placeholder sections [NEED_CONTENT]
2. Identify email type:
   - Welcome email
   - Reminder email
   - Thank you email
   - Information request
3. Generate appropriate content

STEP 2: Personalization Variables
Smart variables beyond basic merge tags:
- {{days_until_wedding}} - Calculate from wedding_date
- {{venue_city}} - Extract from venue address
- {{season}} - Derive from wedding date
- {{vendor_team_count}} - Count connected vendors
- {{next_task}} - Pull from journey

STEP 3: Tone Adjustment
Options for email tone:
- Professional: Formal, respectful
- Friendly: Warm, conversational  
- Casual: Relaxed, fun
- Urgent: Direct, action-oriented

Apply tone to generated content while preserving meaning

STEP 4: Subject Line Optimization
Generate 3 subject line options:
- Question format: "Ready for your timeline review?"
- Statement format: "Your wedding timeline is ready"
- Urgency format: "Action needed: Timeline review"
Test performance and learn preferences
7. Content Optimization
SEO Optimization for Directory
Sub-Agent Task: SEO Enhancer
markdownSTEP 1: Profile Optimization
For directory listings:
1. Analyze business description
2. Identify missing keywords:
   - Location terms (city, region)
   - Service terms (photography, wedding)
   - Style terms (documentary, fine-art)
3. Suggest improvements
4. Generate meta description (155 chars)
5. Create alt text for images

STEP 2: Local SEO
Generate location-specific content:
- "[City] Wedding Photographer"
- "Weddings in [Venue Names]"
- "[Region] Wedding Services"
Include in hidden SEO fields

STEP 3: Schema Markup
Generate structured data:
- LocalBusiness schema
- Service schema
- Review aggregate schema
- FAQ schema
Output as JSON-LD for embedding
8. Implementation Controls
API Usage Management
Sub-Agent Task: Usage Monitor
markdownSTEP 1: Track Platform AI Usage
Per supplier per month:
- Form generations: Max 10
- Website scrapes: Max 5
- FAQ generations: Max 3
- Email template assists: Max 20

Store in ai_usage_tracking table:
- supplier_id
- feature_type
- tokens_used
- api_cost
- timestamp

STEP 2: User API Key Management
For chatbot and dynamic features:
1. Monitor usage in real-time
2. Alert at 80% of budget
3. Stop at 100% of budget
4. Email notification system
5. Usage dashboard showing:
   - Daily usage graph
   - Cost breakdown
   - Projection for month
   - Optimization suggestions

STEP 3: Cost Optimization
Strategies to reduce costs:
- Cache common responses
- Use GPT-3.5 for simple tasks
- Batch API calls
- Implement rate limiting
- Use embeddings for retrieval
- Minimize token count in prompts
9. Error Handling
AI Failure Fallbacks
Sub-Agent Task: Error Handler
markdownSTEP 1: API Failure Handling
When OpenAI API fails:
1. Check error type:
   - Rate limit: Wait and retry
   - Invalid key: Notify user
   - Service down: Use fallback
   - Token limit: Truncate and retry
2. Log error details
3. Show user-friendly message
4. Offer alternative action

STEP 2: Fallback Systems
For each AI feature:
- Form generation: Provide templates
- FAQ extraction: Manual entry form
- Chatbot: "Contact us" message
- Field mapping: Manual selection
- Email generation: Basic templates

STEP 3: Quality Checks
Validate AI responses:
- Check JSON structure
- Verify required fields
- Sanitize HTML/scripts
- Validate against schema
- Flag suspicious content
If validation fails, use fallback
Success Metrics
AI Performance Tracking
Metrics to Monitor:

Form generation success rate: Target >90%
FAQ extraction accuracy: Target >80%
Chatbot containment rate: Target >60%
Field mapping accuracy: Target >85%
API cost per supplier: Target <£5/month
User satisfaction with AI: Target >4.0/5.0

ROI Calculation

Time saved per form generation: 2 hours
Time saved per FAQ extraction: 1 hour
Support tickets reduced by chatbot: 40%
Value delivered vs API costs: 10:1 ratio