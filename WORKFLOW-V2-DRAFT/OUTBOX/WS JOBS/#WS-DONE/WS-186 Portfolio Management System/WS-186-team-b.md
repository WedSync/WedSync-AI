# TEAM B - ROUND 1: WS-186 - Portfolio Management System
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create robust backend infrastructure for portfolio image processing, AI-powered metadata extraction, and scalable storage integration
**FEATURE ID:** WS-186 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about image processing pipelines, AI service integration, and database optimization for large-scale portfolio management

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/portfolio/
cat $WS_ROOT/wedsync/src/app/api/portfolio/upload/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/app/api/portfolio/
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to image processing and APIs
await mcp__serena__search_for_pattern("image.*upload.*api.*route");
await mcp__serena__find_symbol("upload", "", true);
await mcp__serena__get_symbols_overview("src/app/api/");
```

### B. BACKEND DOCUMENTATION & SECURITY PATTERNS
```typescript
// CRITICAL: Load security patterns and API standards
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");

// Load existing API patterns for consistency
await mcp__serena__search_for_pattern("withSecureValidation withValidation");
await mcp__serena__find_symbol("secureStringSchema emailSchema", "", true);
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for relevant documentation
# - "Supabase storage file upload edge functions"
# - "Next.js API routes streaming multipart"
# - "Sharp image processing optimization"
# - "OpenAI vision API image analysis"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Portfolio backend requires sophisticated processing pipeline: 1) Secure file upload with validation and malware scanning 2) Multi-resolution image generation for responsive display 3) AI-powered analysis for automatic categorization and tagging 4) EXIF metadata extraction while preserving privacy 5) Database optimization for large image collections 6) CDN integration for global delivery. Must balance processing speed with quality while maintaining security throughout the pipeline.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

### 1. **api-architect**: Portfolio API design and route structure
**Mission**: Design comprehensive API architecture for portfolio management operations
```typescript
await Task({
  subagent_type: "api-architect",
  prompt: `Design portfolio management API for WS-186. Must include:
  
  1. Upload API Endpoints:
  - POST /api/portfolio/upload - Multi-file upload with streaming and progress tracking
  - POST /api/portfolio/batch - Batch processing for multiple images with job queuing
  - GET /api/portfolio/upload/[jobId] - Upload progress and processing status monitoring
  - DELETE /api/portfolio/images/[id] - Secure image deletion with cleanup
  
  2. Management API Endpoints:
  - GET /api/portfolio/[supplierId] - Portfolio retrieval with pagination and filtering
  - PATCH /api/portfolio/images/[id] - Image metadata updates with validation
  - POST /api/portfolio/reorder - Drag-and-drop reordering with optimistic updates
  - POST /api/portfolio/featured - Hero image and featured work management
  
  3. Analytics and Optimization:
  - GET /api/portfolio/analytics/[supplierId] - View statistics and popular images
  - POST /api/portfolio/optimize - Background optimization job triggering
  - GET /api/portfolio/search - Search and filtering with full-text capabilities
  
  Focus on scalable architecture supporting large portfolio collections with efficient data access patterns.`,
  description: "Portfolio API architecture"
});
```

### 2. **database-mcp-specialist**: Database schema and optimization for portfolio data
**Mission**: Design and implement optimized database schema for portfolio management
```typescript
await Task({
  subagent_type: "database-mcp-specialist",
  prompt: `Design database architecture for WS-186 portfolio system. Must include:
  
  1. Portfolio Tables Design:
  - portfolio_images table with comprehensive metadata, AI tags, and optimization status
  - featured_work collections with wedding-specific categorization and style tags
  - portfolio_stats table for analytics tracking and performance monitoring
  - image_processing_jobs for background processing status and error handling
  
  2. Optimization and Performance:
  - Database indexes for efficient portfolio queries and image search
  - JSONB optimization for AI-generated metadata and flexible tag storage
  - Partitioning strategies for large image collections and historical data
  - Query optimization for portfolio galleries and search functionality
  
  3. Security and Access Control:
  - Row Level Security ensuring suppliers only access their portfolio data
  - Audit logging for all portfolio modifications and image access
  - Data retention policies for deleted images and processing logs
  - GDPR compliance for wedding metadata and couple information
  
  Focus on scalable database design supporting millions of portfolio images with fast query performance.`,
  description: "Portfolio database design"
});
```

### 3. **integration-specialist**: AI services and image processing integration
**Mission**: Integrate external AI services and image processing capabilities
```typescript
await Task({
  subagent_type: "integration-specialist",
  prompt: `Implement AI and processing integration for WS-186 portfolio system. Must include:
  
  1. AI Service Integration:
  - Computer vision API integration for automatic wedding scene detection and categorization
  - Image analysis for aesthetic quality scoring and style classification
  - Automated alt text generation for accessibility and SEO optimization
  - EXIF data extraction with privacy filtering and venue detection capabilities
  
  2. Image Processing Pipeline:
  - Multi-resolution image generation with Sharp optimization and format conversion
  - Progressive image enhancement with quality optimization and compression
  - Thumbnail generation with smart cropping and aspect ratio preservation
  - Watermark application with customizable positioning and transparency
  
  3. Storage and CDN Integration:
  - Seamless cloud storage integration with automatic backup and redundancy
  - CDN configuration for global image delivery with edge caching optimization
  - Image transformation API for on-demand resizing and format conversion
  - Cleanup automation for deleted images and orphaned processing artifacts
  
  Focus on reliable integration providing consistent AI analysis while maintaining high processing throughput.`,
  description: "AI and processing integration"
});
```

### 4. **security-compliance-officer**: Portfolio security and data protection
**Mission**: Implement comprehensive security measures for portfolio data and image processing
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security for WS-186 portfolio backend system. Must include:
  
  1. Upload Security Implementation:
  - Comprehensive file validation with type checking, size limits, and malware scanning
  - Secure multipart upload handling with memory management and resource limits
  - Rate limiting for bulk uploads preventing abuse and resource exhaustion
  - Content filtering and automated moderation for inappropriate image detection
  
  2. Data Protection and Privacy:
  - EXIF data sanitization removing sensitive location and camera information
  - Secure storage of wedding metadata with encryption and access controls
  - Privacy compliance for couple names and wedding venue information
  - Audit logging for all portfolio access and modification events
  
  3. API Security Implementation:
  - Input validation with Zod schemas for all portfolio-related API endpoints
  - Authentication verification ensuring suppliers only access their own portfolio data
  - SQL injection prevention with parameterized queries and secure database operations
  - Error handling that prevents information leakage about system architecture
  
  Ensure portfolio system maintains highest security standards while processing sensitive wedding imagery.`,
  description: "Portfolio security implementation"
});
```

### 5. **performance-optimization-expert**: Backend performance and scalability optimization
**Mission**: Optimize backend performance for large-scale portfolio operations
```typescript
await Task({
  subagent_type: "performance-optimization-expert",
  prompt: `Optimize backend performance for WS-186 portfolio system. Must include:
  
  1. Upload Performance Optimization:
  - Streaming upload handling with memory-efficient processing and chunked operations
  - Concurrent processing pipeline for multiple images with resource management
  - Background job queuing for AI analysis and image optimization tasks
  - Optimized database operations with batch inserts and connection pooling
  
  2. Query and Retrieval Optimization:
  - Database query optimization with proper indexing and query plan analysis
  - Caching strategies for frequently accessed portfolio data and image metadata
  - Pagination optimization for large portfolio collections with cursor-based navigation
  - Search performance optimization with full-text indexing and relevance scoring
  
  3. Resource Management:
  - Memory optimization for image processing operations with garbage collection tuning
  - CPU usage optimization with worker threads and processing queue management
  - Storage optimization with automatic cleanup and orphaned file detection
  - API response optimization with compression and efficient JSON serialization
  
  Ensure backend handles large portfolios efficiently while maintaining fast response times.`,
  description: "Backend performance optimization"
});
```

### 6. **documentation-chronicler**: Backend system documentation and integration guides
**Mission**: Create comprehensive documentation for portfolio backend implementation
```typescript
await Task({
  subagent_type: "documentation-chronicler",
  prompt: `Create comprehensive documentation for WS-186 portfolio backend system. Must include:
  
  1. API Documentation:
  - Complete portfolio API reference with endpoint specifications and example requests
  - Authentication and authorization requirements for each portfolio operation
  - Error handling documentation with status codes and troubleshooting guides
  - Rate limiting and usage guidelines for bulk operations and AI processing
  
  2. Technical Implementation Documentation:
  - Image processing pipeline architecture with component interaction diagrams
  - Database schema documentation with relationship diagrams and indexing strategies
  - AI service integration patterns with error handling and fallback procedures
  - Security implementation guidelines for handling sensitive portfolio data
  
  3. Deployment and Operations Guide:
  - Configuration documentation for AI services and image processing parameters
  - Monitoring and alerting setup for portfolio processing jobs and system health
  - Backup and recovery procedures for portfolio images and metadata
  - Performance tuning guidelines for high-volume portfolio operations
  
  Enable development teams to understand, maintain, and extend the portfolio backend system effectively.`,
  description: "Backend documentation"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### MANDATORY SECURITY IMPLEMENTATION:
```typescript
// EVERY API ROUTE MUST USE THIS PATTERN:
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const portfolioUploadSchema = z.object({
  supplier_id: z.string().uuid(),
  category: z.enum(['ceremony', 'reception', 'portraits', 'details']),
  enable_ai_tagging: z.boolean().default(true),
  metadata: z.object({
    caption: secureStringSchema.max(500).optional(),
    tags: z.array(secureStringSchema).max(20)
  }).optional()
});

export const POST = withSecureValidation(
  portfolioUploadSchema,
  async (request, validatedData) => {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting for image uploads
    const rateLimitResult = await rateLimitService.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
    }
    
    // Process validated upload data
    const result = await processPortfolioUpload(validatedData);
    return NextResponse.json(result);
  }
);
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

### SPECIFIC DELIVERABLES FOR WS-186:

#### 1. Portfolio Upload API - `/src/app/api/portfolio/upload/route.ts`
```typescript
// Multi-file upload with AI processing pipeline
// - Secure file validation and malware scanning
// - Streaming upload with progress tracking
// - Background AI analysis job queuing
// - Multi-resolution image generation
```

#### 2. Image Processing Service - `/src/lib/portfolio/image-processing.ts`
```typescript
// Comprehensive image processing pipeline
// - EXIF metadata extraction and privacy filtering
// - Multi-resolution variant generation with Sharp optimization
// - AI-powered categorization and tagging integration
// - Quality optimization and format conversion
```

#### 3. Portfolio Management API - `/src/app/api/portfolio/[supplierId]/route.ts`
```typescript
// Portfolio retrieval and management operations
// - Paginated portfolio queries with filtering and search
// - Metadata updates with validation and audit logging
// - Featured work and hero image management
// - Analytics integration for view tracking and popularity scoring
```

#### 4. Database Migration - `/src/supabase/migrations/[timestamp]_portfolio_management_system.sql`
```sql
-- Comprehensive portfolio database schema
-- - portfolio_images table with AI metadata and optimization status
-- - featured_work collections with wedding categorization
-- - portfolio_stats for analytics and performance tracking
-- - Proper indexing for efficient queries and search operations
```

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-186 technical specification:
- **AI Processing Pipeline**: Computer vision integration for 85%+ categorization accuracy
- **Multi-Resolution Generation**: Responsive image variants for optimal loading performance
- **Metadata Management**: EXIF extraction with privacy filtering and venue detection
- **Scalable Storage**: CDN integration supporting large portfolio collections efficiently

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/app/api/portfolio/upload/route.ts` - Multi-file upload with AI processing
- [ ] `/src/app/api/portfolio/[supplierId]/route.ts` - Portfolio management operations
- [ ] `/src/lib/portfolio/image-processing.ts` - Image processing service with AI integration
- [ ] `/src/lib/portfolio/ai-analysis.ts` - AI categorization and tagging service
- [ ] `/src/supabase/migrations/[timestamp]_portfolio_system.sql` - Database schema
- [ ] `/src/types/portfolio.ts` - TypeScript interfaces for portfolio data

### MUST IMPLEMENT:
- [ ] Secure multi-file upload API with streaming and progress tracking capabilities
- [ ] AI-powered image analysis pipeline with categorization and automatic tagging
- [ ] Multi-resolution image generation with optimization and responsive variants
- [ ] Comprehensive database schema supporting portfolio metadata and analytics
- [ ] Background job processing for AI analysis and image optimization tasks
- [ ] Security validation and rate limiting for all portfolio-related operations
- [ ] Integration with cloud storage and CDN for scalable image delivery

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: `$WS_ROOT/wedsync/src/app/api/portfolio/`
- Services: `$WS_ROOT/wedsync/src/lib/portfolio/`
- Types: `$WS_ROOT/wedsync/src/types/portfolio.ts`
- Migrations: `$WS_ROOT/wedsync/supabase/migrations/`
- Tests: `$WS_ROOT/wedsync/__tests__/api/portfolio/`

## 🏁 COMPLETION CHECKLIST
- [ ] Secure portfolio upload API operational with multi-file support and AI processing
- [ ] Image processing pipeline functional with multi-resolution generation and optimization
- [ ] AI categorization system implemented with wedding-specific accuracy and tagging
- [ ] Database schema deployed supporting portfolio metadata and analytics tracking
- [ ] Background processing system operational for large image collections and batch operations
- [ ] Security measures implemented protecting portfolio data and preventing unauthorized access
- [ ] Performance optimization confirmed supporting high-volume portfolio operations efficiently

**WEDDING CONTEXT REMINDER:** Your backend system processes a wedding photographer's bulk upload of 200+ ceremony and reception photos, automatically detecting venue information from EXIF data, categorizing ceremony vs. reception shots with 85%+ accuracy, generating multiple responsive image sizes, and creating SEO-optimized metadata - transforming raw uploads into an organized, searchable portfolio that helps couples find and choose their ideal wedding photographer.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**