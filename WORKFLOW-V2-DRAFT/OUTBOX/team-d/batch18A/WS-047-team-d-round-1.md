# TEAM D - ROUND 1: WS-047 - Review Collection System - WedMe Integration & Mobile Experience

**Date:** 2025-01-20  
**Feature ID:** WS-047 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build mobile-optimized review submission experience and WedMe integration for couples  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Emma, a bride who just had her dream wedding photographed by Jake
**I want to:** Easily leave a review for Jake when I'm feeling most grateful (right after receiving photos)
**So that:** I can help Jake get more couples like us while sharing my amazing experience in under 2 minutes on my phone

**Real Wedding Problem This Solves:**
Emma gets a personalized text/email 10 days after her wedding: "Hi Emma! Hope you're still glowing from your beautiful ceremony at Sunset Manor! Jake would love to hear about your experience." She clicks the link on her iPhone, sees her wedding details pre-filled, taps 5 stars, optionally adds a quick note, and submits. The review posts to Google Business and Jake's website automatically.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Mobile-first review submission experience with WedMe integration. Focus on couples' mobile experience since 85% of review submissions happen on mobile devices. This is about making it effortless for happy couples to share their positive experiences.

**Technology Stack (VERIFIED):**
- Mobile: Progressive Web App (PWA) features
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- WedMe Integration: Existing couple portal integration
- Performance: <2s load time on 3G connections
- Testing: Playwright MCP with mobile viewports

**Integration Points:**
- WedMe Portal: Couple authentication and data
- Review Submission: Token-based secure access
- Photo Upload: Optimized mobile image handling
- Social Sharing: Post-review social media sharing

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE FOR MOBILE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
# Use Ref MCP to search for:
# - "Next.js PWA mobile optimization"
# - "React 19 mobile touch interactions"
# - "Tailwind CSS mobile-first responsive"
# - "Progressive Web App offline features"
# - "Mobile image upload optimization"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing mobile patterns:
await mcp__serena__find_symbol("mobile", "", true);
await mcp__serena__get_symbols_overview("src/app/(mobile)");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Mobile review submission experience"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Mobile-first React components"
3. **ui-ux-designer** --think-ultra-hard --follow-existing-patterns "Mobile UX optimization" 
4. **performance-optimization-expert** --mobile-performance --3g-optimization
5. **test-automation-architect** --mobile-testing --touch-interactions
6. **playwright-visual-testing-specialist** --mobile-viewports --accessibility-first
7. **security-compliance-officer** --mobile-security --token-validation

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Mobile Review Submission Page:
- [ ] **ReviewSubmissionPage** - `/src/app/review/[token]/page.tsx`
  - Mobile-optimized layout with touch-friendly controls
  - Token validation and couple data loading
  - Pre-filled wedding details display
  - Star rating with large touch targets
  - Optional text review with character counter
  - Photo upload with compression
  - Platform selection (Google, Facebook, internal)
  - Thank you page with social sharing

### Mobile-Optimized Components:
- [ ] **MobileStarRating** - `/src/components/reviews/mobile/MobileStarRating.tsx`
  - Large touch targets (44px minimum)
  - Haptic feedback on selection
  - Visual feedback with animations
  - Accessibility support

- [ ] **MobilePhotoUpload** - `/src/components/reviews/mobile/MobilePhotoUpload.tsx`
  - Drag & drop for mobile
  - Camera integration
  - Image compression before upload
  - Preview thumbnails
  - Progress indicators

- [ ] **MobileReviewForm** - `/src/components/reviews/mobile/MobileReviewForm.tsx`
  - Single-screen flow
  - Auto-save draft functionality
  - Keyboard optimization
  - Form validation with clear error states

### WedMe Integration:
- [ ] **WedMeReviewWidget** - `/src/components/reviews/wedme/ReviewWidget.tsx`
  - Embedded review prompt in WedMe dashboard
  - Direct link to review submission
  - Review status tracking
  - Review showcase for completed reviews

### Performance Optimization:
- [ ] **PWA Manifest Updates** - Add review submission to offline capabilities
- [ ] **Image Optimization** - Mobile-specific image handling
- [ ] **Lazy Loading** - Progressive content loading
- [ ] **Caching Strategy** - Review form data caching

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Review token validation API - Required for secure access
- FROM Team B: Review submission API - For form data posting
- FROM Team C: Platform integration status - For platform selection UI

### What other teams NEED from you:
- TO Team A: Mobile UI patterns - For responsive design consistency
- TO Team B: Mobile form validation requirements - For API validation
- TO Team E: Mobile test scenarios - For E2E mobile testing
- TO All Teams: Mobile component exports and patterns

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MOBILE SECURITY IMPLEMENTATION

```typescript
// ✅ SECURE TOKEN VALIDATION (MANDATORY):
import { validateReviewToken } from '@/lib/security/token-validation';

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const tokenValidation = await validateReviewToken(params.token);
  
  if (!tokenValidation.valid) {
    return (
      <div className="mobile-error-page">
        <h1>Review Link Expired</h1>
        <p>This review link is no longer valid. Please contact your wedding supplier for a new link.</p>
      </div>
    );
  }
  
  if (tokenValidation.expires_at < new Date()) {
    return <ExpiredTokenPage />;
  }
  
  return <MobileReviewForm tokenData={tokenValidation} />;
}

// ✅ MOBILE IMAGE UPLOAD SECURITY:
export async function handleMobileImageUpload(file: File): Promise<string> {
  // Validate file type and size
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > 2 * 1024 * 1024) { // 2MB limit
    throw new Error('File too large');
  }
  
  // Compress image for mobile
  const compressedFile = await compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8
  });
  
  // Upload to secure storage
  return await uploadToSecureStorage(compressedFile);
}
```

### MOBILE SECURITY CHECKLIST:
- [ ] Review tokens expire after 30 days
- [ ] Token validation on every page load
- [ ] Image uploads validated and compressed
- [ ] No sensitive data stored in localStorage
- [ ] HTTPS enforcement for all mobile traffic
- [ ] CSP headers optimized for mobile
- [ ] Touch interaction logging for security

---

## 📱 MOBILE PERFORMANCE REQUIREMENTS

### Critical Performance Targets:
- [ ] **First Contentful Paint**: <1.5s on 3G
- [ ] **Largest Contentful Paint**: <2.5s on 3G  
- [ ] **Cumulative Layout Shift**: <0.1
- [ ] **Time to Interactive**: <3s on 3G
- [ ] **Image Upload**: <5s for 2MB image with compression

### Mobile Optimization Strategies:
```typescript
// ✅ MOBILE-FIRST COMPONENT LOADING:
import { lazy, Suspense } from 'react';
import { MobileLoadingSpinner } from '@/components/ui/mobile';

const MobilePhotoUpload = lazy(() => import('./MobilePhotoUpload'));

export function ReviewForm() {
  return (
    <div className="mobile-review-form">
      <MobileStarRating />
      <Suspense fallback={<MobileLoadingSpinner />}>
        <MobilePhotoUpload />
      </Suspense>
    </div>
  );
}

// ✅ MOBILE IMAGE COMPRESSION:
export async function compressImageForMobile(file: File): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  
  return new Promise((resolve) => {
    img.onload = () => {
      // Calculate optimal size for mobile
      const maxWidth = window.innerWidth > 768 ? 1200 : 800;
      const maxHeight = window.innerHeight > 1024 ? 1200 : 800;
      
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
}
```

---

## 🎭 MOBILE TESTING WITH PLAYWRIGHT MCP (MANDATORY)

```javascript
// 1. MOBILE VIEWPORT TESTING
test('Mobile review submission flow', async () => {
  // Test on actual mobile viewports
  await mcp__playwright__browser_resize({width: 375, height: 667}); // iPhone SE
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/review/test-token-123'});
  
  const accessibilityStructure = await mcp__playwright__browser_snapshot();
  
  // Test touch interactions
  await mcp__playwright__browser_click({
    element: '5 star rating', 
    ref: 'button[data-rating="5"]'
  });
  
  // Test photo upload on mobile
  await mcp__playwright__browser_file_upload({
    paths: ['/path/to/test-wedding-photo.jpg']
  });
  
  // Test form submission
  await mcp__playwright__browser_type({
    element: 'review text',
    ref: 'textarea[name="reviewText"]',
    text: 'Amazing wedding photographer! Made our day perfect.'
  });
  
  await mcp__playwright__browser_click({
    element: 'submit review',
    ref: 'button[type="submit"]'
  });
});

// 2. RESPONSIVE DESIGN TESTING
test('Multi-viewport responsive validation', async () => {
  const viewports = [
    {width: 375, height: 667, name: 'iPhone SE'},
    {width: 390, height: 844, name: 'iPhone 12'},
    {width: 768, height: 1024, name: 'iPad'},
  ];
  
  for (const viewport of viewports) {
    await mcp__playwright__browser_resize({width: viewport.width, height: viewport.height});
    await mcp__playwright__browser_take_screenshot({
      filename: `review-form-${viewport.name.toLowerCase()}.png`
    });
    
    // Verify touch targets are adequate (44px minimum)
    const starButtons = await page.locator('button[data-rating]');
    for (const button of await starButtons.all()) {
      const box = await button.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  }
});

// 3. PERFORMANCE TESTING
test('Mobile performance validation', async () => {
  // Simulate 3G connection
  await page.route('**/*', route => {
    return route.continue({
      // Add delay to simulate 3G
      delay: Math.random() * 100 + 50
    });
  });
  
  const startTime = Date.now();
  await mcp__playwright__browser_navigate({url: '/review/test-token'});
  
  // Wait for First Contentful Paint
  await page.waitForSelector('h1');
  const fcpTime = Date.now() - startTime;
  expect(fcpTime).toBeLessThan(1500); // <1.5s FCP target
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Mobile Experience:
- [ ] Review submission works flawlessly on mobile devices
- [ ] Touch targets meet accessibility guidelines (44px minimum)
- [ ] Form loads in <2s on 3G connection
- [ ] Image upload with compression works on mobile
- [ ] Star rating has haptic feedback (where supported)
- [ ] Keyboard behavior optimized for mobile inputs

### WedMe Integration:
- [ ] Review widget integrates seamlessly into WedMe dashboard
- [ ] Couple authentication flows correctly
- [ ] Review status tracking functional
- [ ] Social sharing works from thank you page

### Evidence Package Required:
- [ ] Screenshots from multiple mobile devices
- [ ] Performance test results on 3G simulation
- [ ] Touch interaction test results
- [ ] Accessibility audit report (WCAG 2.1 AA)
- [ ] Image upload compression test results

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Mobile Pages: `/wedsync/src/app/review/[token]/`
- Mobile Components: `/wedsync/src/components/reviews/mobile/`
- WedMe Integration: `/wedsync/src/components/reviews/wedme/`
- Mobile Tests: `/wedsync/tests/mobile/reviews/`
- PWA Updates: `/wedsync/public/manifest.json`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch18A/WS-047-team-d-round-1-complete.md`

---

**END OF ROUND PROMPT - EXECUTE IMMEDIATELY**