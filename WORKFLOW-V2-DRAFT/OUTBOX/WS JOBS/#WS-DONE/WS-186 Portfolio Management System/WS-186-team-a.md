# TEAM A - ROUND 1: WS-186 - Portfolio Management System
## 2025-01-30 - Development Round 1

**YOUR MISSION:** Create comprehensive portfolio management interface with AI-powered organization and drag-and-drop optimization for wedding suppliers
**FEATURE ID:** WS-186 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about portfolio organization, image optimization workflows, and user-friendly bulk upload interfaces for wedding professionals

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/components/supplier/portfolio/
cat $WS_ROOT/wedsync/src/components/supplier/portfolio/PortfolioManager.tsx | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/components/supplier/portfolio/
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

// Query specific areas relevant to portfolio management
await mcp__serena__search_for_pattern("image.*upload.*gallery");
await mcp__serena__find_symbol("Gallery", "", true);
await mcp__serena__get_symbols_overview("src/components/directory/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide based on feature type
// General SaaS UI (Most features):
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

**🚨 CRITICAL UI TECHNOLOGY STACK:**
- **Untitled UI**: Primary component library (MANDATORY)
- **Magic UI**: Animations and visual enhancements (MANDATORY)
- **Tailwind CSS 4.1.11**: Utility-first CSS
- **Lucide React**: Icons ONLY

**❌ DO NOT USE:**
- Radix UI, Catalyst UI, shadcn/ui, or any other component libraries

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for relevant documentation
# - "React drag and drop file upload"
# - "Next.js image optimization responsive"
# - "React Beautiful DnD drag drop components"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Portfolio management requires sophisticated UI: 1) Bulk image upload with progress tracking and AI processing status 2) Drag-and-drop organization system for categorizing ceremony vs reception photos 3) AI-powered tagging interface with suggestion and correction capabilities 4) Hero image selection and featured work curation tools 5) Real-time image optimization pipeline with preview generation 6) Gallery display with responsive breakpoints and lazy loading. Must balance powerful organization tools with intuitive user experience for busy wedding professionals.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

### 1. **react-ui-specialist**: Advanced portfolio management and drag-and-drop components
**Mission**: Create sophisticated React components for portfolio management and image organization
```typescript
await Task({
  subagent_type: "react-ui-specialist",
  prompt: `Create advanced portfolio management system for WS-186. Must include:
  
  1. Portfolio Manager Interface:
  - Comprehensive drag-and-drop image organization with visual feedback and category zones
  - Bulk upload interface with progress tracking for 50+ images and AI processing status
  - Image grid with responsive breakpoints and lazy loading for performance
  - Hero image selection with visual prominence indicators and featured work curation
  
  2. AI Tagging Interface:
  - Real-time AI tag suggestions with confidence scores and manual correction capability
  - Category management for ceremony, reception, portraits, details with smart sorting
  - Venue detection and metadata extraction display with EXIF data integration
  - Batch operations for applying tags and categories to multiple selected images
  
  3. Gallery Components:
  - Responsive portfolio gallery with optimized image variants for fast loading
  - Lightbox viewing with full-screen image display and navigation controls
  - Image details editor with caption, alt text, and metadata management
  - Analytics display showing popular images and view statistics
  
  Focus on creating intuitive interface that reduces portfolio management time from hours to minutes.`,
  description: "Portfolio management components"
});
```

### 2. **ui-ux-designer**: Portfolio organization and workflow optimization
**Mission**: Design optimal user experience for portfolio management and image organization
```typescript
await Task({
  subagent_type: "ui-ux-designer",
  prompt: `Design optimal UX for WS-186 portfolio management system. Must include:
  
  1. Upload Workflow Design:
  - Streamlined bulk upload process with clear progress indicators and error handling
  - Intuitive drag-and-drop zones for file selection and category organization
  - Smart defaults and AI suggestions to minimize manual tagging effort
  - Clear visual feedback for upload status and processing completion
  
  2. Organization Interface:
  - Visual portfolio grid with effective thumbnail previews and sorting options
  - Category management with color coding and intuitive drag-and-drop organization
  - Search and filtering capabilities for finding specific images quickly
  - Hero selection and featured work curation with visual prominence indicators
  
  3. Wedding Professional Focus:
  - Mobile-responsive design for photographers managing portfolios on-site
  - Time-saving features like batch operations and smart categorization
  - Clear visual hierarchy emphasizing most important portfolio management actions
  - Workflow optimization reducing portfolio update time and improving organization efficiency
  
  Focus on creating efficient workflow that helps wedding professionals showcase their work effectively.`,
  description: "Portfolio UX design"
});
```

### 3. **performance-optimization-expert**: Image handling and gallery performance optimization
**Mission**: Optimize performance for large image collections and responsive gallery display
```typescript
await Task({
  subagent_type: "performance-optimization-expert",
  prompt: `Optimize performance for WS-186 portfolio management system. Must include:
  
  1. Image Processing Performance:
  - Efficient client-side image compression before upload with quality preservation
  - Progressive image loading with placeholder generation and blur-to-sharp transitions
  - Optimal image variant generation for different viewport sizes and display densities
  - Background processing for AI tagging and metadata extraction without UI blocking
  
  2. Gallery Display Optimization:
  - Virtual scrolling for large portfolio collections with smooth scrolling performance
  - Lazy loading implementation with intersection observer and preloading strategies
  - Memory-efficient image caching with automatic cleanup of off-screen images
  - Responsive image delivery with srcset optimization and format selection
  
  3. Upload Performance:
  - Chunked file upload for large images with resume capability and error recovery
  - Concurrent processing pipeline for multiple images with progress aggregation
  - Optimized drag-and-drop handling with debounced updates and smooth animations
  - Client-side validation and preprocessing to reduce server load and improve response times
  
  Ensure smooth user experience even with portfolios containing hundreds of high-resolution wedding photos.`,
  description: "Portfolio performance optimization"
});
```

### 4. **security-compliance-officer**: Image security and metadata protection
**Mission**: Implement security measures for portfolio images and sensitive wedding metadata
```typescript
await Task({
  subagent_type: "security-compliance-officer",
  prompt: `Implement security for WS-186 portfolio management system. Must include:
  
  1. Image Upload Security:
  - Comprehensive file validation including type checking, size limits, and malware scanning
  - Secure image processing pipeline with sandboxed operations and memory limits
  - Content filtering to prevent inappropriate image uploads and automatic moderation
  - Rate limiting for bulk uploads preventing abuse and resource exhaustion
  
  2. Metadata Protection:
  - EXIF data sanitization removing sensitive location and camera information
  - Secure storage of wedding venue names and couple information with access controls
  - Privacy controls for portfolio visibility and public/private gallery settings
  - Audit logging for all portfolio modifications and access patterns
  
  3. Portfolio Data Security:
  - Access control ensuring suppliers only manage their own portfolio content
  - Secure CDN delivery with signed URLs and hotlink protection
  - Backup and recovery procedures for portfolio images and metadata
  - GDPR compliance for handling couple names and wedding information
  
  Ensure portfolio system protects both supplier intellectual property and client privacy.`,
  description: "Portfolio security implementation"
});
```

### 5. **integration-specialist**: Image processing pipeline and external service integration
**Mission**: Integrate portfolio components with AI services and image optimization infrastructure
```typescript
await Task({
  subagent_type: "integration-specialist",
  prompt: `Implement portfolio integration for WS-186 system workflows. Must include:
  
  1. AI Processing Integration:
  - Integration with computer vision APIs for automatic image categorization and tagging
  - EXIF data extraction pipeline for venue detection and camera metadata processing
  - Image analysis for wedding style detection and aesthetic quality scoring
  - Automated alt text generation for accessibility and SEO optimization
  
  2. Storage and CDN Integration:
  - Seamless integration with cloud storage services for scalable image hosting
  - CDN configuration for global image delivery with edge caching optimization
  - Image transformation pipeline supporting multiple formats and sizes on-demand
  - Backup and redundancy systems ensuring portfolio data protection
  
  3. Platform Integration:
  - Integration with supplier profiles for portfolio display and hero image selection
  - Analytics integration tracking portfolio views and popular image performance
  - Search engine optimization for portfolio galleries with structured data markup
  - Social media integration for easy portfolio sharing and marketing automation
  
  Focus on seamless integration providing automated processing while maintaining user control and customization.`,
  description: "Portfolio integration workflows"
});
```

### 6. **documentation-chronicler**: Portfolio system documentation and user guidance
**Mission**: Create comprehensive documentation for portfolio management system usage
```typescript
await Task({
  subagent_type: "documentation-chronicler",
  prompt: `Create comprehensive documentation for WS-186 portfolio management system. Must include:
  
  1. Wedding Professional Guide:
  - Complete portfolio organization workflow from upload to publication
  - Best practices for wedding photography categorization and tagging strategies
  - Image optimization guidelines for fast loading and professional presentation
  - AI tagging system usage with correction and customization instructions
  
  2. Technical Implementation Guide:
  - Portfolio component architecture and customization options for developers
  - Image processing pipeline documentation with performance optimization guidelines
  - Integration patterns for AI services and external image processing systems
  - Security implementation guidelines for handling sensitive wedding portfolio data
  
  3. User Experience Documentation:
  - Portfolio management workflow screenshots with step-by-step instructions
  - Troubleshooting guide for common upload and organization issues
  - Performance optimization tips for large portfolio collections
  - Mobile usage guidelines for on-site portfolio management and updates
  
  Enable wedding professionals and development teams to effectively use and maintain portfolio systems.`,
  description: "Portfolio documentation"
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log critical operations with user context

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS (MANDATORY)

### NAVIGATION INTEGRATION CHECKLIST
- [ ] Supplier dashboard navigation link for "Portfolio"
- [ ] Directory supplier profile portfolio gallery display
- [ ] Admin navigation access for portfolio moderation
- [ ] Mobile portfolio management navigation support

## 🎯 TEAM A SPECIALIZATION: FRONTEND/UI FOCUS

### SPECIFIC DELIVERABLES FOR WS-186:

#### 1. PortfolioManager.tsx - Main portfolio management interface
```typescript
interface PortfolioManagerProps {
  supplierId: string;
  initialImages: GalleryImage[];
  canEdit: boolean;
  onImagesUpdate: (images: GalleryImage[]) => void;
}

// Key features:
// - Drag-and-drop image organization with visual feedback
// - Bulk upload with progress indicators and AI processing status
// - Category management (ceremony, reception, portraits, details)
// - Hero image selection and featured work curation
```

#### 2. ImageUploader.tsx - Advanced bulk upload component
```typescript
interface ImageUploaderProps {
  onUploadComplete: (images: GalleryImage[]) => void;
  maxFiles: number;
  acceptedFormats: string[];
  enableAITagging: boolean;
}

// Key features:
// - Drag-and-drop file selection with visual feedback
// - Progress tracking for multiple concurrent uploads
// - AI processing status display with real-time updates
// - Error handling and retry mechanisms for failed uploads
```

#### 3. PortfolioGallery.tsx - Responsive portfolio display component
```typescript
interface PortfolioGalleryProps {
  images: GalleryImage[];
  layout: 'grid' | 'masonry' | 'carousel';
  showControls: boolean;
  onImageSelect: (image: GalleryImage) => void;
}

// Key features:
// - Responsive grid layout with optimized image loading
// - Lightbox functionality with full-screen viewing
// - Lazy loading and virtual scrolling for performance
// - Search and filtering capabilities for large collections
```

#### 4. AITaggingInterface.tsx - Smart tagging and categorization
```typescript
interface AITaggingInterfaceProps {
  images: GalleryImage[];
  aiSuggestions: TagSuggestion[];
  onTagsUpdate: (imageId: string, tags: string[]) => void;
  onCategoryUpdate: (imageId: string, category: string) => void;
}

// Key features:
// - AI tag suggestions with confidence scores
// - Batch tagging operations for multiple images
// - Manual tag correction and category override
// - Real-time tag validation and suggestion updates
```

#### 5. FeaturedWorkEditor.tsx - Hero selection and curation interface
```typescript
interface FeaturedWorkEditorProps {
  portfolioImages: GalleryImage[];
  currentFeatured: string[];
  maxFeaturedCount: number;
  onFeaturedUpdate: (imageIds: string[]) => void;
}

// Key features:
// - Visual hero image selection with drag-and-drop prioritization
// - Featured work collection creation and management
// - Preview of how portfolio appears to couples
// - Analytics display showing popular images and engagement metrics
```

## 📋 TECHNICAL SPECIFICATION INTEGRATION

Based on WS-186 technical specification:
- **AI-Powered Organization**: Automated ceremony vs. reception categorization with 85%+ accuracy
- **Bulk Processing**: Handle 50+ images within 2 minutes including AI analysis
- **Responsive Display**: Optimized loading with multiple image variants and sizes
- **Professional Workflow**: Reduce portfolio management time from hours to minutes

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### MUST CREATE:
- [ ] `/src/components/supplier/portfolio/PortfolioManager.tsx` - Main management interface
- [ ] `/src/components/supplier/portfolio/ImageUploader.tsx` - Advanced bulk upload component
- [ ] `/src/components/directory/PortfolioGallery.tsx` - Responsive portfolio display
- [ ] `/src/components/supplier/portfolio/AITaggingInterface.tsx` - Smart tagging system
- [ ] `/src/components/supplier/portfolio/FeaturedWorkEditor.tsx` - Hero selection interface
- [ ] `/src/components/supplier/portfolio/index.ts` - Component exports

### MUST IMPLEMENT:
- [ ] Comprehensive drag-and-drop portfolio organization with visual feedback and category zones
- [ ] Bulk image upload interface with progress tracking and AI processing status display
- [ ] AI-powered tagging system with suggestion, correction, and batch operation capabilities
- [ ] Hero image selection and featured work curation with visual prominence indicators
- [ ] Responsive portfolio gallery with optimized loading and lazy image loading
- [ ] Mobile-responsive design for on-site portfolio management and updates
- [ ] Performance optimization supporting large portfolio collections with smooth scrolling

## 💾 WHERE TO SAVE YOUR WORK
- Components: `$WS_ROOT/wedsync/src/components/supplier/portfolio/`
- Hooks: `$WS_ROOT/wedsync/src/hooks/usePortfolio.ts`
- Types: `$WS_ROOT/wedsync/src/types/portfolio.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/components/supplier/portfolio/`

## 🏁 COMPLETION CHECKLIST
- [ ] Comprehensive portfolio management interface operational with drag-and-drop organization
- [ ] Bulk image upload system functional with progress tracking and AI processing status
- [ ] AI tagging interface implemented with suggestion and batch operation capabilities
- [ ] Hero selection and featured work curation system operational with visual indicators
- [ ] Responsive portfolio gallery validated with optimized loading and mobile compatibility
- [ ] Performance optimization confirmed supporting large image collections smoothly
- [ ] Security measures implemented protecting portfolio images and wedding metadata

**WEDDING CONTEXT REMINDER:** Your portfolio management system helps a wedding photographer quickly organize 500+ photos from a recent wedding - automatically detecting ceremony shots vs. reception moments, extracting venue information from EXIF data, and generating SEO-friendly descriptions - transforming what used to be a 3-hour manual process into a 15-minute organized portfolio that attracts more couples and showcases their work professionally.

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements!**